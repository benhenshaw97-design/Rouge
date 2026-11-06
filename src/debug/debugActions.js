import { BALANCE, POI_TYPES } from '../config/balance.js';
import { AREAS, PX_PER_METRE } from '../config/display.js';
import { areaLoaded } from '../systems/BackgroundLoader.js';
import { writeBest } from '../state/best.js';
import { EVENTS } from '../content/events.js';

/**
 * Debug actions: the things the debug panel (DebugPanel.js) can do to a running game.
 * Each takes the GameScene and returns a short message saying what happened (or why not).
 * Add new ones here as the game grows (map, events, story…) and give them a control in
 * DebugPanel's SECTIONS.
 */

/** Starting values for the tuning sliders, so they scale from the real settings. */
const BASE = {
  junctionDistance: [...BALANCE.route.junctionDistance],
  branchDistance: [...BALANCE.route.branchDistance],
};
export const tuning = { spacing: 1 };

const stoppingDistance = (g) => (g.motion.speed ** 2) / (2 * BALANCE.train.brakeDeceleration);

// --- Info ------------------------------------------------------------------------------------

/** Everything worth knowing at a glance, as label/value rows. */
export function readout(g) {
  const s = g.state;
  const d = s.distance;
  const j = g.route.junction;
  const poi = g.route.poi;
  const m = (v) => `${Math.round(v)} m`;
  const rows = [
    ['Area', `${g.area.name} (#${g.areaIndex + 1}, leg ${g.leg})`],
    ['Phase', g.phase + (g.breakdown ? ' · broken down' : '') + (g.tunnel ? ' · tunnel' : '')],
    ['Distance', `${(d / 1000).toFixed(2)} km`],
    ['Speed', `${Math.round(g.motion.speed * 3.6)} km/h (limit ${Math.round(s.speedFactor * 100)}%)`],
    ['Junction', j && !j.resolved ? `${m(j.at - d)}: ${j.options.map((t) => POI_TYPES[t].name).join(' / ')}` : '–'],
    ['Event', g.route.event && !g.route.event.visited ? `${g.route.event.def.title} in ${m(g.route.event.at - d)}` : '–'],
    ['Next stop', poi && !poi.visited ? `${POI_TYPES[poi.type].name} “${poi.name}” in ${m(poi.at - d)}` : '–'],
    ['Next tunnel', g.tunnel ? 'now' : tunnelIn(g)],
    ['Map', `column ${g.route.map.current.col}, lane ${g.route.map.current.lane + 1}; ${g.route.map.stopsPerArea} stops per area`],
    ['Passengers', s.passengers.map((p) => `${p.count}→${p.dest ? p.dest.name : 'any'}`).join(', ') || '–'],
    ['Burn', `×${s.burnMultiplier.toFixed(2)}  · upgrades ${Object.entries(s.upgrades).map(([k, v]) => `${k} ${v}`).join(', ')}`],
    ['Objectives', g.objectives.list.map((o) => `${o.text} (${Math.floor(o.progress ?? 0)}/${o.target})`).join('; ')],
    ['FPS', String(Math.round(g.game.loop.actualFps))],
  ];
  return rows;
}

// --- Travel ----------------------------------------------------------------------------------

/** Switches straight to an area (no tunnel). The stop already on the line keeps its look. */
export function goToArea(g, index) {
  if (g.tunnel) return 'Wait until the train is out of the tunnel';
  const area = AREAS[index];
  if (!areaLoaded(g, area)) return `${area.name} is still downloading`;
  g.areaIndex = index;
  g.leg++;
  g.parallax.setArea(area);
  g.weather.setArea(area);
  g.ambience.setArea(area);
  g.route.map.replanAreas(g.route.map.current.col + 1, index);
  const j = g.route.junction;
  if (j && !j.resolved) {
    g.route.restyleJunction(area);
    if (g.signpostsShown) g.ui.showJunction(j);
  }
  return `Now in ${area.name}`;
}

export function tunnelSoon(g) {
  g.godNextArea();
  return null; // (godNextArea shows its own message)
}

/** Moves the train forward instantly, stopping short of the next junction, stop or tunnel. */
export function skipAhead(g, metres) {
  if (g.phase !== 'running') return 'Only while running';
  if (g.tunnel) return 'Not while a tunnel is coming up';
  const d = g.state.distance;
  const j = g.route.junction;
  const poi = g.route.poi;
  const limits = [d + metres];
  if (j && !j.resolved) limits.push(j.at - BALANCE.route.signpostRevealDistance - 20);
  if (poi && !poi.visited) limits.push(poi.at - 250);
  const by = Math.min(...limits) - d;
  if (by <= 1) return 'Already as close as skipping goes';
  jump(g, by);
  return `Skipped ${Math.round(by)} m`;
}

/** Skips to just before the junction's signposts appear (or to just before the stop). */
export function skipToNext(g) {
  return skipAhead(g, 1e9);
}

function jump(g, metres) {
  g.state.distance += metres;
  g.parallax.scroll(metres * PX_PER_METRE, 0);
  g.weather.update(metres * PX_PER_METRE);
  g.world.update(g.state.distance);
}

// --- Stops -----------------------------------------------------------------------------------

/** Sets the two stops offered at the next junction (the pending one if it hasn't been reached). */
export function forceJunction(g, a, b) {
  if (a === b) return 'Pick two different stops (a junction offers two choices)';
  const j = g.route.junction;
  if (j && !j.resolved) {
    j.options = [a, b];
    g.route.restyleJunction(j.area);
    if (g.signpostsShown) g.ui.showJunction(j);
    return `This junction now offers ${POI_TYPES[a].name} / ${POI_TYPES[b].name}`;
  }
  g.route.forcedOptions = [a, b];
  return `The next junction will offer ${POI_TYPES[a].name} / ${POI_TYPES[b].name}`;
}

/** Puts a stop of `type` just ahead of the train (in place of whatever was coming). */
export function stopHere(g, type) {
  if (g.phase !== 'running') return 'Only while running';
  if (g.tunnel) return 'Not while a tunnel is coming up';
  const poi = g.route.poi;
  if (poi && !poi.visited) return 'A stop is already on its way; reach it first';
  const j = g.route.junction;
  if (j && !j.resolved) {
    j.resolved = true; // (its signpost stays by the line, but the points no longer matter)
    g.signpostsShown = false;
    g.ui.hideJunction();
  }
  const at = g.state.distance + Math.max(stoppingDistance(g) * 1.3, 40) + 60;
  g.addStopToWorld(g.route.placeStop(type, at, g.area));
  return `${POI_TYPES[type].name} ahead`;
}

/** Puts a line event just ahead of the train. */
export function eventHere(g, id) {
  if (g.phase !== 'running') return 'Only while running';
  const def = EVENTS.find((e) => e.id === id);
  const at = g.state.distance + Math.max(stoppingDistance(g) * 1.3, 30) + 40;
  const next = g.route.stopIn(g.state.distance);
  if (next != null && next < at - g.state.distance + 20) return 'Something else is just ahead; try after it';
  g.route.event?.prop?.destroy(); // (the event it replaces never happens)
  g.route.event = { def, at, visited: false, warned: true };
  g.addEventProp(g.route.event);
  return `${def.title} ahead`;
}

export const eventOptions = () => EVENTS.map((e) => [e.id, `${e.title}${e.areas ? ` (${e.areas.join(', ')})` : ''}`]);

/** A cast member says a line for a moment (content/dialogue.js). */
export function sayLine(g, moment) {
  g.ui.say(moment, { force: true });
  return null;
}

export function completeObjectives(g) {
  const done = g.objectives.completeAll();
  return `Completed ${done.length} objectives`;
}

export function newObjectives(g) {
  g.objectives.reroll();
  return 'New objectives set';
}

// --- Train -----------------------------------------------------------------------------------

export function fillEverything(g) {
  const s = g.state;
  s.fuel = s.fuelCapacity;
  s.water = s.waterCapacity;
  s.heat = 0;
  s.overheated = false;
  s.condition = BALANCE.condition.max;
  return 'Fuel, water and condition full; boiler cold';
}

export function maxUpgrades(g) {
  for (const id of Object.keys(BALANCE.upgrades)) g.state.upgrades[id] = g.state.upgradeMaxLevel(id);
  return 'All upgrades at max level';
}

export function loadCargo(g, kind = 'gold') {
  g.state.addCargo(g.state.cargoCapacity, kind);
  return `Hold full of ${kind}`;
}

export function boardPassengers(g, through) {
  const s = g.state;
  const n = Math.min(6, s.freeSeats);
  if (n <= 0) return 'Carriage is full';
  const next = AREAS[(g.areaIndex + 1) % AREAS.length];
  s.boardPassengers(n, -1, through ? { leg: g.leg + 1, name: next.name } : null);
  return `${n} passengers aboard for ${through ? next.name : 'any town'}`;
}

export function clearLoad(g) {
  g.state.removeAllCargo();
  g.state.passengers = [];
  return 'Cargo and passengers cleared';
}

// --- Events ----------------------------------------------------------------------------------

export function breakDown(g) {
  if (g.phase !== 'running') return 'Only while running';
  if (g.breakdown) return 'Already broken down';
  g.startBreakdown();
  return null;
}

export function overheat(g) {
  g.state.heat = BALANCE.heat.max;
  return null; // (the game shows its own message)
}

export function runOutOfFuel(g) {
  g.state.fuel = 0;
  return 'Fuel tank emptied';
}

export function lowFuel(g) {
  g.state.fuel = g.state.fuelCapacity * BALANCE.fuel.lowWarningFraction * 0.9;
  return 'Fuel set just under the warning level';
}

export function dryBoiler(g) {
  g.state.water = 0;
  return 'Boiler water emptied';
}

// --- Tuning ----------------------------------------------------------------------------------

/** Scales the gap between stops (both legs: stop → junction → stop). */
export function setSpacing(k) {
  tuning.spacing = k;
  BALANCE.route.junctionDistance = BASE.junctionDistance.map((v) => Math.round(v * k));
  BALANCE.route.branchDistance = BASE.branchDistance.map((v) => Math.round(v * k));
}

/** How many stops each area has from here on (the current area carries on for that many). */
export function setStopsPerArea(g, n) {
  const map = g.route.map;
  map.replanAreas(map.current.col + 1, g.areaIndex, n);
}

function tunnelIn(g) {
  const map = g.route.map;
  const k = map.stopsUntilNewArea();
  if (k == null) return '–';
  return k === 1 ? 'after this stop' : `after ${k} more stops`;
}

// --- Run -------------------------------------------------------------------------------------

export function restartRun(g) {
  g.scene.start('Game');
  return null;
}

export function endRun(g) {
  g.endRun('Ended from the debug panel');
  return null;
}

export function resetBest() {
  writeBest(0);
  return 'Best distance cleared';
}
