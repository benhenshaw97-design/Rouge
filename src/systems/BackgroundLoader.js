import Phaser from 'phaser';
import { IMAGES, LATER_IMAGES, PIXEL_PERFECT } from '../config/assets.js';

/**
 * Loads the art in LATER_IMAGES that isn't loaded yet, without holding up the game. Call from
 * any scene; if the scene shuts down part-way, the next call picks up what's still missing.
 */
export function loadLaterImages(scene) {
  const missing = LATER_IMAGES.filter((k) => !scene.textures.exists(k));
  if (!missing.length) return;
  for (const key of missing) scene.load.image(key, IMAGES[key]);
  scene.load.on('filecomplete', (key) => {
    if (PIXEL_PERFECT.includes(key)) scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
  });
  scene.load.start();
}

/** True once every image an area uses has loaded. */
export function areaLoaded(scene, area) {
  const keys = [
    ...Object.values(area.layers ?? {}).map((l) => l.key),
    ...Object.values(area.buildings ?? {}).flat(),
    area.platform,
  ].filter(Boolean);
  return keys.every((k) => scene.textures.exists(k));
}
