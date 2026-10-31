import { POI_TYPES } from '../config/balance.js';
import { COLORS } from '../config/display.js';
import { isTouch } from '../systems/Viewport.js';
import { fitText } from './Button.js';
import { frame, text } from './kit.js';

/**
 * The two signposts before a junction, as big tappable cards showing the building waiting
 * down each branch. The lit card is where the points are set.
 */
export class JunctionPicker {
  /**
   * @param {Phaser.Scene} scene UI scene
   * @param {{x,y,w,h}} rect area to fill (CSS px)
   * @param {object} junction from RouteManager
   * @param {(i:number)=>void} onSelect
   * @param {boolean} animate slide in (first appearance only)
   */
  constructor(scene, rect, junction, onSelect, animate) {
    this.scene = scene;
    this.objects = [];
    this.cards = [];
    const touch = isTouch(scene);
    const add = (o) => (this.objects.push(o), o);

    const headerH = 46;
    const header = add(frame(scene, 'button-brown', rect.x + rect.w / 2, rect.y + headerH / 2, rect.w, headerH));
    this.title = add(text(scene, rect.x + rect.w / 2, rect.y + 15, '', 17, COLORS.gold, { fontStyle: 'bold' }).setOrigin(0.5));
    add(
      text(
        scene,
        rect.x + rect.w / 2,
        rect.y + 33,
        touch ? 'Tap a sign to set the points' : 'Click a sign (or press 1 / 2) to set the points',
        12,
        COLORS.textDim,
      ).setOrigin(0.5),
    );
    header.setAlpha(0.95);

    const gap = 10;
    const cardW = (rect.w - gap) / 2;
    const cardH = Math.min(rect.h - headerH - 8, 220);
    const top = rect.y + headerH + 8;

    junction.options.forEach((type, i) => {
      const def = POI_TYPES[type];
      const cx = rect.x + i * (cardW + gap) + cardW / 2;
      const cy = top + cardH / 2;
      const c = scene.add.container(cx, cy);
      add(c);

      const off = frame(scene, 'button-brown', 0, 0, cardW, cardH);
      const on = frame(scene, 'button-green', 0, 0, cardW, cardH);
      const textBlock = 46;
      const imgBox = { w: cardW - 24, h: cardH - textBlock - 26 };
      const building = scene.add.image(0, -cardH / 2 + 12 + imgBox.h, junction.buildings[i]).setOrigin(0.5, 1);
      building.setScale(Math.min(imgBox.w / building.width, imgBox.h / building.height));
      const name = text(scene, 0, cardH / 2 - textBlock + 4, def.name, 17, COLORS.text, { fontStyle: 'bold' }).setOrigin(0.5, 0);
      fitText(name, cardW - 16);
      const blurb = text(scene, 0, cardH / 2 - 22, def.blurb, 12, COLORS.textDim).setOrigin(0.5, 0);
      fitText(blurb, cardW - 16);
      const chip = text(scene, 0, -cardH / 2 + 4, 'POINTS SET', 11, '#10310f', {
        fontStyle: 'bold',
        backgroundColor: '#8fe58a',
        padding: { x: 6, y: 2 },
      }).setOrigin(0.5, 0);
      c.add([off, on, building, name, blurb, chip]);
      if (!touch) c.add(text(scene, cardW / 2 - 16, -cardH / 2 + 12, `[${i + 1}]`, 13, COLORS.textDim, { fontStyle: 'bold' }).setOrigin(1, 0));

      c.setSize(cardW, cardH).setInteractive({ useHandCursor: true });
      c.on('pointerup', () => onSelect(i));
      this.cards.push({ c, on, off, chip, name });

      if (animate) {
        const fromY = cy + 40;
        c.y = fromY;
        c.setAlpha(0);
        scene.tweens.add({ targets: c, y: cy, alpha: 1, duration: 380, ease: 'Back.Out', delay: i * 90 });
      }
    });

    this.setSelected(junction.selected);
  }

  setSelected(index) {
    this.cards.forEach((card, i) => {
      const sel = i === index;
      card.on.setVisible(sel);
      card.off.setVisible(!sel);
      card.chip.setVisible(sel);
      card.c.setAlpha(sel ? 1 : 0.86);
    });
  }

  setDistance(metres) {
    this.title.setText(`Junction in ${Math.max(0, Math.ceil(metres))} m`);
  }

  destroy(animate) {
    const objs = this.objects;
    this.objects = [];
    if (!animate) {
      objs.forEach((o) => o.destroy());
      return;
    }
    objs.forEach((o) => o.disableInteractive?.());
    this.scene.tweens.add({ targets: objs, alpha: 0, duration: 300, onComplete: () => objs.forEach((o) => o.destroy()) });
  }
}
