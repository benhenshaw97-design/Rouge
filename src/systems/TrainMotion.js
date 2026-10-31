/**
 * Speed control for the train: smooth acceleration away from stops, planned braking so the
 * train halts exactly at a POI, coasting when out of fuel, and easing down when the top speed
 * is limited (overheating, wear).
 *
 * Pure maths, no Phaser. Distances in metres, speeds in m/s.
 */
export class TrainMotion {
  constructor(trainConfig) {
    this.cfg = trainConfig;
    this.speed = 0;
    this.throttle = 0; // 0..1, ramps up for a smooth start
    this.braking = false;
  }

  /** Call when the train pulls away so the regulator opens gradually again. */
  resetThrottle() {
    this.throttle = 0;
  }

  /**
   * Advance one frame.
   * @param {number} dt seconds
   * @param {object} o
   * @param {number} o.maxSpeed current allowed top speed (m/s)
   * @param {boolean} o.powered false when out of fuel (train coasts)
   * @param {number|null} o.stopIn metres until the train must be stopped, or null for no stop
   * @returns {number} metres travelled this frame
   */
  step(dt, { maxSpeed, powered, stopIn }) {
    const c = this.cfg;
    const v0 = this.speed;
    let v = v0;
    this.braking = false;

    if (stopIn != null) {
      const stoppingDistance = (v0 * v0) / (2 * c.brakeDeceleration);
      if (stopIn <= 0.01) {
        this.speed = 0;
        return Math.max(0, stopIn);
      }
      if (v0 > 0 && stopIn <= stoppingDistance + v0 * dt) {
        // Constant deceleration that lands exactly on the stop point.
        const decel = (v0 * v0) / (2 * stopIn);
        v = Math.max(0, v0 - decel * dt);
        this.braking = true;
        this.throttle = 0;
        if (v < 0.35) {
          // Close enough: settle onto the mark.
          this.speed = 0;
          return stopIn;
        }
        this.speed = v;
        return Math.min(stopIn, ((v0 + v) / 2) * dt);
      }
    }

    if (powered) {
      this.throttle = Math.min(1, this.throttle + dt / c.throttleRampSeconds);
      if (v < maxSpeed) {
        // Strong pull at low speed that tapers off near the top speed.
        const taper = Math.max(0.05, 1 - (v / maxSpeed) ** 3);
        v = Math.min(maxSpeed, v + c.acceleration * this.throttle * taper * dt);
      } else {
        v = Math.max(maxSpeed, v - c.overspeedDeceleration * dt);
      }
    } else {
      this.throttle = 0;
      v = Math.max(0, v - c.coastDeceleration * dt);
    }

    let travelled = ((v0 + v) / 2) * dt;
    if (stopIn != null && travelled >= stopIn) {
      travelled = stopIn;
      v = 0;
    }
    this.speed = v;
    return travelled;
  }
}
