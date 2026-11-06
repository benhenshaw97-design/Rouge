import { BALANCE, LIVERIES, POI_TYPES } from '../config/balance.js';
import { liveries } from '../state/liveries.js';
import { LINES } from '../content/dialogue.js';
import { DEBUG, setGod } from '../config/debug.js';
import { AREAS } from '../config/display.js';
import * as A from './debugActions.js';

/**
 * The debug panel: an HTML side panel over the game (so it can scroll, and has real sliders
 * and drop-downs). Opened by the GOD button, or G / ` on a keyboard.
 *
 * Its contents are the SECTIONS list below: each control is a small object, so adding a tool
 * for a new feature is usually one line here plus an action in debugActions.js.
 *   info     live label/value rows
 *   buttons  [[label, fn], …]
 *   select   a drop-down plus a button that uses the chosen value
 *   slider   { label, min, max, step, get, set, format }
 *   toggle   { label, get, set }
 * Functions get the running GameScene and return a message to show (or null).
 */
const poiOptions = () => Object.entries(POI_TYPES).map(([id, d]) => [id, d.name]);
const areaOptions = () => AREAS.map((a, i) => [String(i), a.name]);

const SECTIONS = [
  {
    title: 'Info',
    open: true,
    controls: [{ type: 'info', rows: A.readout }],
  },
  {
    title: 'Travel',
    open: true,
    controls: [
      { type: 'select', label: 'Go to area', options: areaOptions, button: 'Go', run: (g, v) => A.goToArea(g, +v) },
      {
        type: 'buttons',
        items: [
          ['Tunnel to next area', A.tunnelSoon],
          ['Skip 500 m', (g) => A.skipAhead(g, 500)],
          ['Skip to next', A.skipToNext],
        ],
      },
      {
        type: 'slider',
        label: 'Game speed',
        min: 0.25,
        max: 12,
        step: 0.25,
        get: () => DEBUG.timeScale,
        set: (v) => (DEBUG.timeScale = v),
        format: (v) => `${v}×`,
      },
    ],
  },
  {
    title: 'Stops',
    open: true,
    controls: [
      { type: 'select', label: 'Stop just ahead', options: poiOptions, button: 'Place', run: (g, v) => A.stopHere(g, v) },
      {
        type: 'select2',
        label: 'Next junction offers',
        options: poiOptions,
        button: 'Set',
        run: (g, a, b) => A.forceJunction(g, a, b),
      },
    ],
  },
  {
    title: 'Train',
    controls: [
      { type: 'slider', label: 'Fuel', min: 0, max: 1, step: 0.01, get: (g) => g.state.fuel / g.state.fuelCapacity, set: (v, g) => (g.state.fuel = v * g.state.fuelCapacity), format: pct },
      { type: 'slider', label: 'Water', min: 0, max: 1, step: 0.01, get: (g) => g.state.water / g.state.waterCapacity, set: (v, g) => (g.state.water = v * g.state.waterCapacity), format: pct },
      { type: 'slider', label: 'Heat', min: 0, max: 100, step: 1, get: (g) => g.state.heat, set: (v, g) => (g.state.heat = v), format: (v) => `${Math.round(v)}` },
      { type: 'slider', label: 'Condition', min: 0, max: 100, step: 1, get: (g) => g.state.condition, set: (v, g) => (g.state.condition = v), format: (v) => `${Math.round(v)}%` },
      { type: 'slider', label: 'Money', min: 0, max: 2000, step: 10, get: (g) => g.state.money, set: (v, g) => (g.state.money = v), format: (v) => `£${Math.round(v)}` },
      {
        type: 'buttons',
        items: [
          ['Fill everything', A.fillEverything],
          ['Max upgrades', A.maxUpgrades],
          ['Full of gold', (g) => A.loadCargo(g, 'gold')],
          ['+6 passengers', (g) => A.boardPassengers(g, false)],
          ['+6 to next area', (g) => A.boardPassengers(g, true)],
          ['Clear load', A.clearLoad],
        ],
      },
    ],
  },
  {
    title: 'Look',
    controls: [
      {
        type: 'select',
        label: 'Livery',
        options: () => Object.entries(LIVERIES).map(([id, l]) => [id, l.name]),
        button: 'Paint',
        run: (g, v) => {
          liveries.buy(v);
          g.train.setLivery(v);
          return `Painted ${LIVERIES[v].name}`;
        },
      },
    ],
  },
  {
    title: 'Crew chatter',
    controls: [
      {
        type: 'select',
        label: 'Say a line',
        options: () => Object.keys(LINES).map((k) => [k, k]),
        button: 'Say',
        run: (g, v) => A.sayLine(g, v),
      },
    ],
  },
  {
    title: 'Events',
    controls: [
      { type: 'select', label: 'Line event just ahead', options: A.eventOptions, button: 'Place', run: (g, v) => A.eventHere(g, v) },
      {
        type: 'buttons',
        items: [
          ['Break down', A.breakDown],
          ['Overheat', A.overheat],
          ['Low fuel', A.lowFuel],
          ['Out of fuel', A.runOutOfFuel],
          ['Dry boiler', A.dryBoiler],
          ['Complete objectives', A.completeObjectives],
          ['New objectives', A.newObjectives],
        ],
      },
    ],
  },
  {
    title: 'Cheats',
    controls: [
      { type: 'toggle', label: 'Unlimited fuel & water, cool boiler', get: () => DEBUG.unlimited, set: (v) => (DEBUG.unlimited = v) },
      { type: 'toggle', label: 'No breakdowns', get: () => DEBUG.noBreakdowns, set: (v) => (DEBUG.noBreakdowns = v) },
      { type: 'toggle', label: 'No wear', get: () => DEBUG.noWear, set: (v) => (DEBUG.noWear = v) },
    ],
  },
  {
    title: 'Tuning (until reload)',
    controls: [
      { type: 'note', text: () => `Stop spacing: ${BALANCE.route.junctionDistance.join('–')} m to the junction, then ${BALANCE.route.branchDistance.join('–')} m. Takes effect from the next departure.` },
      { type: 'slider', label: 'Stop spacing', min: 0.25, max: 5, step: 0.05, get: () => A.tuning.spacing, set: (v) => A.setSpacing(v), format: (v) => `${v.toFixed(2)}×` },
      { type: 'slider', label: 'Stops per area', min: 1, max: 8, step: 1, get: (g) => g.route.map.stopsPerArea, set: (v, g) => A.setStopsPerArea(g, v), format: (v) => `${v}` },
    ],
  },
  {
    title: 'View & run',
    controls: [
      { type: 'toggle', label: 'Hide game UI (for screenshots)', get: () => DEBUG.hideUI, set: (v, g) => { DEBUG.hideUI = v; g.ui.cameras.main.setVisible(!v); } },
      { type: 'toggle', label: 'Readout in the corner', get: () => DEBUG.readout, set: (v) => (DEBUG.readout = v) },
      {
        type: 'buttons',
        items: [
          ['Restart run', A.restartRun],
          ['End run', A.endRun],
          ['Reset best', A.resetBest],
          ['God mode off', (g, panel) => {
            panel.close();
            setGod(false);
            g.ui.cameras.main.setVisible(true);
            g.ui.god?.refresh();
            return 'God mode off';
          }],
        ],
      },
    ],
  },
];

function pct(v) {
  return `${Math.round(v * 100)}%`;
}

const CSS = `
.rdbg { position: fixed; top: 0; right: 0; bottom: 0; width: min(360px, 100vw); z-index: 20;
  background: rgba(24, 18, 13, 0.94); color: #f6ead2; border-left: 2px solid #b8893a;
  font: 13px/1.35 system-ui, -apple-system, "Segoe UI", sans-serif; overflow-y: auto;
  padding: env(safe-area-inset-top, 0) 0 env(safe-area-inset-bottom, 0); box-sizing: border-box;
  -webkit-user-select: none; user-select: none; touch-action: pan-y; }
.rdbg[hidden] { display: none; }
/* Upright phones: the game sits at the top, so the panel takes the bottom half. */
@media (orientation: portrait) and (max-width: 700px) {
  .rdbg { top: auto; height: 52vh; width: 100vw; border-left: 0; border-top: 2px solid #b8893a; }
}
.rdbg header { position: sticky; top: 0; display: flex; align-items: center; gap: 8px; padding: 10px 12px;
  background: #2b1f15; border-bottom: 1px solid #5c4326; z-index: 1; }
.rdbg header b { flex: 1; color: #ffd77a; font-size: 15px; letter-spacing: 0.04em; }
.rdbg .msg { padding: 6px 12px; min-height: 18px; color: #a8f0a0; background: #1d1612; border-bottom: 1px solid #3a2a1e; }
.rdbg details { border-bottom: 1px solid #3a2a1e; }
.rdbg summary { padding: 9px 12px; cursor: pointer; color: #ffd77a; font-weight: 600; }
.rdbg .body { padding: 0 12px 10px; display: grid; gap: 8px; }
.rdbg table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
.rdbg td { padding: 2px 0; vertical-align: top; }
.rdbg td:first-child { color: #cbb48c; width: 32%; padding-right: 8px; }
.rdbg .btns { display: flex; flex-wrap: wrap; gap: 6px; }
.rdbg button { font: inherit; color: #f6ead2; background: #4a3522; border: 1px solid #b8893a; border-radius: 4px;
  padding: 7px 10px; cursor: pointer; min-height: 34px; }
.rdbg button:active { background: #6b4c2e; }
.rdbg header button { min-height: 30px; padding: 4px 10px; }
.rdbg .row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.rdbg .row > span { color: #cbb48c; min-width: 84px; }
.rdbg select { font: inherit; color: #f6ead2; background: #2b1f15; border: 1px solid #5c4326; border-radius: 4px;
  padding: 6px; min-height: 34px; flex: 1; min-width: 0; }
.rdbg input[type=range] { flex: 1; accent-color: #d6a84a; min-width: 0; }
.rdbg output { width: 52px; text-align: right; font-variant-numeric: tabular-nums; }
.rdbg label.tog { display: flex; gap: 8px; align-items: center; cursor: pointer; }
.rdbg input[type=checkbox] { width: 18px; height: 18px; accent-color: #d6a84a; }
.rdbg .note { color: #cbb48c; font-size: 12px; }
.rdbg-readout { position: fixed; left: 50%; transform: translateX(-50%); bottom: calc(6px + env(safe-area-inset-bottom, 0));
  z-index: 19; pointer-events: none; background: rgba(24, 18, 13, 0.8); color: #f6ead2; border-radius: 4px;
  font: 11px/1.3 ui-monospace, Menlo, Consolas, monospace; padding: 4px 8px; white-space: pre; }
.rdbg-readout[hidden] { display: none; }
`;

export class DebugPanel {
  /** One panel per page; it finds the current GameScene each time it acts. */
  static get(game) {
    if (!DebugPanel.instance) DebugPanel.instance = new DebugPanel(game);
    return DebugPanel.instance;
  }

  constructor(game) {
    this.game = game;
    const style = document.createElement('style');
    style.textContent = CSS;
    document.head.append(style);

    this.root = el('aside', { className: 'rdbg', hidden: true });
    // Keys typed here (sliders, drop-downs) shouldn't drive the train.
    for (const type of ['keydown', 'keyup']) this.root.addEventListener(type, (e) => e.stopPropagation());
    const close = el('button', { textContent: 'Close ✕', onclick: () => this.close() });
    this.root.append(el('header', {}, [el('b', { textContent: 'DEBUG' }), close]));
    this.msg = el('div', { className: 'msg' });
    this.root.append(this.msg);
    this.refreshers = [];
    for (const section of SECTIONS) this.root.append(this.buildSection(section));
    document.body.append(this.root);

    this.readoutEl = el('div', { className: 'rdbg-readout', hidden: true });
    document.body.append(this.readoutEl);

    setInterval(() => this.refresh(), 250);
  }

  get scene() {
    const g = this.game.scene.getScene('Game');
    return g?.sys.isActive() ? g : null;
  }

  get isOpen() {
    return !this.root.hidden;
  }
  open() {
    this.root.hidden = false;
    this.refresh(true);
  }
  close() {
    this.root.hidden = true;
  }
  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  /** Runs an action against the game and shows what it says. */
  run(fn, label = '') {
    const g = this.scene;
    if (!g) return this.say('Start a run first');
    const result = fn(g);
    if (result) {
      this.say(result);
      g.ui?.toast?.(result);
    } else {
      this.say(label ? `${label}: done` : 'Done');
    }
    this.refresh(true);
  }

  say(text) {
    this.msg.textContent = text;
  }

  buildSection({ title, open, controls }) {
    const body = el('div', { className: 'body' });
    for (const c of controls) body.append(this.buildControl(c));
    const d = el('details', { open: !!open }, [el('summary', { textContent: title }), body]);
    return d;
  }

  buildControl(c) {
    switch (c.type) {
      case 'info': {
        const table = el('table');
        this.refreshers.push(() => {
          const g = this.scene;
          const rows = g ? c.rows(g) : [['', 'Start a run to see live info']];
          table.replaceChildren(...rows.map(([k, v]) => el('tr', {}, [el('td', { textContent: k }), el('td', { textContent: v })])));
        });
        return table;
      }
      case 'note': {
        const p = el('div', { className: 'note' });
        this.refreshers.push(() => (p.textContent = c.text()));
        return p;
      }
      case 'buttons':
        return el(
          'div',
          { className: 'btns' },
          c.items.map(([label, fn]) => el('button', { textContent: label, onclick: () => this.run((g) => fn(g, this), label) })),
        );
      case 'select':
      case 'select2': {
        const make = () => el('select', {}, c.options().map(([v, t]) => el('option', { value: v, textContent: t })));
        const a = make();
        const b = c.type === 'select2' ? make() : null;
        if (b) b.selectedIndex = Math.min(1, b.options.length - 1);
        const go = el('button', { textContent: c.button, onclick: () => this.run((g) => c.run(g, a.value, b?.value), c.label) });
        return el('div', { className: 'row' }, [el('span', { textContent: c.label }), a, ...(b ? [b] : []), go]);
      }
      case 'slider': {
        const input = el('input', { type: 'range', min: c.min, max: c.max, step: c.step });
        const out = el('output');
        input.oninput = () => {
          const g = this.scene;
          c.set(+input.value, g);
          out.textContent = c.format(+input.value);
        };
        this.refreshers.push(() => {
          if (document.activeElement === input) return; // being dragged
          const g = this.scene;
          if (!g && c.get.length) return;
          const v = c.get(g);
          input.value = v;
          out.textContent = c.format(v);
        });
        return el('div', { className: 'row' }, [el('span', { textContent: c.label }), input, out]);
      }
      case 'toggle': {
        const box = el('input', { type: 'checkbox', onchange: () => c.set(box.checked, this.scene) });
        this.refreshers.push(() => (box.checked = !!c.get(this.scene)));
        return el('label', { className: 'tog' }, [box, document.createTextNode(c.label)]);
      }
      default:
        return el('div');
    }
  }

  refresh(force = false) {
    const g = this.scene;
    // Corner readout (works with the panel shut).
    const showReadout = DEBUG.god && DEBUG.readout && g;
    this.readoutEl.hidden = !showReadout;
    if (showReadout) {
      const r = Object.fromEntries(A.readout(g));
      this.readoutEl.textContent = `${r.Area} · ${r.Distance} · ${r.Speed}\nJunction ${r.Junction} · Stop ${r['Next stop']}`;
    }
    if (!this.isOpen && !force) return;
    for (const f of this.refreshers) f();
  }
}

function el(tag, props = {}, children = []) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}
