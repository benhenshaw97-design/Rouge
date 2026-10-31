import Phaser from 'phaser';
import { NINE_SLICE } from '../config/assets.js';
import { COLORS, FONT } from '../config/display.js';
import { uiScale } from '../systems/Viewport.js';

/**
 * Text that stays sharp when the UI camera is zoomed to the device pixel ratio.
 * Sizes are CSS pixels.
 */
export function text(scene, x, y, str, size = 15, color = COLORS.text, extra = {}) {
  return scene.add.text(x, y, str, {
    fontFamily: FONT,
    fontSize: `${size}px`,
    color,
    resolution: Math.max(1, uiScale(scene)),
    ...extra,
  });
}

/**
 * A stretchable frame drawn from one of the button images (9-slice), centred on (x, y).
 * Falls back to a plain rounded rectangle if the browser can't use WebGL.
 */
export function frame(scene, key, x, y, w, h) {
  const base = key.replace(/-(hover|pressed)$/, '');
  const s = NINE_SLICE[base] ?? NINE_SLICE.default;
  w = Math.max(w, s.left + s.right + 2);
  h = Math.max(h, s.top + s.bottom + 2);
  if (scene.sys.renderer.type === Phaser.WEBGL && scene.textures.exists(key)) {
    return scene.add.nineslice(x, y, key, undefined, w, h, s.left, s.right, s.top, s.bottom);
  }
  const fills = { brown: 0x3a2a1e, gold: 0xb07a2a, green: 0x2f5a2a, red: 0x7a2424, blue: 0x2e3e5a };
  const name = Object.keys(fills).find((k) => base.includes(k)) ?? 'brown';
  const g = scene.add.graphics({ x, y });
  g.fillStyle(fills[name], 1).fillRoundedRect(-w / 2, -h / 2, w, h, 8);
  g.lineStyle(2, COLORS.brass, 0.9).strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
  g.width = w;
  g.height = h;
  return g;
}

/** A small round icon button (sound, fullscreen). */
export function roundButton(scene, x, y, draw, onClick) {
  const c = scene.add.container(x, y);
  const bg = scene.add.circle(0, 0, 18, COLORS.panel, 0.85).setStrokeStyle(2, COLORS.brass, 0.8);
  const g = scene.add.graphics();
  c.add([bg, g]);
  draw(g);
  c.setSize(40, 40).setInteractive({ useHandCursor: true });
  c.on('pointerup', () => onClick(g));
  return c;
}
