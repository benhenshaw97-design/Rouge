// The longest run on this device (metres), kept in localStorage.
const BEST_KEY = 'rouge.bestDistance';

export function readBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

export function writeBest(v) {
  try {
    localStorage.setItem(BEST_KEY, String(v));
  } catch {
    // Storage blocked: the best just isn't remembered.
  }
}
