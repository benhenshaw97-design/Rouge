import Phaser from 'phaser';
import { DEPTH, PX_PER_METRE, RAIL_Y, TRAIN_FRONT_X, TRAIN_LAYOUT } from '../config/display.js';
import { liveryKey } from '../state/liveries.js';

/**
 * The train's visuals. Each car is one image (body over underframe) with wheels centred on the
 * underframe's axle hangers and standing on the rail. The locomotive's driving wheels are
 * joined by a coupling rod; the tender's coal heap shrinks as fuel burns and the wagon's ore
 * heap grows with cargo. The train stays put on the design stage; the world scrolls past.
 *
 * Built from TRAIN_LAYOUT (display.js / train-art.json), so adding cars is a config change.
 */
export class Train {
  constructor(scene) {
    this.scene = scene;
    const L = TRAIN_LAYOUT;
    this.length = L.cars.reduce((s, c) => s + c.width, 0) + L.gap * (L.cars.length - 1);
    this.frontX = TRAIN_FRONT_X;
    this.centerX = TRAIN_FRONT_X - this.length / 2;
    this.wheelTravel = 0; // design px rolled; drives wheel rotation
    this.cars = [];
    this.wheels = [];

    let x = TRAIN_FRONT_X - this.length;
    for (const cfg of L.cars) {
      const top = RAIL_Y - cfg.railY;
      const body = scene.add.image(x, top, liveryKey(cfg.key)).setOrigin(0, 0).setDisplaySize(cfg.width, cfg.height).setDepth(DEPTH.train);
      const car = { cfg, body, x, top, wheels: [] };

      for (const w of cfg.wheels) {
        const sprite = scene.add
          .image(x + w.x, top + w.y, liveryKey('wheel'))
          .setDisplaySize(w.r * 2, w.r * 2)
          .setDepth(DEPTH.wheels);
        const wheel = { sprite, r: w.r, x: x + w.x, y: top + w.y };
        car.wheels.push(wheel);
        this.wheels.push(wheel);
      }

      if (cfg.heap) {
        car.heap = scene.add
          .image(x + cfg.heap.x, top + cfg.heap.bottom, cfg.heap.key)
          .setOrigin(0, 1)
          .setDisplaySize(cfg.heap.w, cfg.heap.h)
          .setDepth(DEPTH.heaps);
      }

      if (cfg.load) {
        // Cargo on the deck; the image changes with what's being carried.
        car.load = scene.add.image(x + cfg.load.x, top + cfg.load.bottom, 'cargo-gold').setOrigin(0, 1).setDepth(DEPTH.heaps).setVisible(false);
      }

      if (cfg.rod && car.wheels.length >= 2) {
        const first = car.wheels[0];
        const last = car.wheels[car.wheels.length - 1];
        car.rod = scene.add
          .image(0, 0, cfg.rod.key)
          .setOrigin(cfg.rod.leftEye.x, cfg.rod.leftEye.y)
          .setDisplaySize((last.x - first.x) / cfg.rod.eyeSpan, cfg.rod.thickness)
          .setDepth(DEPTH.rods);
      }

      this.cars.push(car);
      x += cfg.width + L.gap;
    }

    // Smoke from the locomotive's chimney.
    this.loco = this.cars[this.cars.length - 1];
    const ch = this.loco.cfg.chimney;
    this.smokeDrift = 0;
    this.smoke = scene.add
      .particles(this.loco.x + ch.x, this.loco.top + ch.y, 'smoke', {
        lifespan: { min: 1400, max: 2300 },
        speedX: { onEmit: () => this.smokeDrift + Phaser.Math.Between(-12, 12) },
        speedY: { min: -70, max: -38 },
        scale: { start: 0.22, end: 0.95 },
        alpha: { start: 0.85, end: 0 },
        rotate: { min: 0, max: 360 },
        frequency: 380,
      })
      .setDepth(DEPTH.smoke);
  }

  /**
   * @param {number} speed m/s
   * @param {number} travelledPx design pixels the track moved this frame
   * @param {number} time ms since start
   * @param {object} state TrainState (fuel and cargo for the loads)
   * @param {number} maxSpeed for scaling effects
   */
  update(speed, travelledPx, time, state, maxSpeed) {
    this.wheelTravel += travelledPx;
    const speedFrac = Math.min(1, speed / maxSpeed);

    // Wheels roll without slipping: angle = distance / radius.
    for (const w of this.wheels) w.sprite.rotation = this.wheelTravel / w.r;

    this.cars.forEach((car, i) => {
      // A gentle sway on the springs; wheels stay on the rail.
      const bob = Math.sin(time * 0.018 + i * 1.7) * TRAIN_LAYOUT.bobAmount * speedFrac;
      car.body.y = car.top + bob;
      if (car.heap) this.updateHeap(car, bob, state);
      if (car.load) this.updateLoad(car, bob, state);
      if (car.rod) this.updateRod(car);
    });

    // Smoke: puffs more often at speed and trails behind as the world scrolls.
    this.smokeDrift = -speed * PX_PER_METRE * 0.85;
    this.smoke.frequency = Phaser.Math.Linear(380, 60, speedFrac);
    this.smoke.emitting = !state.isOutOfFuel; // a dead fire makes no smoke
  }

  /** Repaints the train in a livery (see state/liveries.js). */
  setLivery(livery) {
    for (const car of this.cars) {
      car.body.setTexture(liveryKey(car.cfg.key, livery)).setDisplaySize(car.cfg.width, car.cfg.height);
      for (const w of car.wheels) w.sprite.setTexture(liveryKey('wheel', livery)).setDisplaySize(w.r * 2, w.r * 2);
    }
  }

  updateHeap(car, bob, state) {
    const h = car.cfg.heap;
    const fill = h.fill === 'fuel' ? state.fuel / state.fuelCapacity : state.cargo / state.cargoCapacity;
    car.heap.setVisible(fill > 0);
    if (fill > 0) car.heap.setDisplaySize(h.w, h.h * (0.3 + 0.7 * Math.min(1, fill)));
    car.heap.y = car.top + h.bottom + bob;
  }

  /** Shows the cargo on the wagon's deck, revealed from the bottom up as the wagon fills. */
  updateLoad(car, bob, state) {
    const fill = state.cargo / state.cargoCapacity;
    const kind = state.cargoKind;
    const info = kind && car.cfg.load.loads[kind];
    car.load.setVisible(fill > 0 && !!info);
    if (!car.load.visible) return;
    if (car.load.texture.key !== `cargo-${kind}`) car.load.setTexture(`cargo-${kind}`);
    car.load.setDisplaySize(info.w, info.h);
    const shown = 0.45 + 0.55 * Math.min(1, fill); // the tub/base first, then the load piles up
    const th = car.load.frame.height;
    car.load.setCrop(0, th * (1 - shown), car.load.frame.width, th * shown);
    car.load.y = car.top + car.cfg.load.bottom + bob;
  }

  /** The coupling rod joins the crank pins, so it circles with the driving wheels. */
  updateRod(car) {
    const first = car.wheels[0];
    const angle = this.wheelTravel / first.r;
    const crank = car.cfg.crankRadius;
    car.rod.setPosition(first.x + Math.cos(angle) * crank, first.y + Math.sin(angle) * crank);
  }
}
