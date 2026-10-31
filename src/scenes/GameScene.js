import Phaser from 'phaser';
import { BALANCE, POI_TYPES, START_STATION } from '../config/balance.js';
import { DEBUG } from '../config/debug.js';
import { PARALLAX_LAYERS, PX_PER_METRE } from '../config/display.js';
import { Train } from '../objects/Train.js';
import { createJunction, createStop } from '../objects/worldObjects.js';
import { createVisit } from '../poi/poiActions.js';
import { TrainState } from '../state/TrainState.js';
import { AudioManager } from '../systems/AudioManager.js';
import { ParallaxBackground } from '../systems/ParallaxBackground.js';
import { RouteManager } from '../systems/RouteManager.js';
import { TrainMotion } from '../systems/TrainMotion.js';
import { WorldLayer } from '../systems/WorldLayer.js';
import { Hud } from '../ui/Hud.js';
import { PoiPanel } from '../ui/PoiPanel.js';
import { SignpostPicker } from '../ui/SignpostPicker.js';
import { toast } from '../ui/Toast.js';

/**
 * The run. Phases:
 *   'waiting'  sitting at the start station before the first departure
 *   'running'  moving along the line (includes braking into a POI and coasting without fuel)
 *   'stopped'  halted at a POI with its panel open
 *   'over'     run finished; handing off to GameOver
 */
export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    this.toasts = [];
    this.phase = 'waiting';
    this.chuffDistancePx = 0;
    this.wasBraking = false;

    this.state = new TrainState(BALANCE);
    this.motion = new TrainMotion(BALANCE.train);
    this.route = new RouteManager(BALANCE, POI_TYPES);
    this.audio = new AudioManager(this);

    this.parallax = new ParallaxBackground(this, PARALLAX_LAYERS);
    this.world = new WorldLayer();
    this.train = new Train(this);
    this.hud = new Hud(this, this.state, this.audio);
    this.signposts = new SignpostPicker(this, (i) => this.selectBranch(i));
    this.panel = new PoiPanel(this, {
      audio: this.audio,
      onDepart: () => this.depart(),
      onAbandon: () => this.endRun('Stranded without fuel'),
    });

    // The station we start from, centred behind the train.
    this.world.add(0, createStop(this, { buildingKey: START_STATION.building, title: START_STATION.name, subtitle: 'Departures' }), {
      offsetX: -this.train.length / 2,
    });

    // Controls
    const kb = this.input.keyboard;
    kb?.on('keydown-ONE', () => this.selectBranch(0));
    kb?.on('keydown-TWO', () => this.selectBranch(1));
    kb?.on('keydown-SPACE', () => this.tryDepart());
    kb?.on('keydown-ENTER', () => this.tryDepart());

    this.audio.startMusic();
    this.cameras.main.fadeIn(500, 21, 17, 13);
    this.time.delayedCall(START_STATION.departDelayMs, () => this.depart());
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
    this.train.update(dt, motion.speed, px, time, state, BALANCE.train.maxSpeed);
    this.playMotionSounds(px);

    if (this.phase === 'running') {
      this.updateJunction();
      this.checkArrival();
      this.checkStranded();
    }

    this.hud.update(motion.speed, time);
  }

  // --- Departing -----------------------------------------------------------------------------

  tryDepart() {
    if (this.phase === 'stopped' && !this.state.isOutOfFuel) this.depart();
  }

  depart() {
    if (this.phase === 'over' || this.state.isOutOfFuel) return;
    this.panel.close();
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

    if (!this.signposts.visible && ahead <= BALANCE.route.signpostRevealDistance) {
      this.signposts.show(j);
      this.audio.play('click');
    }
    if (this.signposts.visible) this.signposts.setDistance(ahead);

    if (ahead <= 0) {
      const poi = this.route.resolveJunction();
      this.signposts.hide();
      this.audio.play('click');
      toast(this, `Points set for ${POI_TYPES[poi.type].name}`);
      const def = POI_TYPES[poi.type];
      this.world.add(poi.at, createStop(this, { buildingKey: def.building, title: def.name, subtitle: poi.name }), {
        offsetX: -this.train.length / 2,
      });
    }
  }

  selectBranch(index) {
    const j = this.route.junction;
    if (this.phase !== 'running' || !j || j.resolved || !this.signposts.visible) return;
    if (j.selected !== index) this.audio.play('click');
    this.route.select(index);
    this.signposts.setSelected(index);
  }

  // --- Stopping at POIs ----------------------------------------------------------------------

  checkArrival() {
    const poi = this.route.poi;
    if (!poi || poi.visited) return;
    if (this.state.distance >= poi.at - 0.01 && this.motion.speed === 0) {
      poi.visited = true;
      this.phase = 'stopped';
      this.state.stats.stops++;
      this.panel.open(this.state, createVisit(poi));
    }
  }

  // --- Running out of fuel -------------------------------------------------------------------

  checkStranded() {
    // (checkArrival runs first, so coasting to a halt exactly at a POI still opens its panel.)
    if (this.phase === 'running' && this.state.isOutOfFuel && this.motion.speed === 0) {
      this.endRun('Ran out of fuel between stops');
    }
  }

  endRun(reason) {
    if (this.phase === 'over') return;
    this.phase = 'over';
    this.panel.close();
    this.signposts.hide();
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
        toast(this, 'Fuel running low: find a Coal Depot!', '#ffb3a8');
        break;
      case 'outOfFuel':
        this.audio.play('warning');
        toast(this, 'The fire’s gone out… coasting', '#ffb3a8');
        break;
      case 'overheated':
        this.audio.play('brake');
        toast(this, 'Boiler overheated! Easing off', '#ffb3a8');
        break;
      case 'cooledDown':
        toast(this, 'Boiler back to safe pressure', '#a8f0a0');
        break;
    }
  }

  playMotionSounds(px) {
    // A chuff every quarter-turn of the driving wheels, but only under steam.
    if (!this.state.isOutOfFuel && this.phase === 'running') {
      this.chuffDistancePx += px;
      const quarterTurn = (Math.PI * 2 * 22) / 4;
      if (this.chuffDistancePx >= quarterTurn) {
        this.chuffDistancePx %= quarterTurn;
        this.audio.play('chuff', { rate: Phaser.Math.FloatBetween(0.9, 1.1) });
      }
    }
    if (this.motion.braking && !this.wasBraking) this.audio.play('brake');
    this.wasBraking = this.motion.braking;
  }
}
