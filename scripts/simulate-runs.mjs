// Balance check: plays many runs with a sensible strategy, using the game's own rules
// (TrainState, RouteMap, the stop menus) and averaged travel, and reports how they go.
//
//   node scripts/simulate-runs.mjs [runs=500] [maxStops=60]
//
// Not exact (no heat-from-speed detail, events and breakdowns are approximated), but good for
// comparing balance changes: run it before and after editing src/config/balance.js.
import { BALANCE, POI_TYPES } from '../src/config/balance.js';
import { TrainState } from '../src/state/TrainState.js';
import { RouteMap } from '../src/systems/RouteMap.js';
import { buildOptions, createVisit } from '../src/poi/poiActions.js';

const RUNS = +(process.argv[2] || 500);
const MAX_STOPS = +(process.argv[3] || 60);
const SPEED = BALANCE.train.maxSpeed * 0.9; // average running speed
const r = BALANCE.route;
const rand = ([a, b]) => a + Math.random() * (b - a);

// Strategy: what the player wants at the next stop, most urgent first.
function wants(s) {
  const fuel = s.fuel / s.fuelCapacity;
  return [
    s.money < 15 && fuel > 0.3 && 'town', // broke: earn first
    fuel < 0.55 && 'coalDepot',
    (s.water < 35 || s.heat > 70) && 'waterTower',
    s.condition < 55 && s.money > 25 && 'workshop',
    (s.passengerCount > 0 || s.cargo > 0) && 'town',
    s.cargo === 0 && s.money > 30 && 'mine',
    'town',
  ].filter(Boolean);
}

function pickBranch(kids, s, map) {
  // Like a player using the map: if fuel will be needed soon and coal isn't offered now, take
  // the branch whose next junction offers it.
  if (s.fuel / s.fuelCapacity < 0.8 && !kids.some((k) => k.type === 'coalDepot')) {
    const toCoal = kids.find((k) => map.children(k).some((n) => n.type === 'coalDepot'));
    if (toCoal) return toCoal;
  }
  for (const w of wants(s)) {
    const k = kids.find((n) => n.type === w);
    if (k) return k;
  }
  return kids[Math.floor(Math.random() * kids.length)];
}

/** Presses the useful options at a stop (buy fuel, sell, board, load, repair, water). */
function useStop(s, visit) {
  for (let i = 0; i < 6; i++) {
    const opts = buildOptions(s, visit).filter((o) => !o.disabledReason);
    const pick =
      opts.find((o) => /Fill the tank|all you can afford \(\+/.test(o.label)) ??
      opts.find((o) => /relief/i.test(o.label)) ??
      opts.find((o) => /Shovel/.test(o.label)) ??
      opts.find((o) => /Drop off/.test(o.label)) ??
      opts.find((o) => /Sell/.test(o.label)) ??
      opts.find((o) => /pick up/.test(o.label) && !/To The/.test(o.label)) ??
      opts.find((o) => /Fill the hold|Load all/.test(o.label) && s.money > 60 && s.fuel > s.fuelCapacity * 0.5) ??
      opts.find((o) => /repair/i.test(o.label) && s.condition < 70) ??
      opts.find((o) => /Refill water/.test(o.label));
    if (!pick) break;
    pick.run();
  }
}

function runOnce() {
  const s = new TrainState(BALANCE);
  const map = new RouteMap({ poiTypes: POI_TYPES, areaCount: 8, stopsPerArea: r.stopsPerArea });
  let stops = 0;
  let leg = 0;
  let minMoney = s.money;
  const counts = {};
  while (stops < MAX_STOPS) {
    const node = pickBranch(map.children(), s, map);
    map.choose(node);
    // Travel there (stop -> junction -> stop), in 50 m steps.
    const metres = rand(r.junctionDistance) + rand(r.branchDistance);
    let overheatedLeg = false;
    for (let d = 0; d < metres; d += 50) {
      const v = SPEED * s.speedFactor;
      s.update(50 / v, v, 50, s.fuel > 0);
      if (s.overheated) overheatedLeg = true;
      if (s.fuel <= 0) {
        // Stranded: the relief engine.
        const v = { poi: { id: -1, type: 'stranded' }, def: {}, resume: true };
        const before = s.rescues;
        useStop(s, v);
        counts.rescue = (counts.rescue ?? 0) + (s.rescues - before);
        if (s.fuel <= 0) return { stops, km: s.distance / 1000, end: 'stranded, broke', money: s.money, minMoney, counts, rescues: s.rescues, stats: s.stats };
      }
    }
    if (overheatedLeg) counts.overheat = (counts.overheat ?? 0) + 1;
    // Rough events: about half the legs cost or give a little.
    if (Math.random() < BALANCE.events.chancePerLeg) {
      const roll = Math.random();
      if (roll < 0.3) s.condition = Math.max(0, s.condition - 8);
      else if (roll < 0.5) s.addFuel(15);
      else if (roll < 0.65) s.earn(20);
      else if (roll < 0.8) s.spend(Math.min(s.money, 10));
    }
    if (map.nextArea() !== map.areaOf(node.col - 1)) leg++;
    stops++;
    counts[node.type] = (counts[node.type] ?? 0) + 1;
    s.stats.stops++;
    s.stats.stopsByType[node.type] = (s.stats.stopsByType[node.type] ?? 0) + 1;
    const visit = createVisit({ id: stops, type: node.type, name: '' }, { leg, next: { leg: leg + 1, name: 'Next' } });
    const fuelIn = s.fuel;
    useStop(s, visit);
    s.update(20, 0, 0, false); // ~20 s at the stop
    if (process.env.TRACE) console.log(stops, node.type, 'fuel', fuelIn.toFixed(0), '->', s.fuel.toFixed(0), '£', s.money.toFixed(0), 'resc', s.rescues, 'kids', map.children().map((k) => k.type).join('/'));
    minMoney = Math.min(minMoney, s.money);
  }
  return { stops, km: s.distance / 1000, end: 'still going', money: s.money, minMoney, counts, rescues: s.rescues, stats: s.stats };
}

// localStorage stand-in (liveries etc. read it).
globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };

const results = Array.from({ length: RUNS }, runOnce);
const pct = (f) => `${Math.round((results.filter(f).length / RUNS) * 100)}%`;
const avg = (f) => (results.reduce((n, x) => n + f(x), 0) / RUNS).toFixed(1);
const sorted = results.map((x) => x.km).sort((a, b) => a - b);
console.log(`${RUNS} runs, up to ${MAX_STOPS} stops each`);
console.log(`  reached the stop limit: ${pct((x) => x.end === 'still going')}`);
console.log(`  distance km: median ${sorted[RUNS >> 1].toFixed(1)}, 10th pct ${sorted[Math.floor(RUNS * 0.1)].toFixed(1)}`);
console.log(`  relief engines per run: ${avg((x) => x.rescues)}  (runs needing one: ${pct((x) => x.rescues > 0)})`);
console.log(`  money at end: ${avg((x) => x.money)}  lowest point avg: ${avg((x) => x.minMoney)}`);
console.log(`  passengers delivered: ${avg((x) => x.stats.passengersDelivered)}, cargo sold: ${avg((x) => x.stats.cargoSold)}`);
console.log(`  earned: £${avg((x) => x.stats.earned)}`);
console.log(`  stretches with an overheat: ${avg((x) => x.counts.overheat ?? 0)} per run`);
console.log(`  stops by type: ${['coalDepot', 'town', 'mine', 'workshop', 'waterTower'].map((t) => `${t} ${avg((x) => x.counts[t] ?? 0)}`).join(', ')}`);
