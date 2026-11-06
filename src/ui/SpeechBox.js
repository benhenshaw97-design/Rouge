import { CAST } from '../content/dialogue.js';
import { COLORS } from '../config/display.js';
import { frame, text } from './kit.js';

/**
 * A character speaking: portrait, name and a line, in a box that slides in, stays a few
 * seconds and slides away (tap it to dismiss). Lives in the UI scene; one at a time.
 * Portraits are portrait-<who>-<mood> (loaded in the background; if one isn't there yet the
 * box shows without it).
 */
export class SpeechBox {
  constructor(scene) {
    this.scene = scene;
    this.objects = null;
  }

  /** @param {string} who CAST key  @param {string} mood  @param {string} line  @param {{x,y,w}} at */
  say(who, mood, line, at, ms = 5200) {
    this.clear();
    const s = this.scene;
    const pic = s.textures.exists(`portrait-${who}-${mood}`) ? `portrait-${who}-${mood}` : null;
    const w = Math.min(at.w, 430);
    const ps = pic ? 76 : 0;
    const body = text(s, 0, 0, line, 13, COLORS.text, { wordWrap: { width: w - ps - 34 }, lineSpacing: 2 });
    const h = Math.max(ps + 16, body.height + 44);
    const x = at.x;
    const y = at.bottom != null ? at.bottom - h : at.y; // (anchored by its bottom edge if given)
    const c = s.add.container(x, y).setDepth(40);
    const bg = frame(s, 'button-brown', w / 2, h / 2, w, h).setAlpha(0.96);
    c.add(bg);
    if (pic) {
      c.add(s.add.rectangle(10, 8, ps, ps, 0x2b1f15).setOrigin(0).setStrokeStyle(2, COLORS.brass, 0.9));
      c.add(s.add.image(10 + ps / 2, 8 + ps / 2, pic).setDisplaySize(ps - 4, ps - 4));
    }
    c.add(text(s, ps + 20, 10, CAST[who] ?? who, 12, COLORS.gold, { fontStyle: 'bold' }));
    body.setPosition(ps + 20, 30);
    c.add(body);
    c.setSize(w, h).setInteractive({ useHandCursor: true }).on('pointerup', () => this.clear());
    c.setAlpha(0);
    c.x = x - 30;
    s.tweens.add({ targets: c, alpha: 1, x, duration: 220, ease: 'Quad.easeOut' });
    this.objects = c;
    this.timer = s.time.delayedCall(ms, () => {
      if (this.objects !== c) return;
      s.tweens.add({ targets: c, alpha: 0, duration: 300, onComplete: () => c.destroy() });
      this.objects = null;
    });
  }

  clear() {
    this.timer?.remove();
    this.objects?.destroy();
    this.objects = null;
  }
}
