import { LIVERIES } from '../config/balance.js';

/**
 * Paint schemes for the train. Bought at a Workshop and kept for good on this device (they
 * survive the end of a run), along with which one is on the train now.
 * The art is made by scripts/make-liveries.py: <part>-<livery>.png for each train part.
 */
const KEY = 'rouge.liveries';

function read() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    return { owned: Array.isArray(s?.owned) ? s.owned : ['red'], current: s?.current ?? 'red' };
  } catch {
    return { owned: ['red'], current: 'red' };
  }
}

function write(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage blocked: lasts until reload */
  }
}

let cache = null;
const get = () => (cache ??= read());

export const liveries = {
  get current() {
    const c = get().current;
    return LIVERIES[c] ? c : 'red';
  },
  owns(id) {
    return id === 'red' || get().owned.includes(id);
  },
  buy(id) {
    const s = get();
    if (!s.owned.includes(id)) s.owned.push(id);
    s.current = id;
    write(s);
  },
  wear(id) {
    get().current = id;
    write(get());
  },
};

/** Image key of a train part (locomotive, tender, wagon, carriage, wheel) in a livery. */
export function liveryKey(part, livery = liveries.current) {
  return livery === 'red' ? part : `${part}-${livery}`;
}
