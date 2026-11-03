import Phaser from 'phaser';
import { COLORS } from '../config/display.js';
import { cssSize, isTouch, uiScale } from '../systems/Viewport.js';
import { Button } from '../ui/Button.js';
import { frame, text } from '../ui/kit.js';

const BEST_KEY = 'rouge.bestDistance';

/** Shows how far the run got, and a restart button. */
export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  init(data) {
    this.result = { distance: 0, reason: 'Out of fuel', stats: { earned: 0, stops: 0, passengersDelivered: 0 }, ...data };
    const best = readBest();
    this.isRecord = this.result.distance > best && this.result.distance > 0;
    this.best = Math.max(best, this.result.distance);
    writeBest(this.best);
  }

  create() {
    const restart = () => this.scene.start('Game');
    this.input.keyboard?.once('keydown-SPACE', restart);
    this.input.keyboard?.once('keydown-ENTER', restart);
    this.build();
    const onResize = () => this.build();
    this.scale.on('resize', onResize);
    this.events.once('shutdown', () => this.scale.off('resize', onResize));
    this.cameras.main.fadeIn(400, 21, 17, 13);
  }

  build() {
    this.children.removeAll(true);
    const u = uiScale(this);
    this.cameras.main.setOrigin(0, 0).setZoom(u).setScroll(0, 0);
    const { w, h } = cssSize(this);
    const { distance, reason, stats } = this.result;

    // Where the run ended (snapshot taken by GameScene), or just the sky.
    const shot = this.textures.exists('run-end');
    this.add.image(0, 0, shot ? 'run-end' : 'sky').setOrigin(0).setDisplaySize(w, h);
    this.add.rectangle(0, 0, w, h, 0x15110d, shot ? 0.6 : 0.72).setOrigin(0);

    const cardW = Math.min(w - 32, 520);
    const cardH = Math.min(h - 32, 440);
    const cx = w / 2;
    const top = (h - cardH) / 2;
    frame(this, 'button-brown', cx, h / 2, cardW, cardH).setAlpha(0.95);

    const big = Math.min(56, cardW / 9);
    let y = top + cardH * 0.1;
    text(this, cx, y, 'END OF THE LINE', big * 0.75, COLORS.gold, { fontStyle: 'bold' }).setOrigin(0.5, 0);
    y += big * 0.75 + 10;
    text(this, cx, y, reason, 16, COLORS.textDim, { align: 'center', wordWrap: { width: cardW - 32 } }).setOrigin(0.5, 0);
    y += 40;
    text(this, cx, y, 'DISTANCE TRAVELLED', 13, COLORS.textDim).setOrigin(0.5, 0);
    y += 20;
    text(this, cx, y, `${(distance / 1000).toFixed(2)} km`, big, '#ffffff', { fontStyle: 'bold' }).setOrigin(0.5, 0);
    y += big + 8;
    text(this, cx, y, this.isRecord ? 'New best!' : `Best: ${(this.best / 1000).toFixed(2)} km`, 16, this.isRecord ? COLORS.good : COLORS.textDim, {
      fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    y += 32;
    const lines = [`Stops made: ${stats.stops}`, `Passengers delivered: ${stats.passengersDelivered}`, `Money earned: £${Math.round(stats.earned)}`];
    text(this, cx, y, cardW > 460 ? lines.join('     ') : lines.join('\n'), 14, COLORS.text, { align: 'center', lineSpacing: 4 }).setOrigin(0.5, 0);

    const btnY = top + cardH - 52;
    new Button(this, cx, btnY, {
      width: Math.min(260, cardW - 40),
      height: 54,
      fontSize: 22,
      align: 'center',
      label: 'Restart  ↻',
      skin: 'green',
      onClick: () => this.scene.start('Game'),
    });
    if (!isTouch(this)) text(this, cx, btnY + 36, 'or press Space / Enter', 12, COLORS.textDim).setOrigin(0.5, 0);
  }
}

function readBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}
function writeBest(v) {
  try {
    localStorage.setItem(BEST_KEY, String(v));
  } catch {
    /* storage unavailable */
  }
}
