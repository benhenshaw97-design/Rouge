// Developer helpers, switched on from the URL so they never ship switched on by accident.
//   #god            god mode: a test panel in the game (unlimited fuel, money, speed, next area)
//                   (or tap the gauges panel 5 times quickly; it stays on until switched off the same way)
//   ?timescale=4    run the simulation 4x faster (handy for testing balance)
// (Tapping the panel is the way in on the shared artifact link, which may not pass #god through.)

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
};

/** Switches god mode on or off and remembers it on this device. */
export function setGod(on) {
  DEBUG.god = on;
  try {
    localStorage.setItem(STORE_KEY, on ? '1' : '0');
  } catch {
    // Storage blocked (private window etc.): god mode lasts until the page is reloaded.
  }
}
