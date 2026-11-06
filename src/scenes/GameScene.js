import Phaser from 'phaser';
import { BALANCE, POI_TYPES, START_STATION } from '../config/balance.js';
import { DEBUG } from '../config/debug.js';
import { AREAS, COLORS, DEPTH, RAIL_Y, PARALLAX_LAYERS, TUNNEL, PX_PER_METRE, TRAIN_LAYOUT, WORLD_HEIGHT } from '../config/display.js';
import { Train } from '../objects/Train.js';
import { createJunction, createStop, createTunnel } from '../objects/worldObjects.js';
import { createVisit, eventVisit, strandedVisit } from '../poi/poiActions.js';
import { TrainState } from '../state/TrainState.js';
import { AudioManager } from '../systems/AudioManager.js';
import { ParallaxBackground } from '../systems/ParallaxBackground.js';
import { Weather } from '../systems/Weather.js';
import { Ambience } from '../systems/Ambience.js';
import { Objectives } from '../systems/Objectives.js';
import { applySave, clearSave, saveRun } from '../state/save.js';
import { VISITOR_CHANCE } from '../content/dialogue.js';
import { areaLoaded, loadLaterImages } from '../systems/BackgroundLoader.js';
import { RouteManager } from '../systems/RouteManager.js';
import { TrainMotion } from '../systems/TrainMotion.js';
import { computeLayout, cssSize, uiScale } from '../systems/Viewport.js';
import { WorldLayer } from '../systems/WorldLayer.js';

/**
 * The run: the world, the train, and the rules. UI lives in UIScene (this.ui).
 *
 * Phases:
 *   'waiting'  sitting at the start station before the first departure
 *   'running'  moving along the line (includes braking into a POI and coasting without fuel)
 *   'stopped'  halted at a POI with its menu open
 *   'over'     run finished; handing off to GameOver
 */
/** Line-event props that lie flat on the ground (drawn on the near bank, not behind the train). */
const FLAT_EVENT_PROPS = new Set(['fallen-tree', 'hot-spring', 'oasis', 'mail-sack']);
/**
 * Props with people in them, drawn at a person's height on the near bank (a person is about half
 * the engine's height): { height: of the whole prop in design px, maxW }.
 */
const PEOPLE_EVENT_PROPS = { 'stranded-family': { height: 115, maxW: 420 }, pedlar: { height: 125, maxW: 260 } };

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  /** @param {{ resume?: object }} data  resume: a saved run (state/save.js) to carry on */
  create(data = {}) {
    const resume = data.resume ?? null;
    this.phase = 'waiting';
    // Areas: the line runs through AREAS in turn, with a tunnel between each.
    this.areaIndex = 0;
    this.leg = 0; // areas passed through this run (keeps counting when the line loops round)
    this.tunnel = null; // { at, parts, swapped }
    this.signpostsShown = false;
    this.chuffDistancePx = 0;
    this.wasBraking = false;

    this.state = new TrainState(BALANCE);
    this.motion = new TrainMotion(BALANCE.train);
    this.route = new RouteManager(BALANCE, POI_TYPES, Math.random, AREAS.length);
    this.audio = new AudioManager(this);

    this.parallax = new ParallaxBackground(this, PARALLAX_LAYERS);
    this.world = new WorldLayer();
    this.train = new Train(this);
    this.objectives = new Objectives({ state: this.state, scene: this });
    this.weather = new Weather(this);
    this.ambience = new Ambience(this);
    if (resume) applySave(this, resume);

    if (resume) {
      // Back at the stop the run was saved at (its area's art may still be downloading).
      this.phase = 'loading';
      this.world.update(this.state.distance);
      const arrive = () => {
        this.parallax.setArea(this.area);
        this.weather.setArea(this.area);
        this.ambience.setArea(this.area);
        this.addStopToWorld(this.route.poi);
        this.world.update(this.state.distance);
        this.phase = 'stopped';
        // (Next frame, once the UI scene has laid itself out.)
        this.time.delayedCall(30, () => {
          const visit = createVisit(this.route.poi, { leg: this.leg, next: this.nextAreaInfo() });
          visit.onLivery = (id) => this.train.setLivery(id);
          this.ui.openPanel({ state: this.state, visit });
        });
      };
      if (areaLoaded(this, this.area)) {
        arrive();
        this.time.delayedCall(3000, () => loadLaterImages(this));
      } else {
        this.load.once('complete', arrive);
        loadLaterImages(this);
      }
    } else {
      this.weather.setArea(this.area);
      this.ambience.setArea(this.area);
      // Whatever the title screen didn't finish (after a moment, so files it still has on the
      // way aren't asked for twice).
      this.time.delayedCall(3000, () => loadLaterImages(this));

      // The station we start from, centred behind the train.
      this.world.add(
        0,
        createStop(this, {
          buildingKey: START_STATION.building,
          platform: START_STATION.platform,
          title: START_STATION.name,
          subtitle: 'Departures',
        }),
        { offsetX: -this.train.length / 2 },
      );
    }

    // UI runs as its own scene on top of this one.
    this.scene.launch('UI', { main: this });
    this.ui = this.scene.get('UI');
    this.events.once('shutdown', () => this.scene.stop('UI'));

    this.fitCamera();
    const onResize = () => this.fitCamera();
    this.scale.on('resize', onResize);
    this.events.once('shutdown', () => this.scale.off('resize', onResize));

    const kb = this.input.keyboard;
    kb?.on('keydown-ONE', () => this.selectBranch(0));
    kb?.on('keydown-TWO', () => this.selectBranch(1));
    kb?.on('keydown-SPACE', () => this.tryDepart());
    kb?.on('keydown-ENTER', () => this.tryDepart());
    kb?.on('keydown-G', () => this.ui.god?.toggle());
    kb?.on('keydown-BACKTICK', () => this.ui.god?.toggle());

    this.audio.startMusic();
    this.cameras.main.fadeIn(500, 21, 17, 13);
    if (!resume) {
      this.time.delayedCall(START_STATION.departDelayMs, () => this.depart());
      this.time.delayedCall(600, () => this.ui.say('runStart'));
    }
  }

  /**
   * Zooms and positions the camera for the area the layout gives the world: the locomotive's
   * nose sits at L.frontX, and at least TRAIN_LAYOUT.cameraFocus of the train fits behind it
   * (a long train's last car may run off the left edge on narrow screens).
   */
  fitCamera() {
    const u = uiScale(this);
    const { w, h } = cssSize(this);
    const L = computeLayout(w, h).world;
    const cam = this.cameras.main;
    cam.setViewport(L.x * u, L.y * u, L.w * u, L.h * u);
    cam.setBackgroundColor(COLORS.panel);

    // Zoom in CSS px per design px.
    let zoom = L.focusW / Math.min(this.train.length, TRAIN_LAYOUT.cameraFocus);
    if (L.fitHeight) zoom = Math.min(L.h / WORLD_HEIGHT, zoom);
    cam.setZoom(zoom * u);

    const viewW = L.w / zoom;
    const viewH = L.h / zoom;
    const left = this.train.frontX - L.frontX / zoom;
    cam.centerOn(left + viewW / 2, WORLD_HEIGHT - viewH / 2);
  }

  update(time, deltaMs) {
    if (this.phase === 'over') return;
    const dt = (Math.min(deltaMs, 50) / 1000) * DEBUG.timeScale;
    const { state, motion, route } = this;

    let metres = 0;
    if (this.phase === 'running') {
      // A breakdown brings the train to a halt a little way on (as well as any planned stop).
      const stops = [route.stopIn(state.distance), this.breakdown ? this.breakdown.stopAt - state.distance : null].filter((v) => v != null);
      metres = motion.step(dt, {
        maxSpeed: BALANCE.train.maxSpeed * state.speedFactor,
        powered: !state.isOutOfFuel,
        stopIn: stops.length ? Math.min(...stops) : null,
      });
      this.updateBreakdown(dt, metres);
    }

    const underSteam = this.phase === 'running' && !state.isOutOfFuel && motion.speed > 0.01;
    const conditionBefore = state.condition;
    for (const event of state.update(dt, motion.speed, metres, underSteam)) this.onStateEvent(event);
    if (DEBUG.god && DEBUG.noWear) state.condition = Math.max(state.condition, conditionBefore);
    if (DEBUG.god && DEBUG.unlimited) {
      state.fuel = state.fuelCapacity;
      state.water = state.waterCapacity;
      state.heat = Math.min(state.heat, 40);
      state.overheated = false;
    }

    const px = metres * PX_PER_METRE;
    this.parallax.scroll(px, dt);
    this.weather.update(px);
    this.world.update(state.distance);
    this.train.update(motion.speed, px, time, state, BALANCE.train.maxSpeed);
    this.playMotionSounds(px);
    this.updateForegroundTrees();
    this.updateObjectives(time);

    if (this.phase === 'running') {
      this.updateTunnel();
      this.updateJunction();
      this.checkArrival();
      this.checkStranded();
    }
  }

  // --- Departing -----------------------------------------------------------------------------

  tryDepart() {
    if (this.phase === 'stopped' && !this.state.isOutOfFuel) this.depart();
  }

  depart() {
    if (this.phase === 'over' || this.state.isOutOfFuel) return;
    // Halted part-way along (stranded, or a line event): just carry on along the same leg.
    const resume = this.ui.panelArgs?.visit?.resume;
    this.ui.closePanel();
    this.phase = 'running';
    this.motion.resetThrottle();
    if (resume) {
      this.audio.play('whistle');
      return;
    }
    this.planScenery();
    // Stops past a tunnel are in the next area.
    const areaAhead = this.tunnel && !this.tunnel.swapped ? AREAS[this.tunnel.to] : this.area;
    const junction = this.route.planJunction(this.state.distance, areaAhead, this.state);
    if (this.route.event) this.addEventProp(this.route.event);
    this.world.add(junction.at, createJunction(this));
    this.audio.play('whistle');
  }

  // --- Areas and tunnels -----------------------------------------------------------------------

  get area() {
    return AREAS[this.areaIndex];
  }

  /**
   * After leaving a stop: if the route map's next stops are in another area, the line tunnels
   * through a mountain into it.
   */
  planScenery() {
    const d = this.state.distance;
    const to = this.route.map.nextArea();
    if (this.tunnel || to === this.areaIndex || AREAS.length < 2) return;
    if (!areaLoaded(this, AREAS[to])) return; // still downloading (tunnel at the next stop instead)
    const at = d + BALANCE.route.tunnelAfterDepart;
    const parts = createTunnel(this);
    this.world.add(at, parts.back, { cullMargin: 2400 });
    this.world.add(at, parts.front, { cullMargin: 2400 });
    this.world.add(at, parts.bank, { cullMargin: 4000 });
    const peakMid = at + (parts.enterX + parts.exitX) / 2 / PX_PER_METRE;
    // The scenery changes along a boundary hidden behind the peak (and, for the layers in front
    // of it, behind the rocks), so it's meadow before the mountain and desert after.
    const split = this.parallax.beginSplit(AREAS[to], ['ground', 'railgrass', 'fog-front', 'foreground-back', 'foreground', 'foreground-trees']);
    this.tunnel = { at, parts, swapped: false, split, peakMid, to };
  }

  /**
   * Once the whole train is inside the mountain, crossfade the scenery to the next area; it
   * comes out of the far tunnel mouth into it.
   */
  updateTunnel() {
    const t = this.tunnel;
    if (!t) return;
    const inside = (this.state.distance - t.at) * PX_PER_METRE - t.parts.enterX;
    if (!t.swapped && inside > this.train.length + 10) {
      t.swapped = true;
      this.areaIndex = t.to;
      this.leg++;
      // Stops planned before the tunnel take the new area's buildings.
      const j = this.route.junction;
      if (j && !j.resolved) {
        this.route.restyleJunction(this.area);
        if (this.signpostsShown) this.ui.showJunction(j);
      }
      this.ui.toast(`Entering ${this.area.name}`);
      this.time.delayedCall(2500, () => this.ui.say('newArea'));
      this.weather.setArea(this.area);
      this.ambience.setArea(this.area);
    }
    if (t.split) {
      const d = this.state.distance;
      const backX = this.train.frontX + (t.peakMid - d) * PX_PER_METRE;
      // The rock bank covers the ground and foreground there, so both switch at the peak.
      this.parallax.setSplit(backX, backX);
      const frontX = backX;
      const left = this.cameras.main.worldView.x - 50;
      if (backX < left && frontX < left) {
        this.parallax.endSplit();
        t.split = false;
      }
    }
    // Forget it once it has scrolled away (WorldLayer destroys the objects).
    if (t.swapped && !t.split && !t.parts.front.active && !t.parts.bank.active) this.tunnel = null;
  }

  /**
   * Big trees that sweep past in front of the train (where an area has them) step aside near
   * stops and signposts, so they never hide a building, and through tunnels, where they would
   * show the scenery switching above the rock bank.
   */
  updateForegroundTrees() {
    const d = this.state.distance;
    const poi = this.route.poi;
    if (poi) this.lastStopAt = poi.at;
    const j = this.route.junction;
    const near = (at, ahead, behind) => at != null && at - d < ahead && d - at < behind;
    const hide = !!this.tunnel?.split || near(this.lastStopAt, 170, 150) || near(j?.at, 110, 60);
    if (hide === this.treesHidden) return;
    this.treesHidden = hide;
    this.parallax.fadeLayer('foreground-trees', hide ? 0 : 1, hide ? 500 : 800);
  }

  /** God mode: head into the next area (a tunnel just ahead, or straight after the next stop). */
  godNextArea() {
    const poi = this.route.poi;
    const stopSoon = poi && !poi.visited; // its building is already drawn in this area's style
    if (this.phase !== 'running' || this.tunnel || stopSoon) {
      if (!this.tunnel) this.route.map.replanAreas(this.route.map.current.col + 1, (this.areaIndex + 1) % AREAS.length);
      this.ui.toast('Tunnel after the next stop');
      return;
    }
    if (!areaLoaded(this, AREAS[(this.areaIndex + 1) % AREAS.length])) {
      this.ui.toast('The next area is still downloading; tunnel soon');
      return;
    }
    // The route map's next stops move into the next area, and the tunnel comes right away.
    const map = this.route.map;
    map.replanAreas(map.current.col + 1, (this.areaIndex + 1) % AREAS.length);
    const before = BALANCE.route.tunnelAfterDepart;
    BALANCE.route.tunnelAfterDepart = 160;
    this.planScenery();
    BALANCE.route.tunnelAfterDepart = before;
    this.ui.toast('Tunnel ahead');
  }

  range([min, max]) {
    return min + Math.random() * (max - min);
  }

  // --- Junctions -----------------------------------------------------------------------------

  updateJunction() {
    const j = this.route.junction;
    if (!j || j.resolved) return;
    const ahead = j.at - this.state.distance;

    if (!this.signpostsShown && ahead <= BALANCE.route.signpostRevealDistance) {
      this.signpostsShown = true;
      this.ui.showJunction(j);
      this.audio.play('click');
    }

    if (ahead <= 0) {
      const poi = this.route.resolveJunction();
      const def = POI_TYPES[poi.type];
      this.signpostsShown = false;
      this.ui.hideJunction();
      this.audio.play('switch');
      this.ui.toast(`Points set for ${def.name}`);
      this.addStopToWorld(poi);
    }
  }

  /**
   * Puts a line event's prop by the line where the train halts, where it can be seen with the
   * event's menu open (that covers the line ahead of the engine): low, flat things (a log, a
   * pool, a snow mound) lie on the near bank in front of the wheels; anything taller stands
   * behind the low cargo wagon, big enough to show over it, like a stop's building.
   */
  addEventProp(ev) {
    const key = ev.def.prop ?? `event-${ev.def.id}`;
    if (!this.textures.exists(key)) return;
    const cars = TRAIN_LAYOUT.cars;
    const widthOf = (k) => cars.find((c) => c.key === k)?.width ?? 0;
    const flat = FLAT_EVENT_PROPS.has(ev.def.id);
    const people = this.textures.get(key).getSourceImage().width > 400 ? PEOPLE_EVENT_PROPS[ev.def.id] : null;
    const img = this.add.image(0, flat || people ? RAIL_Y + (people ? 96 : 82) : RAIL_Y + 14, key).setOrigin(0.5, 1);
    if (people) {
      img.setScale(Math.min(people.height / img.height, people.maxW / img.width)).setDepth(DEPTH.rods + 0.5);
      this.world.add(ev.at, img, { offsetX: -widthOf('locomotive') * 0.5 });
    } else if (flat) {
      img.setScale(Math.min(1.3, 62 / img.height, 230 / img.width)).setDepth(DEPTH.rods + 0.5);
      this.world.add(ev.at, img, { offsetX: -widthOf('locomotive') * 0.55 });
    } else {
      img.setScale(Math.min(1.6, 175 / img.height, 330 / img.width)).setDepth(DEPTH.buildings);
      this.world.add(ev.at, img, { offsetX: -(widthOf('locomotive') + widthOf('tender') + widthOf('wagon') * 0.5) });
    }
    ev.prop = img;
    this.addEventEffect(ev, img);
  }

  /**
   * A little life around an event's prop (the `effect` named in content/events.js): steam,
   * glowing motes, drifting sparks or blowing sand. Made with generated dots, so no art needed.
   */
  addEventEffect(ev, img) {
    const effect = ev.def.effect;
    if (!effect) return;
    if (!this.textures.exists('fx-dot')) {
      const g = this.make.graphics({}, false);
      g.fillStyle(0xffffff, 1).fillCircle(8, 8, 8);
      g.generateTexture('fx-dot', 16, 16);
      g.destroy();
    }
    const top = img.y - img.displayHeight;
    const w = img.displayWidth;
    const configs = {
      steam: { y: top + 10, x: { min: -w * 0.35, max: w * 0.35 }, speedY: { min: -40, max: -20 }, speedX: { min: -8, max: 8 }, scale: { start: 1.6, end: 5 }, alpha: { start: 0.6, end: 0 }, tint: 0xf4f1ec, lifespan: 2800, frequency: 90 },
      glow: { y: top + img.displayHeight * 0.4, x: { min: -w * 0.5, max: w * 0.5 }, speedY: { min: -18, max: -6 }, speedX: { min: -10, max: 10 }, scale: { start: 0.75, end: 0.25 }, alpha: { start: 1, end: 0 }, tint: [0x9ff3ff, 0x7fe8d0, 0xe8fffa], lifespan: 2600, frequency: 110 },
      sparks: { y: top + 8, x: { min: -12, max: 12 }, speedY: { min: -70, max: -35 }, speedX: { min: -25, max: 25 }, gravityY: 40, scale: { start: 0.45, end: 0.1 }, alpha: { start: 1, end: 0 }, tint: [0xffc04a, 0xff7a2a], lifespan: 1400, frequency: 90 },
      sand: { y: { min: RAIL_Y - 220, max: RAIL_Y + 30 }, x: { min: 200, max: 700 }, speedX: { min: -420, max: -260 }, speedY: { min: -20, max: 25 }, scale: { min: 0.5, max: 1.6 }, alpha: { start: 0.75, end: 0 }, tint: [0xc98a45, 0xe0a865, 0xa9672d], lifespan: 1800, frequency: 12, quantity: 3 },
    };
    const cfg = configs[effect];
    if (!cfg) return;
    const fx = this.add.particles(0, 0, 'fx-dot', cfg).setDepth(effect === 'sand' ? DEPTH.foreground + 2 : img.depth + 0.01);
    // Rides along with the prop (WorldLayer moves it), and goes when the prop does.
    const offset = (this.world.items.find((i) => i.obj === img)?.offsetX ?? 0);
    this.world.add(ev.at, fx, { offsetX: offset });
    img.once('destroy', () => fx.destroy());
  }

  /** Builds a stop's building (and platform) on the line at its spot. */
  addStopToWorld(poi) {
    const def = POI_TYPES[poi.type];
    this.world.add(
      poi.at,
      createStop(this, {
        buildingKey: poi.building,
        platform: def.platform && this.area.platform,
        title: def.name,
        subtitle: poi.name,
      }),
      { offsetX: -this.train.length / 2 },
    );
  }

  selectBranch(index) {
    const j = this.route.junction;
    if (this.phase !== 'running' || !j || j.resolved || !this.signpostsShown) return;
    if (j.selected !== index) this.audio.play('switch');
    this.route.select(index);
    this.ui.setJunctionSelected(index);
  }

  // --- Stopping at POIs ----------------------------------------------------------------------

  checkArrival() {
    // An event on the line comes first.
    const ev = this.route.event;
    const poiFirst = this.route.poi && !this.route.poi.visited && ev && this.route.poi.at < ev.at;
    if (ev && !ev.visited && !poiFirst) {
      const ahead = ev.at - this.state.distance;
      if (!ev.warned && ahead < 320) {
        ev.warned = true;
        this.ui.toast('Something on the line ahead…');
      }
      if (ahead <= 0.01 && this.motion.speed === 0) {
        ev.visited = true;
        this.phase = 'stopped';
        this.audio.play('brake');
        this.ui.openPanel({ state: this.state, visit: eventVisit(ev.def, { area: this.area, next: this.nextAreaInfo() }) });
      }
      return;
    }
    const poi = this.route.poi;
    if (!poi || poi.visited) return;
    if (this.state.distance >= poi.at - 0.01 && this.motion.speed === 0) {
      poi.visited = true;
      this.phase = 'stopped';
      this.state.stats.stops++;
      const byType = this.state.stats.stopsByType;
      byType[poi.type] = (byType[poi.type] ?? 0) + 1;
      const where = { leg: this.leg, next: this.nextAreaInfo() };
      const visit = createVisit(poi, where);
      visit.onLivery = (id) => this.train.setLivery(id);
      this.ui.openPanel({ state: this.state, visit });
      saveRun(this);
      // Now and then, someone's waiting on the platform.
      for (const [who, chance] of Object.entries(VISITOR_CHANCE)) {
        if (Math.random() < chance) {
          this.time.delayedCall(700, () => this.ui.say(who, { force: true }));
          break;
        }
      }
    }
  }

  /** Checks objectives a few times a second and celebrates any that are done. */
  updateObjectives(time) {
    if (time < (this.nextObjectiveCheck ?? 0)) return;
    this.nextObjectiveCheck = time + 300;
    for (const o of this.objectives.update()) {
      this.audio.play('coins');
      if (this.textures.exists('objective-complete')) this.ui.showRibbon(`${o.text}   +£${o.reward}`);
      else this.ui.toast(`Objective complete: ${o.text}  (+£${o.reward})`, COLORS.good);
      this.ui.say('objective');
    }
  }

  /** The next area the line runs to, for passengers booked through: { leg, name }. */
  nextAreaInfo() {
    if (AREAS.length < 2) return null;
    return { leg: this.leg + 1, name: AREAS[(this.areaIndex + 1) % AREAS.length].name };
  }

  // --- Breakdowns -----------------------------------------------------------------------------

  /**
   * A worn train (see condition.breakdownBelow in balance.js) may break down: it brakes to a
   * halt, the crew patch it up for a few seconds, and it sets off again a little less worn.
   * Never in a tunnel or just before a stop, where it would look odd or spoil the stop.
   */
  startBreakdown() {
    const v = this.motion.speed;
    const brakeDist = (v * v) / (2 * BALANCE.train.brakeDeceleration);
    this.breakdown = {
      stopAt: this.state.distance + Math.max(brakeDist * 1.4, 20),
      repairLeft: BALANCE.condition.breakdownRepairSeconds,
    };
    this.state.brokenDown = true;
    this.audio.play('warning');
    this.ui.toast('Something’s gone bang! Pulling up…', COLORS.bad);
    this.ui.say('breakdown', { force: true });
    this.startSteamLeak();
  }

  /** Steam hissing from the engine while it's broken down (steam-leak-0..3). */
  startSteamLeak() {
    if (!this.textures.exists('steam-leak-0')) return;
    if (!this.anims.exists('steam-leak')) {
      this.anims.create({ key: 'steam-leak', frames: [0, 1, 2, 3].map((i) => ({ key: `steam-leak-${i}` })), frameRate: 7, repeat: -1 });
    }
    const loco = this.train.cars[this.train.cars.length - 1];
    this.steamLeak?.destroy();
    this.steamLeak = this.add
      .sprite(loco.x + loco.cfg.width * 0.5, loco.top + loco.cfg.height * 0.42, 'steam-leak-0')
      .setOrigin(0.5, 0.9)
      .setScale(1.7)
      .setDepth(DEPTH.smoke)
      .play('steam-leak');
  }

  updateBreakdown(dt, metres) {
    const { state, motion } = this;
    const c = BALANCE.condition;
    const b = this.breakdown;
    if (!b) {
      const stopIn = this.route.stopIn(state.distance);
      const clear = !this.tunnel && (stopIn == null || stopIn > 300);
      if (clear && !state.isOutOfFuel && !DEBUG.noBreakdowns && state.rollBreakdown(metres)) this.startBreakdown();
      return;
    }
    if (motion.speed > 0 || state.distance < b.stopAt - 0.5) return;
    if (b.repairLeft === c.breakdownRepairSeconds) this.audio.play('brake');
    b.repairLeft -= dt;
    if (b.repairLeft > 0) return;
    this.breakdown = null;
    state.brokenDown = false;
    state.repair(c.breakdownPatch);
    motion.resetThrottle();
    this.ui.toast('Patched up. A Workshop would do a proper job.', COLORS.good);
    this.steamLeak?.destroy();
    this.steamLeak = null;
  }

  // --- Running out of fuel -------------------------------------------------------------------

  checkStranded() {
    // (checkArrival runs first, so coasting to a halt exactly at a POI still opens its menu.)
    if (this.phase === 'running' && this.state.isOutOfFuel && this.motion.speed === 0) {
      // Not the end: the stranded panel offers a relief engine (or ending the run).
      this.phase = 'stopped';
      this.ui.openPanel({ state: this.state, visit: strandedVisit() });
      this.ui.say('stranded', { force: true });
    }
  }

  endRun(reason) {
    if (this.phase === 'over') return;
    clearSave();
    this.phase = 'over';
    this.ui.closePanel();
    this.ui.hideJunction();
    const result = { distance: this.state.distance, reason, stats: { ...this.state.stats, objectives: this.objectives.completed } };
    this.time.delayedCall(900, () => {
      const fade = () => {
        this.cameras.main.fadeOut(600, 21, 17, 13);
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('GameOver', result));
      };
      // A picture of where the run ended, shown dimmed behind the results.
      try {
        this.game.renderer.snapshot((image) => {
          if (this.textures.exists('run-end')) this.textures.remove('run-end');
          if (image instanceof HTMLImageElement) this.textures.addImage('run-end', image);
          fade();
        });
      } catch {
        fade();
      }
    });
  }

  // --- Feedback ------------------------------------------------------------------------------

  onStateEvent(event) {
    switch (event) {
      case 'lowFuel':
        this.ui.say('lowFuel');
        this.audio.play('warning');
        this.ui.toast('Fuel running low: find a Coal Depot!', COLORS.bad);
        break;
      case 'outOfFuel':
        this.audio.play('warning');
        this.ui.toast('The fire’s gone out… coasting', COLORS.bad);
        break;
      case 'overheated':
        this.ui.say('overheated');
        this.audio.play('brake');
        this.ui.toast('Boiler overheated! Easing off', COLORS.bad);
        break;
      case 'cooledDown':
        this.ui.toast('Boiler back to safe pressure', COLORS.good);
        break;
    }
  }

  playMotionSounds(px) {
    // A chuff every quarter-turn of the driving wheels, but only under steam.
    if (!this.state.isOutOfFuel && this.phase === 'running') {
      this.chuffDistancePx += px;
      const quarterTurn = (Math.PI * 2 * 20) / 4;
      if (this.chuffDistancePx >= quarterTurn) {
        this.chuffDistancePx %= quarterTurn;
        this.audio.play('chuff', { rate: Phaser.Math.FloatBetween(0.9, 1.1) });
      }
    }
    if (this.motion.braking && !this.wasBraking) this.audio.play('brake');
    this.wasBraking = this.motion.braking;
  }
}
