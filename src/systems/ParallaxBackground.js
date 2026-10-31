/**
 * Builds the background layers from PARALLAX_LAYERS and scrolls each at its own rate.
 *
 * Layers are made much wider than the 1280px design stage so they cover any screen shape the
 * camera may show (ultra-wide desktops, phones held upright). Art is scaled to each layer's
 * configured height (or `tileHeight` for layers that repeat vertically too, like the ground).
 */
const SPAN_LEFT = -2600;
const SPAN_WIDTH = 6400;

export class ParallaxBackground {
  constructor(scene, layers) {
    this.layers = layers.map((cfg) => {
      const source = scene.textures.get(cfg.key).getSourceImage();
      const scale = (cfg.tileHeight ?? cfg.height) / source.height;
      let obj;
      if (cfg.tile === false) {
        obj = scene.add.image(SPAN_LEFT, cfg.y, cfg.key).setOrigin(0, 0).setDisplaySize(SPAN_WIDTH, cfg.height);
      } else {
        obj = scene.add.tileSprite(SPAN_LEFT, cfg.y, SPAN_WIDTH, cfg.height, cfg.key).setOrigin(0, 0);
        obj.setTileScale(scale, scale);
      }
      obj.setDepth(cfg.depth);
      return { cfg, obj, scale };
    });
  }

  /**
   * @param {number} trackPixels how far the track moved this frame, in design pixels
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
