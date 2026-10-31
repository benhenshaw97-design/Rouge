import { BALANCE } from '../config/balance.js';
import { DEPTH, FONT, GAME_HEIGHT, GAME_WIDTH } from '../config/display.js';

const X = 16;
const Y = 16;
const W = 364;
const H = 250;
const BAR_X = X + 132;
const BAR_W = 160;
const BAR_H = 14;

const textStyle = (size, color = '#f5e9d0', bold = false) => ({
  fontFamily: FONT,
  fontSize: `${size}px`,
  color,
  fontStyle: bold ? 'bold' : 'normal',
});

/**
 * Top-left dashboard (gauges plus counters), the big warning banner, and the mute button.
 * Reads TrainState every frame; never changes it.
 */
export class Hud {
  constructor(scene, state, audio) {
    this.scene = scene;
    this.state = state;
    this.audio = audio;
    const add = scene.add;

    add
      .graphics()
      .setDepth(DEPTH.hud)
      .fillStyle(0x1d1814, 0.84)
      .fillRoundedRect(X, Y, W, H, 12)
      .lineStyle(2, 0xd6a84a, 0.55)
      .strokeRoundedRect(X, Y, W, H, 12);

    // --- Gauges --------------------------------------------------------------------------------
    this.gauges = {};
    const gauges = [
      ['fuel', 'icon-fuel', 'Fuel', 0xe39b2d],
      ['water', 'icon-water', 'Water', 0x3f8fd8],
      ['heat', 'icon-heat', 'Boiler heat', 0xe0782d],
      ['condition', 'icon-condition', 'Condition', 0x6dbb5a],
    ];
    gauges.forEach(([id, icon, label, color], i) => {
      const y = Y + 26 + i * 30;
      add.image(X + 22, y, icon).setDisplaySize(22, 22).setDepth(DEPTH.hud);
      add.text(X + 40, y, label, textStyle(15)).setOrigin(0, 0.5).setDepth(DEPTH.hud);
      add.rectangle(BAR_X, y, BAR_W, BAR_H, 0x000000, 0.5).setOrigin(0, 0.5).setDepth(DEPTH.hud).setStrokeStyle(1, 0x6b5a45);
      const fill = add.rectangle(BAR_X, y, BAR_W, BAR_H, color).setOrigin(0, 0.5).setDepth(DEPTH.hud);
      const value = add.text(BAR_X + BAR_W + 8, y, '', textStyle(14)).setOrigin(0, 0.5).setDepth(DEPTH.hud);
      this.gauges[id] = { fill, value, color };
    });

    // --- Counters ------------------------------------------------------------------------------
    const counters = [
      ['money', 'icon-money', 0, 0],
      ['passengers', 'icon-passengers', 1, 0],
      ['cargo', 'icon-cargo', 0, 1],
      ['distance', 'icon-distance', 1, 1],
    ];
    this.counters = {};
    const sepY = Y + 142;
    add.rectangle(X + 14, sepY, W - 28, 1, 0xd6a84a, 0.35).setOrigin(0, 0.5).setDepth(DEPTH.hud);
    for (const [id, icon, col, row] of counters) {
      const cx = X + 22 + col * 172;
      const cy = sepY + 24 + row * 32;
      add.image(cx, cy, icon).setDisplaySize(24, 24).setDepth(DEPTH.hud);
      this.counters[id] = add.text(cx + 18, cy, '', textStyle(18, '#f5e9d0', true)).setOrigin(0, 0.5).setDepth(DEPTH.hud);
    }
    this.speedText = add.text(X + 14, Y + H - 16, '', textStyle(14, '#c9b48e')).setOrigin(0, 0.5).setDepth(DEPTH.hud);

    // --- Warning banner (top centre) -------------------------------------------------------
    this.warning = add
      .text(580, 40, '', {
        ...textStyle(26, '#ffffff', true),
        backgroundColor: '#b3261e',
        padding: { x: 16, y: 6 },
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.overlay)
      .setVisible(false);

    // --- Mute button (bottom right) ----------------------------------------------------------
    const mx = GAME_WIDTH - 36;
    const my = GAME_HEIGHT - 36;
    this.muteBg = add.circle(mx, my, 20, 0x1d1814, 0.8).setStrokeStyle(2, 0xd6a84a, 0.7).setDepth(DEPTH.hud);
    this.muteIcon = add.text(mx, my, '♪', textStyle(22, '#f5e9d0', true)).setOrigin(0.5).setDepth(DEPTH.hud);
    this.muteSlash = add.rectangle(mx, my, 34, 3, 0xe05a4f).setRotation(-0.8).setDepth(DEPTH.hud);
    this.muteBg.setInteractive({ useHandCursor: true }).on('pointerup', () => this.toggleMute());
    scene.input.keyboard?.on('keydown-M', () => this.toggleMute());
    this.refreshMute();
  }

  toggleMute() {
    this.audio.toggleMute();
    this.refreshMute();
  }

  refreshMute() {
    this.muteSlash.setVisible(this.audio.muted);
    this.muteIcon.setAlpha(this.audio.muted ? 0.5 : 1);
  }

  /** @param {number} speed m/s @param {number} time ms */
  update(speed, time) {
    const s = this.state;
    const flash = Math.sin(time * 0.012) > 0;

    // Fuel: turns red and flashes when low.
    const low = s.isLowFuel;
    this.setGauge('fuel', s.fuel / s.fuelCapacity, `${Math.ceil(s.fuel)}/${s.fuelCapacity}`);
    this.gauges.fuel.fill.setFillStyle(low ? 0xe0352b : this.gauges.fuel.color).setAlpha(low && flash ? 0.45 : 1);
    this.gauges.fuel.value.setColor(low ? '#ff7a6e' : '#f5e9d0');

    this.setGauge('water', s.water / s.waterCapacity, `${Math.round(s.water)}%`);
    this.gauges.water.value.setColor(s.water <= 0 ? '#ff7a6e' : '#f5e9d0');

    const heatFrac = s.heat / BALANCE.heat.max;
    this.setGauge('heat', heatFrac, s.overheated ? 'HOT!' : `${Math.round(s.heat)}%`);
    this.gauges.heat.fill.setFillStyle(heatFrac > 0.8 || s.overheated ? 0xe0352b : this.gauges.heat.color);
    this.gauges.heat.fill.setAlpha(s.overheated && flash ? 0.45 : 1);
    this.gauges.heat.value.setColor(s.overheated ? '#ff7a6e' : '#f5e9d0');

    this.setGauge('condition', s.condition / BALANCE.condition.max, `${Math.round(s.condition)}%`);

    this.counters.money.setText(`£${Math.floor(s.money)}`);
    this.counters.passengers.setText(`${s.passengerCount}/${s.passengerCapacity}`);
    this.counters.cargo.setText(`${s.cargo}/${s.cargoCapacity}`);
    this.counters.distance.setText(`${(s.distance / 1000).toFixed(2)} km`);
    this.speedText.setText(`Speed ${Math.round(speed * 3.6)} km/h   ·   Fuel burn ×${s.burnMultiplier.toFixed(2)}`);

    // Banner: most urgent problem wins.
    let banner = null;
    if (s.isOutOfFuel) banner = 'OUT OF FUEL: coasting';
    else if (low) banner = 'LOW FUEL';
    else if (s.overheated) banner = 'BOILER OVERHEATED: speed limited';
    else if (s.water <= 0) banner = 'BOILER DRY: heat rising fast';
    this.warning.setVisible(!!banner);
    if (banner) {
      this.warning.setText(banner);
      this.warning.setAlpha(0.75 + 0.25 * Math.sin(time * 0.01));
    }
  }

  setGauge(id, frac, label) {
    const g = this.gauges[id];
    g.fill.width = Math.max(0, Math.min(1, frac)) * BAR_W;
    g.value.setText(label);
  }
}
