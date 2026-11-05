import Phaser from 'phaser';
import { AUDIO, IMAGES, LATER_IMAGES, PIXEL_PERFECT } from '../config/assets.js';
import { loadLaterImages } from '../systems/BackgroundLoader.js';
import { COLORS, PARALLAX_LAYERS, RAIL_Y, TRAIN_LAYOUT } from '../config/display.js';
import { AudioManager } from '../systems/AudioManager.js';
import { music } from '../systems/MusicPlayer.js';
import { cssSize, isTouch, uiScale } from '../systems/Viewport.js';
import { frame, text } from '../ui/kit.js';
import { Button } from '../ui/Button.js';
import { RadioPanel } from '../ui/RadioPanel.js';
import { describeSave, readSave } from '../state/save.js';
import { readBest } from '../state/best.js';

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
    /** Starts a new run, or carries on a saved one (`resume`, from state/save.js). */
    const start = (resume = null) => {
      if (this.started) return;
      this.started = true;
      // Inside the tap/click, so phones allow the music to start (with the saved mute setting).
      new AudioManager(this);
      music.start();
      this.scene.start('Game', { resume });
    };
    this.startRun = start;
    // Enter / Space: carry on the saved run if there is one, else a new one.
    const primary = () => {
      if (this.help || this.settings) return;
      start(readSave());
    };
    this.input.keyboard?.on('keydown-ENTER', primary);
    this.input.keyboard?.on('keydown-SPACE', primary);
    this.input.keyboard?.on('keydown-H', () => this.toggleHelp());
    this.input.keyboard?.on('keydown-ESC', () => {
      if (this.help) this.toggleHelp();
      if (this.settings) this.toggleSettings();
    });

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
    this.settings?.panel.destroy();
    this.settings = null;
    this.children.removeAll(true);
    this.help = null;
    const u = uiScale(this);
    this.cameras.main.setOrigin(0, 0).setZoom(u).setScroll(0, 0);
    const { w, h } = cssSize(this);
    const portrait = h > w;

    // --- Scenery: the game's own layers (sky included, so nothing is stretched), scaled to
    // fill the screen's height on wide screens; on upright phones it fills the lower half and
    // the menu sits in the sky above.
    const trainLength = TRAIN_LAYOUT.cars.reduce((n, c) => n + c.width, 0);
    const s = Math.min(h / 720, Math.max(w / (trainLength + 60), w / 700));
    const viewW = w / s;
    const scenery = this.add.container(0, h - 720 * s).setScale(s);
    this.layers = [];
    for (const cfg of PARALLAX_LAYERS) {
      if (cfg.key === 'foreground') continue;
      if (cfg.tile === false) {
        scenery.add(this.add.image(-50, cfg.y, cfg.key).setOrigin(0).setDisplaySize(viewW + 100, cfg.height));
        continue;
      }
      const tex = this.textures.get(cfg.key).getSourceImage();
      const ts = (cfg.tileHeight ?? cfg.height) / tex.height;
      const t = this.add.tileSprite(-50, cfg.y, viewW + 100, cfg.height, cfg.key).setOrigin(0, 0).setTileScale(ts, ts);
      t.tilePositionX = 300 / ts;
      scenery.add(t);
      this.layers.push({ t, factor: cfg.factor, drift: cfg.drift ?? 0, ts });
    }

    // The train steaming along (the scenery scrolls past; the wheels turn).
    const front = Math.min(viewW / 2 + trainLength / 2, viewW - 30);
    let x = front - trainLength;
    this.wheels = [];
    const cars = [];
    for (const car of TRAIN_LAYOUT.cars) {
      const top = RAIL_Y - car.railY;
      if (car.heap) {
        cars.push(
          this.add.image(x + car.heap.x, top + car.heap.bottom, car.heap.key).setOrigin(0, 1).setDisplaySize(car.heap.w, car.heap.h),
        );
      }
      cars.push(this.add.image(x, top, car.key).setOrigin(0, 0).setDisplaySize(car.width, car.height));
      for (const wl of car.wheels) {
        const wheel = this.add.image(x + wl.x, top + wl.y, 'wheel').setDisplaySize(wl.r * 2, wl.r * 2);
        cars.push(wheel);
        this.wheels.push({ wheel, r: wl.r });
      }
      if (car.key === 'locomotive') this.chimney = { x: x + car.width * 0.78, y: top + 6 };
      x += car.width + TRAIN_LAYOUT.gap;
    }
    scenery.add(cars);
    // Smoke from the chimney.
    if (this.chimney && this.textures.exists('smoke')) {
      const smoke = this.add.particles(this.chimney.x, this.chimney.y, 'smoke', {
        speedX: { min: -70, max: -40 },
        speedY: { min: -40, max: -20 },
        scale: { start: 0.25, end: 0.9 },
        alpha: { start: 0.7, end: 0 },
        lifespan: 2200,
        frequency: 160,
      });
      scenery.add(smoke);
    }
    // Shade the top so the title reads against bright sky.
    const shade = this.add.graphics();
    shade.fillGradientStyle(0x15110d, 0x15110d, 0x15110d, 0x15110d, 0.55, 0.55, 0, 0);
    shade.fillRect(0, 0, w, h * (portrait ? 0.6 : 0.5));

    // --- Title
    const titleSize = Math.round(Math.min(w / 4.6, h / (portrait ? 7 : 5.6), 120));
    const titleY = portrait ? h * 0.11 : Math.max(titleSize * 0.55 + 8, h * 0.13);
    text(this, w / 2, titleY, 'ROUGE', titleSize, COLORS.gold, { fontStyle: 'bold' })
      .setOrigin(0.5)
      .setShadow(4, 5, '#5a1d22', 0, false, true);
    text(this, w / 2, titleY + titleSize * 0.6, 'Keep the fire burning. Choose your stops wisely.', Math.min(19, w / 22), COLORS.text, {
      align: 'center',
      wordWrap: { width: w - 40 },
    })
      .setOrigin(0.5, 0)
      .setShadow(2, 2, '#000000', 2, false, true);

    // --- Menu panel: Continue (if a run is saved), New run, How to play, Settings. Stacked;
    // in a 2×2 grid on short, wide screens so the train still shows.
    const best = readBest();
    const save = readSave();
    const wide = !portrait && h < 560;
    const keys = !isTouch(this) && !wide;
    const cols = wide ? 2 : 1;
    const bw = wide ? Math.min(220, (w - 100) / 2) : Math.min(280, w - 48);
    const items = [];
    if (save) items.push({ label: 'Continue  ▶', sub: describeSave(save), skin: 'green', big: true, run: () => this.startRun(save) });
    items.push({ label: save ? 'New run' : 'Start  ▶', skin: save ? 'gold' : 'green', big: !save, run: () => this.startRun(null) });
    items.push({ label: 'How to play', skin: 'gold', run: () => this.toggleHelp() });
    items.push({ label: 'Settings', skin: 'gold', run: () => this.toggleSettings() });
    const bigH = wide ? 46 : 54;
    const smallH = wide ? 40 : 42;
    const gap = wide ? 8 : 10;
    const rows = [];
    for (let i = 0; i < items.length; i += cols) rows.push(items.slice(i, i + cols));
    const rowH = (row) => (row.some((it) => it.big) ? bigH : smallH);
    const buttonsH = rows.reduce((n, r) => n + rowH(r), 0) + gap * (rows.length - 1);
    const panelW = cols * bw + (cols - 1) * 12 + 40;
    const footer = (best > 0 ? 22 : 0) + (keys ? 18 : 0);
    const panelH = 20 + buttonsH + (footer ? 10 + footer : 0) + 16;
    const panelY = titleY + titleSize * 0.6 + (wide ? 28 : 44);
    frame(this, 'button-brown', w / 2, panelY + panelH / 2, panelW, panelH).setAlpha(0.94);
    let y = panelY + 20;
    for (const row of rows) {
      const rh = rowH(row);
      row.forEach((it, i) => {
        const x = w / 2 + (i - (row.length - 1) / 2) * (bw + 12);
        const btn = new Button(this, x, y + rh / 2, {
          width: bw,
          height: rh,
          fontSize: it.big ? 21 : 16,
          align: 'center',
          label: it.label,
          sublabel: it.sub && !wide ? it.sub : undefined,
          skin: it.skin,
        });
        // (Run straight from the tap, not a frame later, so phones allow the music to play.)
        btn.on('pointerup', () => it.run());
        if (it.skin === 'green') this.tweens.add({ targets: btn, scale: 1.03, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      });
      y += rh + gap;
    }
    y += 6 - gap + 10;
    if (best > 0) {
      text(this, w / 2, y + 8, `Best run: ${(best / 1000).toFixed(2)} km`, 15, COLORS.gold, { fontStyle: 'bold' }).setOrigin(0.5);
      y += 22;
    }
    if (keys) text(this, w / 2, y + 6, `Enter: ${save ? 'continue' : 'start'}   ·   H: how to play`, 12, COLORS.textDim).setOrigin(0.5);
    if (this.settingsOpen) this.toggleSettings(true);
  }

  /** The radio and volume settings (the in-game radio panel), over the title screen. */
  toggleSettings(reopen = false) {
    if (this.started) return;
    if (this.settings && !reopen) {
      this.settings.panel.destroy();
      this.settings.dim.destroy();
      this.settings = null;
      this.settingsOpen = false;
      return;
    }
    this.settings?.panel.destroy();
    this.settings?.dim.destroy();
    const { w, h } = cssSize(this);
    const pw = Math.min(330, w - 20);
    const dim = this.add.rectangle(0, 0, w, h, 0x0d0a08, 0.6).setOrigin(0).setDepth(44).setInteractive();
    dim.on('pointerup', () => this.toggleSettings());
    // (RadioPanel opens above-right of its anchor; anchor it so the panel is centred.)
    const panel = new RadioPanel(this, { x: (w - pw) / 2 + 22, y: Math.min(h - 10, (h + 290) / 2 + 30), dir: 1 }, { onClose: () => this.toggleSettings() });
    this.settings = { panel, dim };
    this.settingsOpen = true;
  }

  /** A short how-to-play card over the title screen. */
  toggleHelp() {
    if (this.started) return;
    if (this.help) {
      this.help.forEach((o) => o.destroy());
      this.help = null;
      return;
    }
    const { w, h } = cssSize(this);
    const touch = isTouch(this);
    const lines = [
      ['Keep moving', 'The train burns fuel and water as it goes. Run dry and you’re stranded (a relief engine can help).'],
      ['Choose your stops', `Signposts rise before each junction. ${touch ? 'Tap' : 'Click (or press 1 / 2)'} the one you want, or plan ahead on the map.`],
      ['At a stop', 'Buy coal, fill the boiler, pick up passengers and cargo, repair and upgrade. Then depart.'],
      ['Mind the boiler', 'Heat climbs at speed and fast with no water. Overheat and you crawl until it cools.'],
      ['Explore', 'Tunnels lead to new lands. Events happen on the line, and objectives pay out.'],
    ];
    const cw = Math.min(520, w - 32);
    const objs = [];
    objs.push(this.add.rectangle(0, 0, w, h, 0x0d0a08, 0.7).setOrigin(0).setInteractive().on('pointerup', () => this.toggleHelp()));
    const items = lines.map(([head, body]) => [
      text(this, 0, 0, head, 17, COLORS.gold, { fontStyle: 'bold' }),
      text(this, 0, 0, body, 14, COLORS.text, { wordWrap: { width: cw - 40 }, lineSpacing: 2 }),
    ]);
    const contentH = items.reduce((n, [a, b]) => n + a.height + b.height + 14, 0);
    const ch = Math.min(h - 24, contentH + 120);
    const cy = (h - ch) / 2;
    objs.push(frame(this, 'button-brown', w / 2, h / 2, cw, ch).setAlpha(0.97));
    objs.push(text(this, w / 2, cy + 16, 'HOW TO PLAY', 20, COLORS.gold, { fontStyle: 'bold' }).setOrigin(0.5, 0));
    let y = cy + 52;
    for (const [a, b] of items) {
      a.setPosition(w / 2 - cw / 2 + 20, y).setDepth(1);
      y += a.height + 2;
      b.setPosition(w / 2 - cw / 2 + 20, y).setDepth(1);
      y += b.height + 12;
      objs.push(a, b);
    }
    objs.push(new Button(this, w / 2, cy + ch - 34, { width: 180, height: 44, fontSize: 17, align: 'center', label: 'Got it', skin: 'green', onClick: () => this.toggleHelp() }));
    objs.forEach((o) => o.setDepth(20 + o.depth));
    for (const [a, b] of items) {
      a.setDepth(22);
      b.setDepth(22);
    }
    this.help = objs;
  }

  update(time, delta) {
    if (!this.layers) return;
    // Steam along at a gentle pace.
    const px = delta * 0.12;
    for (const l of this.layers) {
      if (l.t.active) l.t.tilePositionX += (px * l.factor + (l.drift * delta) / 1000) / l.ts;
    }
    for (const { wheel, r } of this.wheels ?? []) if (wheel.active) wheel.rotation += px / r;
  }
}

function waitForFont() {
  if (!document.fonts?.load) return Promise.resolve();
  const timeout = new Promise((resolve) => setTimeout(resolve, 1500));
  return Promise.race([document.fonts.load('bold 20px "Pixelify Sans"').catch(() => {}), timeout]);
}
