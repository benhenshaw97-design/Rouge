import Phaser from 'phaser';
import { DEPTH, PX_PER_METRE, RAIL_Y, TRAIN_FRONT_X, TRAIN_LAYOUT } from '../config/display.js';

/**
 * The train's visuals: car bodies, spinning wheels, coupling and connecting rods, chimney
 * smoke, and the loads (the coal heap on the tender shrinks as fuel burns; the ore heap on
 * the wagon grows with cargo). It stays put on the design stage; the world scrolls past.
 *
 * Built from TRAIN_LAYOUT, so adding cars is a config change.
 */
export class Train {
  constructor(scene) {
    this.scene = scene;
    const L = TRAIN_LAYOUT;
    this.length = L.cars.reduce((s, c) => s + c.width, 0) + L.gap * (L.cars.length - 1);
    this.centerX = TRAIN_FRONT_X - this.length / 2;
    this.wheelTravel = 0; // design px rolled; drives wheel rotation
    this.cars = [];
    this.wheels = [];

    let x = TRAIN_FRONT_X - this.length;
    for (const cfg of L.cars) {
      const baseY = RAIL_Y - cfg.bodyLift; // bottom of the body image
      const body = scene.add.image(x, baseY, cfg.key).setOrigin(0, 1).setDisplaySize(cfg.width, cfg.height).setDepth(DEPTH.train);
      const car = { cfg, body, x, baseY, wheels: [] };

      for (const w of cfg.wheels) {
        const wy = RAIL_Y - w.r;
        const sprite = scene.add
          .image(x + w.x, wy, 'wheel')
          .setDisplaySize(w.r * 2, w.r * 2)
          .setDepth(w.behind ? DEPTH.trainBack : DEPTH.wheels);
        const wheel = { sprite, r: w.r, driver: !!w.driver, x: x + w.x, y: wy };
        car.wheels.push(wheel);
        this.wheels.push(wheel);
      }

      if (cfg.heap) {
        car.heap = scene.add
          .image(x + cfg.heap.x, baseY - cfg.height + cfg.heap.y, cfg.heap.key)
          .setOrigin(0, 1)
          .setDisplaySize(cfg.heap.width, cfg.heap.height)
          .setDepth(DEPTH.heaps);
      }

      if (cfg.rod) {
        const drivers = car.wheels.filter((w) => w.driver);
        const span = drivers[drivers.length - 1].x - drivers[0].x;
        const width = span / cfg.rod.eyeSpan;
        car.rod = scene.add
          .image(0, 0, cfg.rod.key)
          .setOrigin(cfg.rod.leftEye.x, cfg.rod.leftEye.y)
          .setDisplaySize(width, width * cfg.rod.aspect)
          .setDepth(DEPTH.rods);
        car.rodGfx = scene.add.graphics().setDepth(DEPTH.rods - 0.1);
        car.drivers = drivers;
      }

      this.cars.push(car);
      x += cfg.width + L.gap;
    }

    // Smoke from the locomotive's chimney.
    this.loco = this.cars[this.cars.length - 1];
    const ch = this.loco.cfg.chimney;
    this.smokeDrift = 0;
    this.smoke = scene.add
      .particles(this.loco.x + ch.x, this.loco.baseY - this.loco.cfg.height + ch.y, 'smoke', {
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
   * @param {object} state TrainState (fuel and cargo for the heaps)
   * @param {number} maxSpeed for scaling effects
   */
  update(speed, travelledPx, time, state, maxSpeed) {
    this.wheelTravel += travelledPx;
    const speedFrac = Math.min(1, speed / maxSpeed);

    // Wheels roll without slipping: angle = distance / radius.
    for (const w of this.wheels) w.sprite.rotation = this.wheelTravel / w.r;

    this.cars.forEach((car, i) => {
      const bob = Math.sin(time * 0.018 + i * 1.7) * TRAIN_LAYOUT.bobAmount * speedFrac;
      car.body.y = car.baseY + bob;
      if (car.heap) this.updateHeap(car, bob, state);
      if (car.rod) this.updateRods(car);
    });

    // Smoke: puffs more often at speed and trails behind as the world scrolls.
    this.smokeDrift = -speed * PX_PER_METRE * 0.85;
    this.smoke.frequency = Phaser.Math.Linear(380, 60, speedFrac);
    this.smoke.emitting = !state.isOutOfFuel; // a dead fire makes no smoke
  }

  updateHeap(car, bob, state) {
    const h = car.cfg.heap;
    const fill = h.fill === 'fuel' ? state.fuel / state.fuelCapacity : state.cargo / state.cargoCapacity;
    car.heap.setVisible(fill > 0);
    if (fill > 0) car.heap.setDisplaySize(h.width, h.height * (0.3 + 0.7 * Math.min(1, fill)));
    car.heap.y = car.baseY - car.cfg.height + h.y + bob;
  }

  updateRods(car) {
    const angle = this.wheelTravel / car.drivers[0].r;
    const crank = car.cfg.crankRadius;
    const ox = Math.cos(angle) * crank;
    const oy = Math.sin(angle) * crank;
    const first = car.drivers[0];
    const last = car.drivers[car.drivers.length - 1];

    // Coupling rod: joins the crank pins of the driving wheels, so it circles with them.
    car.rod.setPosition(first.x + ox, first.y + oy);

    // Connecting rod: from the front crank pin to the piston's crosshead.
    const ch = car.cfg.crosshead;
    const g = car.rodGfx;
    g.clear();
    g.lineStyle(3.5, 0x8d9296, 1);
    g.lineBetween(last.x + ox, last.y + oy, car.x + ch.x, RAIL_Y - ch.aboveRail);
    g.fillStyle(0xc9a24a, 1).fillCircle(last.x + ox, last.y + oy, 2.6);
  }
}
