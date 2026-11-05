// Developer helpers, switched on from the URL so they never ship switched on by accident.
//   #god            god mode: a test panel in the game (unlimited fuel, money, speed, next area)
//                   (or tap the dim GOD button by the sound button; it stays on until switched off)
//   ?timescale=4    run the simulation 4x faster (handy for testing balance)

const loc = typeof location !== 'undefined' ? location : { search: '', hash: '' };
const params = new URLSearchParams(loc.search);
const hash = loc.hash.replace('#', '').toLowerCase();

const STORE_KEY = 'rouge-god';
const stored = () => {
  try {
    return localStorage.getItem(STORE_KEY) === '1';
  } catch {
    return false;
  }
};

export const DEBUG = {
  timeScale: Math.min(20, Math.max(0.1, Number(params.get('timescale')) || 1)),
  god: hash === 'god' || params.has('god') || stored(),
  /** God mode: keep fuel and water full and the boiler cool. */
  unlimited: true,
  // More god-mode switches (set from the debug panel, see src/debug/):
  noBreakdowns: false,
  noWear: false,
  hideUI: false,
  /** Small live readout in the corner (area, distance, next stop…) even with the panel shut. */
  readout: false,
};

/** Switches god mode on or off and remembers it on this device. */
export function setGod(on) {
  DEBUG.god = on;
  if (!on) Object.assign(DEBUG, { unlimited: true, noBreakdowns: false, noWear: false, hideUI: false, readout: false, timeScale: 1 });
  try {
    localStorage.setItem(STORE_KEY, on ? '1' : '0');
  } catch {
    // Storage blocked (private window etc.): god mode lasts until the page is reloaded.
  }
}
