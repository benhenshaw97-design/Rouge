import Phaser from 'phaser';
import { BALANCE, POI_TYPES, START_STATION } from '../config/balance.js';
import { DEBUG } from '../config/debug.js';
import { AREAS, COLORS, DEPTH, PARALLAX_LAYERS, TUNNEL, PX_PER_METRE, TRAIN_LAYOUT, WORLD_HEIGHT } from '../config/display.js';
import { Train } from '../objects/Train.js';
import { createJunction, createStop, createTunnel } from '../objects/worldObjects.js';
import { createVisit } from '../poi/poiActions.js';
import { TrainState } from '../state/TrainState.js';
import { AudioManager } from '../systems/AudioManager.js';
import { ParallaxBackground } from '../systems/ParallaxBackground.js';
import { Weather } from '../systems/Weather.js';
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
export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    this.phase = 'waiting';
    // Areas: the line runs through AREAS in turn, with a tunnel between each.
    this.areaIndex = 0;
    this.nextAreaAt = this.range(BALANCE.route.areaLength);
    this.tunnel = null; // { at, parts, swapped }
    this.signpostsShown = false;
    this.chuffDistancePx = 0;
    this.wasBraking = false;

    this.state = new TrainState(BALANCE);
    this.motion = new TrainMotion(BALANCE.train);
    this.route = new RouteManager(BALANCE, POI_TYPES);
    this.audio = new AudioManager(this);

    this.parallax = new ParallaxBackground(this, PARALLAX_LAYERS);
    this.world = new WorldLayer();
    this.train = new Train(this);
    this.weather = new Weather(this);
    this.weather.setArea(this.area);

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

    this.audio.startMusic();
    this.cameras.main.fadeIn(500, 21, 17, 13);
    this.time.delayedCall(START_STATION.departDelayMs, () => this.depart());
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
      metres = motion.step(dt, {
        maxSpeed: BALANCE.train.maxSpeed * state.speedFactor,
        powered: !state.isOutOfFuel,
        stopIn: route.stopIn(state.distance),
      });
    }

    const underSteam = this.phase === 'running' && !state.isOutOfFuel && motion.speed > 0.01;
    for (const event of state.update(dt, motion.speed, metres, underSteam)) this.onStateEvent(event);
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
    this.ui.closePanel();
    this.phase = 'running';
    this.motion.resetThrottle();
    this.planScenery();
    // Stops past a tunnel are in the next area.
    const areaAhead = this.tunnel && !this.tunnel.swapped ? AREAS[(this.areaIndex + 1) % AREAS.length] : this.area;
    const junction = this.route.planJunction(this.state.distance, areaAhead);
    this.world.add(junction.at, createJunction(this));
    this.audio.play('whistle');
  }

  // --- Areas and tunnels -----------------------------------------------------------------------

  get area() {
    return AREAS[this.areaIndex];
  }

  /** After leaving a stop: when it's time, the line tunnels through a mountain into the next area. */
  planScenery() {
    const d = this.state.distance;
    if (this.tunnel || d < this.nextAreaAt || AREAS.length < 2) return;
    const at = d + BALANCE.route.tunnelAfterDepart;
    const parts = createTunnel(this);
    this.world.add(at, parts.back, { cullMargin: 2400 });
    this.world.add(at, parts.front, { cullMargin: 2400 });
    this.world.add(at, parts.bank, { cullMargin: 4000 });
    const peakMid = at + (parts.enterX + parts.exitX) / 2 / PX_PER_METRE;
    // The scenery changes along a boundary hidden behind the peak (and, for the layers in front
    // of it, behind the rocks), so it's meadow before the mountain and desert after.
    const next = AREAS[(this.areaIndex + 1) % AREAS.length];
    const split = this.parallax.beginSplit(next, ['ground', 'railgrass', 'fog-front', 'foreground-back', 'foreground', 'foreground-trees']);
    this.tunnel = { at, parts, swapped: false, split, peakMid };
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
      this.areaIndex = (this.areaIndex + 1) % AREAS.length;
      this.nextAreaAt = this.state.distance + this.range(BALANCE.route.areaLength);
      // Stops planned before the tunnel take the new area's buildings.
      const j = this.route.junction;
      if (j && !j.resolved) {
        this.route.restyleJunction(this.area);
        if (this.signpostsShown) this.ui.showJunction(j);
      }
      this.ui.toast(`Entering ${this.area.name}`);
      this.weather.setArea(this.area);
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
    this.nextAreaAt = 0;
    const poi = this.route.poi;
    const stopSoon = poi && !poi.visited; // its building is already drawn in this area's style
    if (this.phase !== 'running' || this.tunnel || stopSoon) {
      this.ui.toast('Tunnel after the next departure');
      return;
    }
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
    const poi = this.route.poi;
    if (!poi || poi.visited) return;
    if (this.state.distance >= poi.at - 0.01 && this.motion.speed === 0) {
      poi.visited = true;
      this.phase = 'stopped';
      this.state.stats.stops++;
      this.ui.openPanel({ state: this.state, visit: createVisit(poi) });
    }
  }

  // --- Running out of fuel -------------------------------------------------------------------

  checkStranded() {
    // (checkArrival runs first, so coasting to a halt exactly at a POI still opens its menu.)
    if (this.phase === 'running' && this.state.isOutOfFuel && this.motion.speed === 0) {
      this.endRun('Ran out of fuel between stops');
    }
  }

  endRun(reason) {
    if (this.phase === 'over') return;
    this.phase = 'over';
    this.ui.closePanel();
    this.ui.hideJunction();
    const result = { distance: this.state.distance, reason, stats: { ...this.state.stats } };
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
        this.audio.play('warning');
        this.ui.toast('Fuel running low: find a Coal Depot!', COLORS.bad);
        break;
      case 'outOfFuel':
        this.audio.play('warning');
        this.ui.toast('The fire’s gone out… coasting', COLORS.bad);
        break;
      case 'overheated':
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
