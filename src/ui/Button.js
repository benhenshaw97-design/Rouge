import Phaser from 'phaser';
import { FONT } from '../config/display.js';

/**
 * A rounded, clickable button. Positioned by its centre.
 *
 * options: width, height, label, sublabel (small second line), rightLabel, rightColor,
 *          onClick, fill / hoverFill (colours), fontSize, align ('left' | 'center')
 */
export class Button extends Phaser.GameObjects.Container {
  constructor(scene, x, y, options) {
    super(scene, x, y);
    const o = {
      width: 200,
      height: 44,
      fill: 0x3b2f25,
      hoverFill: 0x5a4532,
      stroke: 0xd6a84a,
      fontSize: 17,
      align: 'left',
      textColor: '#f5e9d0',
      ...options,
    };
    this.o = o;
    this.enabled = true;
    this.hovered = false;

    const left = -o.width / 2 + 14;
    const labelX = o.align === 'left' ? left : 0;
    const originX = o.align === 'left' ? 0 : 0.5;
    const labelY = o.sublabel ? -9 : 0;

    this.bg = scene.add.graphics();
    this.label = scene.add
      .text(labelX, labelY, o.label, { fontFamily: FONT, fontSize: `${o.fontSize}px`, color: o.textColor, fontStyle: 'bold' })
      .setOrigin(originX, 0.5);
    this.add([this.bg, this.label]);

    if (o.sublabel) {
      this.sub = scene.add
        .text(labelX, 12, o.sublabel, { fontFamily: FONT, fontSize: '13px', color: '#c9b48e' })
        .setOrigin(originX, 0.5);
      this.add(this.sub);
    }
    if (o.rightLabel) {
      this.right = scene.add
        .text(o.width / 2 - 14, 0, o.rightLabel, {
          fontFamily: FONT,
          fontSize: `${o.fontSize}px`,
          color: o.rightColor ?? o.textColor,
          fontStyle: 'bold',
        })
        .setOrigin(1, 0.5);
      this.add(this.right);
    }

    this.setSize(o.width, o.height);
    this.setInteractive({ useHandCursor: true });
    this.on('pointerover', () => {
      this.hovered = true;
      this.draw();
    });
    this.on('pointerout', () => {
      this.hovered = false;
      this.draw();
    });
    this.on('pointerup', () => {
      // Run on the next tick so the handler can safely destroy this button (e.g. panel rebuilds).
      if (this.enabled && o.onClick) this.scene.time.delayedCall(0, o.onClick);
    });

    scene.add.existing(this);
    this.draw();
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (this.input) this.input.cursor = enabled ? 'pointer' : 'default';
    this.draw();
    return this;
  }

  draw() {
    const { width: w, height: h } = this.o;
    const fill = !this.enabled ? 0x2a2420 : this.hovered ? this.o.hoverFill : this.o.fill;
    this.bg.clear();
    this.bg.fillStyle(fill, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 9);
    this.bg.lineStyle(2, this.o.stroke, this.enabled ? (this.hovered ? 1 : 0.55) : 0.15).strokeRoundedRect(-w / 2, -h / 2, w, h, 9);
    const alpha = this.enabled ? 1 : 0.45;
    this.label.setAlpha(alpha);
    this.right?.setAlpha(this.enabled ? 1 : 0.6);
    this.sub?.setAlpha(this.enabled ? 1 : 0.9);
  }
}
