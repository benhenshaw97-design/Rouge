import Phaser from 'phaser';
import { AUDIO, IMAGES } from '../config/assets.js';
import { FONT, GAME_HEIGHT, GAME_WIDTH } from '../config/display.js';

/** Loads every asset listed in config/assets.js, then shows a title card. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    this.add.text(cx, cy - 40, 'Loading…', { fontFamily: FONT, fontSize: '22px', color: '#f5e9d0' }).setOrigin(0.5);
    this.add.rectangle(cx, cy, 404, 20).setStrokeStyle(2, 0xd6a84a);
    const bar = this.add.rectangle(cx - 200, cy, 0, 14, 0xa8323a).setOrigin(0, 0.5);
    this.load.on('progress', (p) => (bar.width = 400 * p));
    this.load.on('loaderror', (file) => console.warn(`[assets] Could not load "${file.key}" from ${file.url}`));

    for (const [key, path] of Object.entries(IMAGES)) {
      if (path.toLowerCase().endsWith('.svg')) this.load.svg(key, path);
      else this.load.image(key, path);
    }
    for (const [key, path] of Object.entries(AUDIO)) this.load.audio(key, path);
  }

  create() {
    this.children.removeAll(true);
    const cx = GAME_WIDTH / 2;
    if (this.textures.exists('sky')) this.add.image(0, 0, 'sky').setOrigin(0).setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x15110d, 0.55).setOrigin(0);

    this.add
      .text(cx, 230, 'ROUGE', { fontFamily: FONT, fontSize: '96px', fontStyle: 'bold', color: '#ffd98a' })
      .setOrigin(0.5)
      .setShadow(4, 4, '#5a1d22', 0, false, true);
    this.add
      .text(cx, 310, 'Keep the fire burning. Choose your stops wisely.', { fontFamily: FONT, fontSize: '24px', color: '#f5e9d0' })
      .setOrigin(0.5);

    const help = [
      'Click a signpost (or press 1 / 2) to set the points at each junction',
      'Space / Enter: depart from a stop      M: mute',
    ];
    this.add
      .text(cx, 400, help.join('\n'), { fontFamily: FONT, fontSize: '18px', color: '#c9b48e', align: 'center', lineSpacing: 8 })
      .setOrigin(0.5);

    const prompt = this.add
      .text(cx, 520, 'Click or press any key to start', { fontFamily: FONT, fontSize: '28px', fontStyle: 'bold', color: '#ffffff' })
      .setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.35, duration: 700, yoyo: true, repeat: -1 });

    const start = () => this.scene.start('Game');
    this.input.once('pointerup', start);
    this.input.keyboard?.once('keydown', start);
  }
}
