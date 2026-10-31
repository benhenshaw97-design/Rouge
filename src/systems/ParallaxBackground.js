import { GAME_WIDTH } from '../config/display.js';

/**
 * Builds the background layers from PARALLAX_LAYERS and scrolls each one at its own rate.
 * Art is scaled to each layer's configured height, so replacement images of any size fit.
 */
export class ParallaxBackground {
  constructor(scene, layers) {
    this.layers = layers.map((cfg) => {
      const source = scene.textures.get(cfg.key).getSourceImage();
      const scale = cfg.height / source.height;
      let obj;
      if (cfg.tile === false) {
        obj = scene.add.image(0, cfg.y, cfg.key).setOrigin(0, 0).setDisplaySize(GAME_WIDTH, cfg.height);
      } else {
        obj = scene.add.tileSprite(0, cfg.y, GAME_WIDTH, cfg.height, cfg.key).setOrigin(0, 0);
        obj.setTileScale(scale, scale);
      }
      obj.setDepth(cfg.depth);
      return { cfg, obj, scale };
    });
  }

  /**
   * @param {number} trackPixels how far the track moved this frame, in screen pixels
   * @param {number} dt seconds (for layers that drift on their own, like clouds)
   */
  scroll(trackPixels, dt) {
    for (const layer of this.layers) {
      if (layer.cfg.tile === false) continue;
      const px = trackPixels * layer.cfg.factor + (layer.cfg.drift ?? 0) * dt;
      // tilePosition is measured in texture pixels, so undo the scale.
      layer.obj.tilePositionX += px / layer.scale;
    }
  }
}
