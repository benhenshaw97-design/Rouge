import { BALANCE } from '../config/balance.js';
import { COLORS } from '../config/display.js';
import { HUD_METRICS as M } from '../systems/Viewport.js';
import { frame, text } from './kit.js';

const GAUGES = [
  { id: 'fuel', icon: 'icon-fuel', label: 'Fuel', color: COLORS.fuel },
  { id: 'water', icon: 'icon-water', label: 'Water', color: COLORS.water },
  { id: 'heat', icon: 'icon-heat', label: 'Heat', color: COLORS.heat },
  { id: 'condition', icon: 'icon-condition', label: 'Condition', color: COLORS.condition },
];
const COUNTERS = [
  { id: 'money', icon: 'icon-money' },
  { id: 'passengers', icon: 'icon-passengers' },
  { id: 'cargo', icon: 'icon-cargo' },
  { id: 'distance', icon: 'icon-distance' },
];

/**
 * Gauges (fuel, water, heat, condition) and counters (money, passengers, cargo, distance).
 * spec comes from computeLayout(): style 'panel' (desktop) or 'strip' (phones). CSS px.
 * Reads TrainState every frame; never changes it.
 */
export class Hud {
  constructor(scene, spec, state) {
    this.scene = scene;
    this.state = state;
    const { x, y, w, h } = spec;
    const panel = spec.style === 'panel';

    this.frame = frame(scene, 'button-brown', x + w / 2, y + h / 2, w, h).setAlpha(0.94);

    // --- Gauges ---------------------------------------------------------------------------------
    const cols = panel ? 1 : spec.gaugeCols;
    const rowH = panel ? M.panelGaugeRow : M.gaugeRow;
    const innerW = w - M.padX * 2;
    const cellGap = 12;
    const cellW = (innerW - cellGap * (cols - 1)) / cols;
    const iconSize = panel ? 22 : 18;
    const labelW = panel ? 74 : 0;
    const valueW = panel ? 56 : 46;
    const fontSize = panel ? 15 : 13;
    this.gauges = {};

    GAUGES.forEach((g, i) => {
      const cx = x + M.padX + (i % cols) * (cellW + cellGap);
      const cy = y + M.padY + Math.floor(i / cols) * rowH + rowH / 2;
      scene.add.image(cx + iconSize / 2, cy, g.icon).setDisplaySize(iconSize, iconSize);
      if (panel) text(scene, cx + iconSize + 6, cy, g.label, fontSize).setOrigin(0, 0.5);
      const barX = cx + iconSize + 6 + labelW;
      const barW = Math.max(30, cellW - (barX - cx) - valueW - 4);
      const barH = panel ? 12 : 10;
      scene.add.rectangle(barX, cy, barW, barH, COLORS.trough, 0.9).setOrigin(0, 0.5).setStrokeStyle(1, 0x6b5a45);
      const fill = scene.add.rectangle(barX + 1, cy, barW - 2, barH - 2, g.color).setOrigin(0, 0.5);
      const value = text(scene, cx + cellW, cy, '', fontSize).setOrigin(1, 0.5);
      this.gauges[g.id] = { fill, value, color: g.color, barW: barW - 2 };
    });

    // --- Counters -------------------------------------------------------------------------------
    const gaugeRows = Math.ceil(GAUGES.length / cols);
    const cCols = panel ? 2 : spec.counterCols;
    const cRowH = panel ? M.panelCounterRow : M.counterRow;
    const top = y + M.padY + gaugeRows * rowH + (panel ? 10 : 6);
    const cW = innerW / cCols;
    const cIcon = panel ? 24 : 20;
    this.counters = {};
    COUNTERS.forEach((c, i) => {
      const cx = x + M.padX + (i % cCols) * cW;
      const cy = top + Math.floor(i / cCols) * cRowH + cRowH / 2;
      scene.add.image(cx + cIcon / 2, cy, c.icon).setDisplaySize(cIcon, cIcon);
      this.counters[c.id] = text(scene, cx + cIcon + 6, cy, '', panel ? 18 : 15, COLORS.text, { fontStyle: 'bold' }).setOrigin(0, 0.5);
    });

    if (panel) {
      this.speedText = text(scene, x + M.padX + 2, y + h - M.padY - 12, '', 13, COLORS.textDim).setOrigin(0, 0.5);
    }
  }

  /** @param {number} speed m/s @param {number} time ms */
  update(speed, time) {
    const s = this.state;
    const flash = Math.sin(time * 0.012) > 0;

    const low = s.isLowFuel;
    this.setGauge('fuel', s.fuel / s.fuelCapacity, `${Math.ceil(s.fuel)}/${s.fuelCapacity}`);
    this.gauges.fuel.fill.setFillStyle(low ? COLORS.danger : this.gauges.fuel.color).setAlpha(low && flash ? 0.4 : 1);
    this.gauges.fuel.value.setColor(low ? COLORS.bad : COLORS.text);

    this.setGauge('water', s.water / s.waterCapacity, `${Math.round(s.water)}%`);
    this.gauges.water.value.setColor(s.water <= 0 ? COLORS.bad : COLORS.text);

    const heatFrac = s.heat / BALANCE.heat.max;
    this.setGauge('heat', heatFrac, s.overheated ? 'HOT!' : `${Math.round(s.heat)}%`);
    this.gauges.heat.fill.setFillStyle(heatFrac > 0.8 || s.overheated ? COLORS.danger : this.gauges.heat.color);
    this.gauges.heat.fill.setAlpha(s.overheated && flash ? 0.4 : 1);
    this.gauges.heat.value.setColor(s.overheated ? COLORS.bad : COLORS.text);

    this.setGauge('condition', s.condition / BALANCE.condition.max, `${Math.round(s.condition)}%`);

    this.counters.money.setText(`£${Math.floor(s.money)}`);
    this.counters.passengers.setText(`${s.passengerCount}/${s.passengerCapacity}`);
    this.counters.cargo.setText(`${s.cargo}/${s.cargoCapacity}`);
    this.counters.distance.setText(`${(s.distance / 1000).toFixed(2)} km`);
    this.speedText?.setText(`Speed ${Math.round(speed * 3.6)} km/h  ·  Fuel burn ×${s.burnMultiplier.toFixed(2)}`);
  }

  setGauge(id, frac, label) {
    const g = this.gauges[id];
    g.fill.width = Math.max(0, Math.min(1, frac)) * g.barW;
    g.value.setText(label);
  }
}

/** The most urgent warning to show, or null. */
export function currentWarning(state) {
  if (state.isOutOfFuel) return 'OUT OF FUEL: coasting';
  if (state.isLowFuel) return 'LOW FUEL';
  if (state.overheated) return 'OVERHEATED: speed limited';
  if (state.water <= 0) return 'BOILER DRY: heat rising';
  return null;
}
