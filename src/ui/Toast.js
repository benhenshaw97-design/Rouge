import { DEPTH, FONT } from '../config/display.js';

const TOAST_X = 580;
const TOAST_Y = 86;

/** Short message that floats in near the top of the screen and fades away. */
export function toast(scene, text, color = '#fff4d6') {
  scene.toasts = (scene.toasts ?? []).filter((t) => t.active);
  const y = TOAST_Y + scene.toasts.length * 36;
  const t = scene.add
    .text(TOAST_X, y, text, {
      fontFamily: FONT,
      fontSize: '20px',
      fontStyle: 'bold',
      color,
      backgroundColor: '#1d1814cc',
      padding: { x: 12, y: 6 },
    })
    .setOrigin(0.5)
    .setDepth(DEPTH.overlay)
    .setAlpha(0);
  scene.toasts.push(t);
  scene.tweens.add({ targets: t, alpha: 1, y: y - 4, duration: 200 });
  scene.tweens.add({
    targets: t,
    alpha: 0,
    y: y - 20,
    delay: 2600,
    duration: 500,
    onComplete: () => t.destroy(),
  });
  return t;
}
