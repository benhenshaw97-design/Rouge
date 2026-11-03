import Phaser from 'phaser';
import { DEPTH } from '../config/display.js';

/**
 * Falling snow for areas that ask for it (`weather: 'snow'`, see WEATHER in display.js).
 * Flakes fall across whatever the camera shows and are carried past with the scenery as the
 * train moves. Changing area starts or stops the snowfall; flakes already falling finish.
 */
export class Weather {
  constructor(scene) {
    this.scene = scene;
    this.prefill = 0;
    if (!scene.textures.exists('snowflake')) {
      const g = scene.make.graphics({}, false);
      g.fillStyle(0xffffff, 1).fillCircle(4, 4, 4);
      g.generateTexture('snowflake', 8, 8);
      g.destroy();
    }
    this.snow = scene.add
      .particles(0, 0, 'snowflake', {
        x: { onEmit: () => this.spawnX() },
        // (When snow starts, the first flakes appear all down the view, so the sky isn't empty.)
        y: { onEmit: () => (this.prefill-- > 0 ? Phaser.Math.Between(this.view().y, this.view().bottom) : this.view().y - 10) },
        speedY: { min: 35, max: 85 },
        speedX: { min: -25, max: 5 },
        scale: { min: 0.35, max: 1 },
        alpha: { min: 0.55, max: 0.95 },
        lifespan: { onEmit: () => (this.view().height + 40) * 30 },
        frequency: 40,
        quantity: 3,
        maxParticles: 700,
        emitting: false,
      })
      .setDepth(DEPTH.smoke + 1);
  }

  view() {
    return this.scene.cameras.main.worldView;
  }

  /** Flakes start across the view and a little to its right (the scenery moves left). */
  spawnX() {
    const v = this.view();
    return Phaser.Math.Between(v.x - 100, v.right + 300);
  }

  setArea(area) {
    const snowing = area?.weather === 'snow';
    if (snowing && !this.snow.emitting) {
      this.snow.start();
      this.prefill = 160;
      this.snow.emitParticle(160);
    }
    if (!snowing && this.snow.emitting) this.snow.stop();
  }

  /** @param {number} trackPixels how far the scenery moved this frame */
  update(trackPixels) {
    if (this.snow.getAliveParticleCount() === 0) return;
    const v = this.view();
    this.snow.forEachAlive((p) => {
      // Nearer flakes (bigger) are carried past faster.
      p.x -= trackPixels * (0.6 + p.scaleX * 0.6);
      if (p.y > v.bottom + 10 || p.x < v.x - 150) p.lifeCurrent = 0; // gone from view
    });
  }
}
