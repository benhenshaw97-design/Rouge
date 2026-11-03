import Phaser from 'phaser';
import { AUDIO, IMAGES, LATER_IMAGES, PIXEL_PERFECT } from '../config/assets.js';
import { loadLaterImages } from '../systems/BackgroundLoader.js';
import { COLORS, PARALLAX_LAYERS, RAIL_Y, TRAIN_LAYOUT } from '../config/display.js';
import { AudioManager } from '../systems/AudioManager.js';
import { music } from '../systems/MusicPlayer.js';
import { cssSize, isTouch, uiScale } from '../systems/Viewport.js';
import { text } from '../ui/kit.js';

/**
 * Loads the assets listed in config/assets.js that the start needs, then shows the title screen
 * (other areas' art carries on loading in the background).
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    const W = this.scale.width;
    const H = this.scale.height;
    const u = uiScale(this);
    const barW = Math.min(W * 0.6, 400 * u);
    this.add.rectangle(W / 2, H / 2, barW + 4 * u, 18 * u).setStrokeStyle(2 * u, COLORS.brass);
    const bar = this.add.rectangle(W / 2 - barW / 2, H / 2, 0, 12 * u, 0xa8323a).setOrigin(0, 0.5);
    this.load.on('progress', (p) => (bar.width = barW * p));
    this.load.on('loaderror', (file) => console.warn(`[assets] Could not load "${file.key}" from ${file.url}`));

    for (const [key, path] of Object.entries(IMAGES)) {
      if (LATER_IMAGES.includes(key)) continue;
      if (path.toLowerCase().endsWith('.svg')) this.load.svg(key, path);
      else this.load.image(key, path);
    }
    for (const [key, path] of Object.entries(AUDIO)) this.load.audio(key, path);
  }

  create() {
    for (const key of PIXEL_PERFECT) {
      if (this.textures.exists(key)) this.textures.get(key).setFilter(Phaser.Textures.FilterMode.NEAREST);
    }

    this.load.off('progress'); // (the bar is gone once the title shows)
    loadLaterImages(this);

    this.started = false;
    const start = () => {
      if (this.started) return;
      this.started = true;
      // Inside the tap/click, so phones allow the music to start (with the saved mute setting).
      new AudioManager(this);
      music.start();
      this.scene.start('Game');
    };
    this.input.on('pointerup', start);
    this.input.keyboard?.on('keydown', start);

    const onResize = () => this.buildTitle();
    this.scale.on('resize', onResize);
    this.events.once('shutdown', () => this.scale.off('resize', onResize));

    // Wait (briefly) for the pixel font so the title isn't drawn in a fallback face.
    waitForFont().then(() => {
      if (!this.started) this.buildTitle();
    });
  }

  buildTitle() {
    this.tweens.killAll();
    this.children.removeAll(true);
    const u = uiScale(this);
    this.cameras.main.setOrigin(0, 0).setZoom(u).setScroll(0, 0);
    const { w, h } = cssSize(this);

    // Scenery: the game's own layers, scaled to fit the bottom of the screen.
    this.add.image(0, 0, 'sky').setOrigin(0).setDisplaySize(w, h);
    const trainLength = TRAIN_LAYOUT.cars.reduce((n, c) => n + c.width, 0);
    const s = Math.min(h / 720, (w - 24) / (trainLength + 40));
    const scenery = this.add.container(w / 2, h * 0.86 - RAIL_Y * s).setScale(s);
    for (const cfg of PARALLAX_LAYERS) {
      if (cfg.tile === false || cfg.key === 'foreground') continue;
      const tex = this.textures.get(cfg.key).getSourceImage();
      const ts = (cfg.tileHeight ?? cfg.height) / tex.height;
      const span = (w / s) * 1.2 + 400;
      const t = this.add.tileSprite(-span / 2, cfg.y, span, cfg.height, cfg.key).setOrigin(0, 0).setTileScale(ts, ts);
      t.tilePositionX = 300;
      scenery.add(t);
      if (cfg.key === 'clouds') this.clouds = t;
    }
    // The train standing at the line.
    let x = -trainLength / 2;
    for (const car of TRAIN_LAYOUT.cars) {
      const top = RAIL_Y - car.railY;
      scenery.add(this.add.image(x, top, car.key).setOrigin(0, 0).setDisplaySize(car.width, car.height));
      if (car.heap) {
        scenery.add(
          this.add
            .image(x + car.heap.x, top + car.heap.bottom, car.heap.key)
            .setOrigin(0, 1)
            .setDisplaySize(car.heap.w, car.heap.h)
            .setDepth(-1),
        );
      }
      for (const wl of car.wheels) scenery.add(this.add.image(x + wl.x, top + wl.y, 'wheel').setDisplaySize(wl.r * 2, wl.r * 2));
      x += car.width + TRAIN_LAYOUT.gap;
    }
    scenery.sort('depth');
    this.add.rectangle(0, 0, w, h, 0x15110d, 0.25).setOrigin(0);

    // Title
    const titleSize = Math.round(Math.min(w / 5, h / 5, 120));
    text(this, w / 2, h * 0.17, 'ROUGE', titleSize, COLORS.gold, { fontStyle: 'bold' })
      .setOrigin(0.5)
      .setShadow(4, 4, '#5a1d22', 0, false, true);
    text(this, w / 2, h * 0.17 + titleSize * 0.62, 'Keep the fire burning. Choose your stops wisely.', Math.min(20, w / 22), COLORS.text, {
      align: 'center',
      wordWrap: { width: w - 32 },
    })
      .setOrigin(0.5, 0)
      .setShadow(2, 2, '#000000', 2, false, true);

    const touch = isTouch(this);
    const prompt = text(this, w / 2, h * 0.44, touch ? 'Tap to start' : 'Click or press any key to start', Math.min(28, w / 14), '#ffffff', {
      fontStyle: 'bold',
      backgroundColor: '#1d1612cc',
      padding: { x: 16, y: 8 },
    }).setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.45, duration: 700, yoyo: true, repeat: -1 });

    if (!touch && h > 520) {
      text(this, w / 2, h * 0.44 + 46, 'At junctions, click a signpost or press 1 / 2.   Space: depart.   M: mute', 14, COLORS.text, {
        backgroundColor: '#1d1612aa',
        padding: { x: 10, y: 4 },
      }).setOrigin(0.5);
    }
  }

  update(time, delta) {
    if (this.clouds?.active) this.clouds.tilePositionX += delta * 0.01;
  }
}

function waitForFont() {
  if (!document.fonts?.load) return Promise.resolve();
  const timeout = new Promise((resolve) => setTimeout(resolve, 1500));
  return Promise.race([document.fonts.load('bold 20px "Pixelify Sans"').catch(() => {}), timeout]);
}
