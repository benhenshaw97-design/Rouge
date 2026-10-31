import Phaser from 'phaser';
import { COLORS } from '../config/display.js';
import { frame, text } from './kit.js';

/** Text colour that reads well on each button skin. */
const INK = {
  gold: { main: COLORS.textDark, sub: '#5a3b1c', right: COLORS.textDark },
  brown: { main: COLORS.text, sub: COLORS.textDim, right: COLORS.text },
  green: { main: COLORS.text, sub: '#cfe8c8', right: COLORS.text },
  red: { main: COLORS.text, sub: '#f2c9c4', right: COLORS.text },
  blue: { main: COLORS.text, sub: '#c9d6ee', right: COLORS.text },
};

/**
 * A button drawn with the art's 9-slice frames, positioned by its centre. Sizes in CSS px.
 *
 * options: width, height, label, sublabel (small second line), rightLabel, rightColor,
 *          skin ('gold' | 'green' | 'red' | 'blue' | 'brown'), fontSize, align, onClick
 * A disabled button switches to the brown skin.
 */
export class Button extends Phaser.GameObjects.Container {
  constructor(scene, x, y, options) {
    super(scene, x, y);
    const o = { width: 200, height: 44, skin: 'gold', fontSize: 16, align: 'left', enabled: true, ...options };
    this.o = o;
    this.enabled = o.enabled;
    const skin = this.enabled ? o.skin : 'brown';
    const ink = INK[skin];
    const { width: w, height: h } = o;

    this.frames = {
      normal: frame(scene, `button-${skin}`, 0, 0, w, h),
      hover: frame(scene, `button-${skin}-hover`, 0, 0, w, h).setVisible(false),
      pressed: frame(scene, `button-${skin}-pressed`, 0, 0, w, h).setVisible(false),
    };
    this.add(Object.values(this.frames));

    const left = -w / 2 + 14;
    const labelX = o.align === 'left' ? left : 0;
    const originX = o.align === 'left' ? 0 : 0.5;
    const rightRoom = o.rightLabel ? 70 : 0;
    const wrapW = w - 28 - rightRoom;

    this.label = text(scene, labelX, o.sublabel ? -8 : 0, o.label, o.fontSize, ink.main, { fontStyle: 'bold' })
      .setOrigin(originX, 0.5)
      .setAlpha(this.enabled ? 1 : 0.7);
    fitText(this.label, wrapW);
    this.add(this.label);

    if (o.sublabel) {
      const sub = text(scene, labelX, 11, o.sublabel, Math.max(11, o.fontSize - 4), ink.sub).setOrigin(originX, 0.5);
      fitText(sub, wrapW);
      this.add(sub);
    }
    if (o.rightLabel) {
      const right = text(scene, w / 2 - 14, 0, o.rightLabel, o.fontSize, this.enabled ? (o.rightColor ?? ink.right) : COLORS.textDim, {
        fontStyle: 'bold',
      }).setOrigin(1, 0.5);
      this.add(right);
    }

    this.setSize(w, h);
    this.setInteractive({ useHandCursor: this.enabled });
    this.on('pointerover', () => this.show('hover'));
    this.on('pointerout', () => this.show('normal'));
    this.on('pointerdown', () => this.show('pressed'));
    this.on('pointerup', () => {
      this.show('hover');
      // Run on the next tick so the handler can safely destroy this button (menus rebuild).
      if (this.enabled && o.onClick) scene.time.delayedCall(0, o.onClick);
    });
    scene.add.existing(this);
  }

  show(state) {
    if (!this.enabled) state = 'normal';
    for (const [k, f] of Object.entries(this.frames)) f.setVisible(k === state);
    this.label.y = (this.o.sublabel ? -8 : 0) + (state === 'pressed' ? 1 : 0);
  }
}

/** Shrinks a text's font until it fits `maxWidth` (long labels on narrow phones). */
export function fitText(t, maxWidth) {
  let size = parseFloat(t.style.fontSize);
  while (t.width > maxWidth && size > 10) {
    size -= 1;
    t.setFontSize(size);
  }
  return t;
}
