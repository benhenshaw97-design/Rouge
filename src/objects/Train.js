import Phaser from 'phaser';
import { DEPTH, PX_PER_METRE, RAIL_Y, TRAIN_FRONT_X, TRAIN_LAYOUT } from '../config/display.js';

/**
 * The train's visuals: car bodies, spinning wheels, coupling rods, chimney smoke and the
 * cargo heap. It stays at a fixed screen position; motion is conveyed by the wheels, the
 * smoke and the scrolling world.
 *
 * Built entirely from TRAIN_LAYOUT, so adding carriages is a config change.
 */
export class Train {
  constructor(scene) {
    this.scene = scene;
    const L = TRAIN_LAYOUT;
    this.length = L.cars.reduce((s, c) => s + c.width, 0) + L.gap * (L.cars.length - 1);
    this.wheelTravel = 0; // pixels rolled, drives wheel rotation

    this.couplers = scene.add.graphics().setDepth(DEPTH.trainBack);
    this.rods = scene.add.graphics().setDepth(DEPTH.rods);
    this.cars = [];
    this.wheels = [];

    let x = TRAIN_FRONT_X - this.length;
    const bodyBottom = RAIL_Y - L.bodyLift;

    for (const cfg of L.cars) {
      const body = scene.add
        .image(x, bodyBottom, cfg.key)
        .setOrigin(0, 1)
        .setDisplaySize(cfg.width, cfg.height)
        .setDepth(DEPTH.train);
      const car = { cfg, body, x, baseY: bodyBottom, wheels: [] };

      for (const w of cfg.wheels) {
        const sprite = scene.add
          .image(x + w.x, RAIL_Y - w.r, 'wheel')
          .setDisplaySize(w.r * 2, w.r * 2)
          .setDepth(DEPTH.wheels);
        const wheel = { sprite, r: w.r, driver: !!w.driver, x: x + w.x, y: RAIL_Y - w.r };
        car.wheels.push(wheel);
        this.wheels.push(wheel);
      }

      if (cfg.load) {
        car.load = scene.add
          .image(x + cfg.width / 2, bodyBottom - cfg.height + cfg.load.y, 'cargo-load')
          .setOrigin(0.5, 1)
          .setDisplaySize(cfg.load.width, cfg.load.height)
          .setDepth(DEPTH.train - 0.5)
          .setVisible(false);
      }

      this.cars.push(car);
      x += cfg.width + L.gap;
    }

    this.drawCouplers();

    // Smoke from the locomotive's chimney.
    this.loco = this.cars[this.cars.length - 1];
    const chimney = this.loco.cfg.chimney;
    const sx = this.loco.x + chimney.x;
    const sy = bodyBottom - this.loco.cfg.height + chimney.y;
    this.smokeDrift = 0;
    this.smoke = scene.add
      .particles(sx, sy, 'smoke', {
        lifespan: { min: 1300, max: 2100 },
        speedX: { onEmit: () => this.smokeDrift + Phaser.Math.Between(-14, 14) },
        speedY: { min: -75, max: -40 },
        scale: { start: 0.3, end: 1.3 },
        alpha: { start: 0.8, end: 0 },
        rotate: { min: 0, max: 360 },
        frequency: 380,
      })
      .setDepth(DEPTH.smoke);
  }

  drawCouplers() {
    const g = this.couplers;
    g.clear();
    g.fillStyle(0x2a2a2e, 1);
    for (let i = 0; i < this.cars.length - 1; i++) {
      const a = this.cars[i];
      g.fillRect(a.x + a.cfg.width - 4, RAIL_Y - 24, TRAIN_LAYOUT.gap + 8, 5);
    }
  }

  /**
   * @param {number} dt seconds
   * @param {number} speed m/s
   * @param {number} travelledPx pixels the track moved this frame
   * @param {number} time ms since game start
   * @param {object} state TrainState (for the cargo heap)
   * @param {number} maxSpeed for scaling effects
   */
  update(dt, speed, travelledPx, time, state, maxSpeed) {
    this.wheelTravel += travelledPx;
    const speedFrac = Math.min(1, speed / maxSpeed);

    // Wheels roll without slipping: angle = distance / radius.
    for (const w of this.wheels) w.sprite.rotation = this.wheelTravel / w.r;

    // Gentle body bob that grows with speed.
    this.cars.forEach((car, i) => {
      const bob = Math.sin(time * 0.018 + i * 1.7) * TRAIN_LAYOUT.bobAmount * speedFrac;
      car.body.y = car.baseY + bob;
      if (car.load) car.load.y = car.baseY - car.cfg.height + car.cfg.load.y + bob;
    });

    this.drawRods();
    this.updateCargo(state);

    // Smoke: puffs more often at speed and trails behind as the world scrolls.
    this.smokeDrift = -speed * PX_PER_METRE * 0.85;
    this.smoke.frequency = Phaser.Math.Linear(380, 55, speedFrac);
    this.smoke.emitting = !state.isOutOfFuel; // a dead fire makes no smoke
  }

  drawRods() {
    const drivers = this.loco.wheels.filter((w) => w.driver);
    if (drivers.length < 2) return;
    const crank = this.loco.cfg.crankRadius ?? 8;
    const angle = this.wheelTravel / drivers[0].r;
    const ox = Math.cos(angle) * crank;
    const oy = Math.sin(angle) * crank;
    const first = drivers[0];
    const last = drivers[drivers.length - 1];

    const g = this.rods;
    g.clear();
    // Coupling rod joining the crank pins of all driving wheels.
    g.lineStyle(5, 0xb9c0c6, 1);
    g.lineBetween(first.x + ox, first.y + oy, last.x + ox, last.y + oy);
    // Connecting rod from the front crank pin to the cylinder crosshead.
    g.lineStyle(4, 0x8a9096, 1);
    g.lineBetween(last.x + ox, last.y + oy, last.x + 34, last.y - 6);
    g.fillStyle(0x6b2026, 1);
    for (const w of drivers) g.fillCircle(w.x + ox, w.y + oy, 3.5);
  }

  updateCargo(state) {
    for (const car of this.cars) {
      if (!car.load) continue;
      const fill = state.cargo / state.cargoCapacity;
      car.load.setVisible(fill > 0);
      if (fill > 0) car.load.setDisplaySize(car.cfg.load.width, car.cfg.load.height * (0.35 + 0.65 * fill));
    }
  }
}
