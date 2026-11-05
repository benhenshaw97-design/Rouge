import Phaser from 'phaser';
import { COLORS } from '../config/display.js';
import { music } from '../systems/MusicPlayer.js';
import { Button } from './Button.js';
import { frame, roundButton, text } from './kit.js';
import { cssSize } from '../systems/Viewport.js';

/**
 * The in-game radio (RADIO button by the sound controls, or R): tune between stations, skip or
 * go back a track, switch it off, and set the music and effects volumes. The game carries on
 * while it's open. Everything it changes lives in the music player (systems/MusicPlayer.js).
 */
export class RadioPanel {
  /** anchor: { x, y, dir } of the controls row (the panel opens above it). */
  constructor(scene, anchor, { onClose }) {
    this.scene = scene;
    this.anchor = anchor;
    this.onClose = onClose;
    this.objects = [];
    this.unsubscribe = music.onChange(() => this.build());
    this.build();
  }

  destroy() {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.clear();
  }

  clear() {
    this.objects.forEach((o) => o.destroy());
    this.objects = [];
  }

  add(o) {
    this.objects.push(o);
    o.setDepth?.(45);
    return o;
  }

  build() {
    this.clear();
    const { scene, anchor } = this;
    const { w: screenW } = cssSize(scene);
    const w = Math.min(330, screenW - 20);
    const h = 290;
    const x = Math.max(10, Math.min(screenW - 10 - w, anchor.dir > 0 ? anchor.x - 22 : anchor.x + 22 - w));
    const y = Math.max(10, anchor.y - 30 - h);
    const pad = 12;
    const innerW = w - pad * 2;

    // Swallow taps on the panel so they don't fall through to the game.
    this.add(scene.add.rectangle(x, y, w, h, 0, 0.001).setOrigin(0).setInteractive());
    this.add(frame(scene, 'button-brown', x + w / 2, y + h / 2, w, h).setAlpha(0.97));
    let cy = y + pad;
    this.add(text(scene, x + pad, cy, 'RADIO', 16, COLORS.gold, { fontStyle: 'bold' }));
    this.add(this.icon(x + w - pad - 16, cy + 9, 'close', () => this.onClose()));
    cy += 30;

    // Station dial: ◀ [ station / track ] ▶
    const arrowW = 38;
    const dispH = 66;
    const dispX = x + pad + arrowW + 6;
    const dispW = innerW - (arrowW + 6) * 2;
    this.add(this.icon(x + pad + arrowW / 2, cy + dispH / 2, 'left', () => music.changeStation(-1)));
    this.add(this.icon(x + w - pad - arrowW / 2, cy + dispH / 2, 'right', () => music.changeStation(1)));
    this.add(scene.add.rectangle(dispX, cy, dispW, dispH, 0x0d0a08, 0.95).setOrigin(0).setStrokeStyle(2, COLORS.brass, 0.9));
    const st = music.station;
    this.add(text(scene, dispX + dispW / 2, cy + 7, st.name, 15, COLORS.gold, { fontStyle: 'bold' }).setOrigin(0.5, 0));
    this.add(text(scene, dispX + dispW / 2, cy + 26, st.blurb ?? '', 11, COLORS.textDim).setOrigin(0.5, 0));
    const now = !music.el ? 'Plays when you start' : music.playing ? `♪ ${music.title}` : 'Off';
    const nowText = this.add(text(scene, dispX + dispW / 2, cy + 44, now, 13, music.playing ? '#a8f0a0' : COLORS.textDim).setOrigin(0.5, 0));
    if (nowText.width > dispW - 10) nowText.setScale((dispW - 10) / nowText.width);
    cy += dispH + 10;

    // Track controls
    const third = (innerW - 12) / 3;
    const bh = 38;
    const by = cy + bh / 2;
    this.add(this.button(x + pad + third / 2, by, third, bh, 'Previous', () => music.previous()));
    this.add(this.button(x + pad + third * 1.5 + 6, by, third, bh, music.playing ? 'Off' : 'On', () => music.togglePlay(), music.playing ? 'red' : 'green'));
    this.add(this.button(x + pad + third * 2.5 + 12, by, third, bh, 'Next', () => music.next()));
    cy += bh + 12;

    // Volumes
    this.volumeRow(x + pad, cy, innerW, 'Music', music.volume, (v) => music.setVolume(v));
    cy += 36;
    this.volumeRow(x + pad, cy, innerW, 'Effects', music.effectsVolume, (v) => {
      music.setEffectsVolume(v);
      scene.main?.audio.play('click');
    });
    cy += 36;
    this.volumeRow(x + pad, cy, innerW, 'Ambience', music.ambienceVolume, (v) => music.setAmbienceVolume(v));
  }

  button(cx, cy, w, h, label, onClick, skin = 'gold', fontSize = 14) {
    return new Button(this.scene, cx, cy, {
      width: w,
      height: h,
      fontSize,
      align: 'center',
      label,
      skin,
      onClick: () => {
        onClick();
        this.scene.main?.audio.play('click');
      },
    });
  }

  /** A small round brass button with a drawn symbol (text gets too small at this size). */
  icon(cx, cy, kind, onClick) {
    const draw = (g) => {
      g.clear().fillStyle(0xf6ead2, 1).lineStyle(3, 0xf6ead2, 1);
      if (kind === 'minus' || kind === 'plus') g.fillRect(-7, -1.5, 14, 3);
      if (kind === 'plus') g.fillRect(-1.5, -7, 3, 14);
      if (kind === 'left') g.fillTriangle(5, -8, 5, 8, -6, 0);
      if (kind === 'right') g.fillTriangle(-5, -8, -5, 8, 6, 0);
      if (kind === 'close') g.lineBetween(-6, -6, 6, 6).lineBetween(-6, 6, 6, -6);
    };
    return roundButton(this.scene, cx, cy, draw, () => {
      onClick();
      this.scene.main?.audio.play('click');
    });
  }

  /** Label, −, a bar you can tap anywhere along, +. */
  volumeRow(x, y, w, label, value, set) {
    const { scene } = this;
    const labelW = 72;
    const btn = 34;
    this.add(text(scene, x, y + btn / 2, label, 13, COLORS.text).setOrigin(0, 0.5));
    const barX = x + labelW + btn + 6;
    const barW = w - labelW - (btn + 6) * 2;
    const step = (d) => set(Math.round((value + d) * 10) / 10);
    this.add(this.icon(x + labelW + btn / 2, y + btn / 2, 'minus', () => step(-0.1)));
    this.add(this.icon(barX + barW + 6 + btn / 2, y + btn / 2, 'plus', () => step(0.1)));
    const track = this.add(scene.add.rectangle(barX, y + btn / 2, barW, 12, COLORS.trough, 1).setOrigin(0, 0.5).setStrokeStyle(1, COLORS.brass, 0.7));
    this.add(scene.add.rectangle(barX + 1, y + btn / 2, Math.max(0, (barW - 2) * value), 10, COLORS.brass, 1).setOrigin(0, 0.5));
    this.add(text(scene, barX + barW / 2, y + btn / 2, `${Math.round(value * 100)}%`, 11, value > 0.55 ? COLORS.textDark : COLORS.text, { fontStyle: 'bold' }).setOrigin(0.5));
    // Tap along the bar to set it (a bit taller than it looks, for fingers).
    track.setInteractive(new Phaser.Geom.Rectangle(0, -8, barW, 28), Phaser.Geom.Rectangle.Contains);
    track.on('pointerdown', (p) => {
      const local = (p.x / scene.cameras.main.zoom - barX) / barW;
      set(Math.round(Math.max(0, Math.min(1, local)) * 20) / 20);
    });
  }
}
