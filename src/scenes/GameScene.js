import Phaser from 'phaser';
import { BALANCE, POI_TYPES, START_STATION } from '../config/balance.js';
import { DEBUG } from '../config/debug.js';
import { COLORS, PARALLAX_LAYERS, PX_PER_METRE, TRAIN_LAYOUT, WORLD_HEIGHT } from '../config/display.js';
import { Train } from '../objects/Train.js';
import { createJunction, createStop } from '../objects/worldObjects.js';
import { createVisit } from '../poi/poiActions.js';
import { TrainState } from '../state/TrainState.js';
import { AudioManager } from '../systems/AudioManager.js';
import { ParallaxBackground } from '../systems/ParallaxBackground.js';
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

    const px = metres * PX_PER_METRE;
    this.parallax.scroll(px, dt);
    this.world.update(state.distance);
    this.train.update(motion.speed, px, time, state, BALANCE.train.maxSpeed);
    this.playMotionSounds(px);

    if (this.phase === 'running') {
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
    const junction = this.route.planJunction(this.state.distance);
    this.world.add(junction.at, createJunction(this));
    this.audio.play('whistle');
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
          platform: def.platform,
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
      this.cameras.main.fadeOut(600, 21, 17, 13);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('GameOver', result));
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
