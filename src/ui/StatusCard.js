import { COLORS } from '../config/display.js';
import { fitText } from './Button.js';
import { frame, text } from './kit.js';

/**
 * "Next stop" / "Next junction" card shown under the line on upright phones while travelling,
 * so the space below the scene is useful between menus. CSS px.
 */
export class StatusCard {
  constructor(scene, rect, info) {
    this.objects = [];
    const add = (o) => (this.objects.push(o), o);
    const pad = 14;
    const h = rect.h;
    add(frame(scene, 'button-brown', rect.x + rect.w / 2, rect.y + h / 2, rect.w, h).setAlpha(0.95));

    const imgW = Math.min(rect.w * 0.38, 150);
    const imgH = h - pad * 2;
    const img = add(scene.add.image(rect.x + pad + imgW / 2, rect.y + h - pad, info.image).setOrigin(0.5, 1));
    img.setScale(Math.min(imgW / img.width, imgH / img.height));

    const tx = rect.x + pad + imgW + 14;
    const tw = rect.x + rect.w - pad - tx;
    let y = rect.y + pad + 2;
    add(text(scene, tx, y, info.label, 12, COLORS.textDim, { fontStyle: 'bold' }));
    y += 20;
    fitText(add(text(scene, tx, y, info.title, 22, COLORS.gold, { fontStyle: 'bold' })), tw);
    y += 30;
    add(text(scene, tx, y, info.subtitle, 13, COLORS.text, { wordWrap: { width: tw }, lineSpacing: 2 }));
    this.distance = add(text(scene, tx, rect.y + h - pad - 4, '', 20, COLORS.text, { fontStyle: 'bold' }).setOrigin(0, 1));
    this.setDistance(info.distance);
  }

  setDistance(metres) {
    this.distance.setText(metres == null ? '' : `${Math.max(0, Math.ceil(metres))} m ahead`);
  }

  destroy() {
    this.objects.forEach((o) => o.destroy());
    this.objects = [];
  }
}
