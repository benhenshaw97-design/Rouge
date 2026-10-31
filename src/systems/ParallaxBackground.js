import Phaser from 'phaser';

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
    this.scene = scene;
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
      return { cfg, base: cfg, obj, scale };
    });
  }

  /** Layer settings for an area: its art and height, bottom edge kept (or at `bottom`). */
  areaConfig(base, area) {
    const over = area.layers[base.key];
    const key = over?.key ?? base.key;
    const height = over?.height ?? base.height;
    const tileHeight = over?.tileHeight ?? (over ? undefined : base.tileHeight);
    const y = (over?.bottom ?? base.y + base.height) - height;
    return { ...base, key, height, tileHeight, y };
  }

  /** Builds a layer's display object for a config (sharing the scroll position `scrollPx`). */
  makeObject(cfg, scrollPx = 0) {
    // (Measure the source image: a TileSprite's own .texture is an internal copy.)
    const scale = (cfg.tileHeight ?? cfg.height) / this.scene.textures.get(cfg.key).getSourceImage().height;
    const obj = this.scene.add.tileSprite(SPAN_LEFT, cfg.y, SPAN_WIDTH, cfg.height, cfg.key).setOrigin(0, 0);
    obj.setTileScale(scale, scale).setDepth(cfg.depth);
    obj.tilePositionX = scrollPx / scale;
    return { obj, scale };
  }

  /** Swaps in an area's art at once. */
  setArea(area) {
    this.crossfadeTo(area, 0);
  }

  /** Fades each changed layer over to an area's art (see AREAS in display.js). */
  crossfadeTo(area, duration) {
    for (const layer of this.layers) {
      if (layer.base.tile === false) continue;
      const cfg = this.areaConfig(layer.base, area);
      if (cfg.key === layer.cfg.key) continue;
      const old = layer.obj;
      const oldScale = layer.scale;
      const { obj, scale } = this.makeObject(cfg, old.tilePositionX * oldScale);
      layer.cfg = cfg;
      layer.obj = obj;
      layer.scale = scale;
      if (duration <= 0) {
        old.destroy();
        continue;
      }
      obj.setAlpha(0).setDepth(cfg.depth + 0.01);
      this.scene.tweens.add({
        targets: obj,
        alpha: 1,
        duration,
        onComplete: () => {
          old.destroy();
          obj.setDepth(cfg.depth);
          if (layer.fading?.obj === old) layer.fading = null;
        },
      });
      // The old layer keeps scrolling while it fades out.
      layer.fading = { obj: old, scale: oldScale };
    }
  }

  /**
   * Seamless area change: the new area's layers appear to the right of a boundary and the old
   * ones stay to the left. Layers in `frontKeys` (the ground and foreground) use one boundary,
   * hidden behind the foreground rocks; the rest use another, hidden behind the tunnel mountain.
   * Call setSplit() every frame with both boundaries' x, and endSplit() once they're off screen.
   */
  beginSplit(area, frontKeys) {
    if (this.scene.sys.renderer.type !== Phaser.WEBGL) {
      // Masks need WebGL; otherwise just crossfade.
      this.crossfadeTo(area, 900);
      return false;
    }
    const make = () => {
      const g = this.scene.make.graphics({}, false);
      const show = g.createGeometryMask();
      const hide = g.createGeometryMask().setInvertAlpha(true);
      return { g, show, hide };
    };
    const split = (this.split = { back: make(), front: make(), layers: [] });
    for (const layer of this.layers) {
      if (layer.base.tile === false) continue;
      const cfg = this.areaConfig(layer.base, area);
      if (cfg.key === layer.cfg.key) continue;
      const side = frontKeys.includes(layer.base.key) ? split.front : split.back;
      const old = layer.obj;
      const oldScale = layer.scale;
      const { obj, scale } = this.makeObject(cfg, old.tilePositionX * oldScale);
      old.setMask(side.hide);
      obj.setMask(side.show);
      layer.cfg = cfg;
      layer.obj = obj;
      layer.scale = scale;
      layer.fading = { obj: old, scale: oldScale }; // keeps scrolling until the split ends
      split.layers.push(layer);
    }
    this.setSplit(99999, 99999);
    return true;
  }

  setSplit(backX, frontX) {
    if (!this.split) return;
    for (const [side, x] of [[this.split.back, backX], [this.split.front, frontX]]) {
      side.g.clear().fillStyle(0xffffff).fillRect(x, -4000, 40000, 8000);
    }
  }

  endSplit() {
    if (!this.split) return;
    for (const layer of this.split.layers) {
      layer.fading?.obj.destroy();
      layer.fading = null;
      layer.obj.clearMask();
    }
    for (const side of [this.split.back, this.split.front]) {
      side.show.destroy();
      side.hide.destroy();
      side.g.destroy();
    }
    this.split = null;
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
      if (layer.fading?.obj.active) layer.fading.obj.tilePositionX += px / layer.fading.scale;
    }
  }
}
