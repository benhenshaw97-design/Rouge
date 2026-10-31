import { POI_TYPES } from '../config/balance.js';
import { DEPTH, FONT, RAIL_Y } from '../config/display.js';

const POSTS_X = [870, 1120];
const POST_BASE_Y = RAIL_Y - 12;
// Board area inside the signpost image (240x250): the arrow board spans y 8..108.
const BOARD = { left: -112, top: -242, width: 228, height: 100 };

/**
 * Two signposts that rise beside the line as a junction approaches. Each names the POI down
 * that branch; clicking one (or pressing 1 / 2) sets the points.
 */
export class SignpostPicker {
  constructor(scene, onSelect) {
    this.scene = scene;
    this.onSelect = onSelect;
    this.visible = false;
    this.posts = [];

    this.header = scene.add
      .text(996, 254, '', {
        fontFamily: FONT,
        fontSize: '18px',
        fontStyle: 'bold',
        color: '#fff4d6',
        backgroundColor: '#1d1814cc',
        padding: { x: 12, y: 6 },
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.signposts)
      .setVisible(false);
  }

  show(junction) {
    this.clear();
    this.visible = true;
    this.junction = junction;

    junction.options.forEach((typeId, i) => {
      const def = POI_TYPES[typeId];
      const c = this.scene.add.container(POSTS_X[i], POST_BASE_Y + 260).setDepth(DEPTH.signposts);

      const glow = this.scene.add.graphics();
      const sign = this.scene.add.image(0, 0, 'signpost').setOrigin(0.5, 1);
      const midY = BOARD.top + BOARD.height / 2;
      const icon = this.scene.add.image(BOARD.left + 34, midY, def.icon).setDisplaySize(40, 40);
      const name = this.scene.add
        .text(BOARD.left + 62, midY - 12, def.name, { fontFamily: FONT, fontSize: '21px', fontStyle: 'bold', color: '#2b1d12' })
        .setOrigin(0, 0.5);
      const blurb = this.scene.add
        .text(BOARD.left + 62, midY + 14, def.blurb, { fontFamily: FONT, fontSize: '14px', color: '#5a3b24' })
        .setOrigin(0, 0.5);
      const key = this.scene.add
        .text(0, -96, `[${i + 1}]`, { fontFamily: FONT, fontSize: '15px', fontStyle: 'bold', color: '#f5e9d0' })
        .setOrigin(0.5);
      const lamp = this.scene.add.circle(0, -124, 9, 0x3a3a3a).setStrokeStyle(2, 0x1d1814);
      const tag = this.scene.add
        .text(0, BOARD.top - 18, 'POINTS SET', {
          fontFamily: FONT,
          fontSize: '13px',
          fontStyle: 'bold',
          color: '#10310f',
          backgroundColor: '#7fe07a',
          padding: { x: 6, y: 2 },
        })
        .setOrigin(0.5);

      c.add([glow, sign, icon, name, blurb, key, lamp, tag]);
      sign.setInteractive({ useHandCursor: true, pixelPerfect: false }).on('pointerup', () => this.onSelect(i));
      sign.on('pointerover', () => sign.setTint(0xfff2cc));
      sign.on('pointerout', () => sign.clearTint());

      this.scene.tweens.add({ targets: c, y: POST_BASE_Y, duration: 550, ease: 'Back.Out', delay: i * 120 });
      this.posts.push({ c, glow, lamp, tag });
    });

    this.header.setVisible(true);
    this.setSelected(junction.selected);
  }

  setSelected(index) {
    this.posts.forEach((p, i) => {
      const on = i === index;
      p.glow.clear();
      if (on) {
        p.glow.lineStyle(6, 0x7fe07a, 0.9);
        p.glow.strokeRoundedRect(BOARD.left - 6, BOARD.top - 6, BOARD.width + 18, BOARD.height + 12, 12);
      }
      p.lamp.setFillStyle(on ? 0x58e05a : 0x3a3a3a);
      p.tag.setVisible(on);
      p.c.setAlpha(on ? 1 : 0.82);
    });
  }

  setDistance(metres) {
    this.header.setText(`Junction in ${Math.max(0, Math.ceil(metres))} m: click a signpost to set the points`);
  }

  hide() {
    if (!this.visible) return;
    this.visible = false;
    this.header.setVisible(false);
    const posts = this.posts;
    this.posts = [];
    posts.forEach((p) => {
      p.c.list.forEach((child) => child.disableInteractive?.());
      this.scene.tweens.add({
        targets: p.c,
        y: POST_BASE_Y + 280,
        alpha: 0,
        duration: 450,
        ease: 'Quad.In',
        onComplete: () => p.c.destroy(),
      });
    });
  }

  clear() {
    this.posts.forEach((p) => p.c.destroy());
    this.posts = [];
  }
}
