// Developer helpers, switched on from the URL so they never ship switched on by accident.
//   #god            god mode: a test panel in the game (unlimited fuel, money, speed, next area)
//   ?timescale=4    run the simulation 4x faster (handy for testing balance)
// (#god also works on the shared artifact link, where query strings don't get through.)

const loc = typeof location !== 'undefined' ? location : { search: '', hash: '' };
const params = new URLSearchParams(loc.search);
const hash = loc.hash.replace('#', '').toLowerCase();

export const DEBUG = {
  timeScale: Math.min(20, Math.max(0.1, Number(params.get('timescale')) || 1)),
  god: hash === 'god' || params.has('god'),
  /** God mode: keep fuel and water full and the boiler cool. */
  unlimited: true,
};
