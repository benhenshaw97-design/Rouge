import { POI_TYPES } from '../config/balance.js';

/**
 * Objectives: goals for the run. A few are active at once; finish one for its reward and a new
 * one takes its place. Each template's make(ctx) returns an objective:
 *   text      what to do
 *   metric    what's counted (see METRICS)
 *   target    how much more of it is needed (counted from when the objective was set)
 *   reward    money paid on completion
 *   ...       anything the metric needs (e.g. poiType)
 * ctx: { state, scene, pick(list) }. Story chapters could later be objectives in a fixed order.
 */
export const OBJECTIVE_TEMPLATES = [
  {
    id: 'deliver',
    make: ({ pick }) => {
      const n = pick([6, 10, 15]);
      return { text: `Deliver ${n} passengers`, metric: 'passengersDelivered', target: n, reward: n * 5 };
    },
  },
  {
    id: 'sell',
    make: ({ pick }) => {
      const n = pick([10, 20]);
      return { text: `Sell ${n} cargo at towns`, metric: 'cargoSold', target: n, reward: n * 3 };
    },
  },
  {
    id: 'travel',
    make: ({ pick }) => {
      const km = pick([8, 12, 16]);
      return { text: `Travel ${km} km`, metric: 'distanceKm', target: km, reward: km * 4 };
    },
  },
  {
    id: 'visit',
    make: ({ pick }) => {
      const type = pick(['town', 'mine', 'workshop', 'waterTower']);
      const n = 2;
      return { text: `Call at ${n} ${POI_TYPES[type].name}s`, metric: 'stopsOfType', poiType: type, target: n, reward: 35 };
    },
  },
  {
    id: 'reach',
    make: ({ scene }) => {
      const next = scene.nextAreaInfo();
      if (!next) return null;
      return { text: `Reach ${next.name}`, metric: 'areasEntered', target: 1, reward: 40 };
    },
  },
  {
    id: 'earn',
    make: ({ pick }) => {
      const n = pick([100, 150, 200]);
      return { text: `Earn £${n}`, metric: 'earned', target: n, reward: Math.round(n * 0.3) };
    },
  },
];

/** How each metric is measured now (progress = now − value when the objective was set). */
export const METRICS = {
  passengersDelivered: ({ state }) => state.stats.passengersDelivered,
  cargoSold: ({ state }) => state.stats.cargoSold ?? 0,
  distanceKm: ({ state }) => state.distance / 1000,
  earned: ({ state }) => state.stats.earned,
  stopsOfType: ({ state }, o) => state.stats.stopsByType?.[o.poiType] ?? 0,
  areasEntered: ({ scene }) => scene.leg,
};
