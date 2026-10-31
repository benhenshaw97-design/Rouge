import { PX_PER_METRE, TRAIN_FRONT_X } from '../config/display.js';

/** Screen x of a point `worldX` metres along the line, when the train's nose is at `distance`. */
export function worldToScreenX(worldX, distance) {
  return TRAIN_FRONT_X + (worldX - distance) * PX_PER_METRE;
}

/**
 * Keeps track of objects pinned to a spot on the line (stations, junctions, future track
 * events) and slides them across the screen as the train moves. Objects that have scrolled
 * off the left edge are destroyed.
 */
export class WorldLayer {
  constructor() {
    this.items = [];
  }

  /**
   * @param {number} worldX metres along the line
   * @param {Phaser.GameObjects.GameObject} obj anything with an x property
   * @param {object} [opts]
   * @param {number} [opts.offsetX] screen-pixel offset from the anchor
   * @param {number} [opts.cullMargin] how far past the left edge before it is destroyed
   */
  add(worldX, obj, { offsetX = 0, cullMargin = 1600 } = {}) {
    this.items.push({ worldX, obj, offsetX, cullMargin });
    return obj;
  }

  update(distance) {
    this.items = this.items.filter((item) => {
      const x = worldToScreenX(item.worldX, distance) + item.offsetX;
      if (x < -item.cullMargin) {
        item.obj.destroy();
        return false;
      }
      item.obj.x = x;
      return true;
    });
  }
}
