// Developer helpers, controlled from the URL so they never ship switched on by accident.
//   ?timescale=4   run the simulation 4x faster (handy for testing balance)

const params = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');

export const DEBUG = {
  timeScale: Math.min(20, Math.max(0.1, Number(params.get('timescale')) || 1)),
};
