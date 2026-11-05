import { AREAS } from '../config/display.js';

/**
 * Saving a run: it's saved whenever the train is at a stop (on arrival and after anything you
 * do there), and Continue on the title screen puts you back at that stop. Ending a run deletes
 * the save. Everything lives in localStorage on this device.
 *
 * Saved: the train (TrainState), where you are on the route map and in which area, the stop
 * you're at, and your objectives. Not saved: what's waiting on that stop's platform (it's
 * re-rolled), and anything between stops.
 */
const KEY = 'rouge.save';
const VERSION = 1;

const STATE_FIELDS = ['fuel', 'water', 'heat', 'money', 'condition', 'cargo', 'cargoKind', 'passengers', 'upgrades', 'distance', 'rescues', 'stats'];

export function readSave() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    return s?.v === VERSION && AREAS[s.areaIndex] ? s : null;
  } catch {
    return null;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* storage blocked */
  }
}

/** Saves the run in GameScene `g` (call only while stopped at a stop). */
export function saveRun(g) {
  const poi = g.route.poi;
  // Only at a real stop (not stranded or halted for an event part-way along).
  if (!poi || g.phase !== 'stopped' || Math.abs(g.state.distance - poi.at) > 1 || g.ui?.panelArgs?.visit?.poi !== poi) return;
  const map = g.route.map;
  const data = {
    v: VERSION,
    savedAt: Date.now(),
    areaIndex: g.areaIndex,
    leg: g.leg,
    state: Object.fromEntries(STATE_FIELDS.map((k) => [k, g.state[k]])),
    poi: { id: poi.id, type: poi.type, name: poi.name, building: poi.building, at: poi.at },
    routeNextId: g.route.nextId,
    map: {
      nextId: map.nextId,
      stopsPerArea: map.stopsPerArea,
      areaPlan: map.areaPlan,
      columns: map.columns.map((col) => col.map((n) => ({ id: n.id, lane: n.lane, type: n.type, next: n.next, visited: n.visited, area: n.area }))),
      current: map.current.id,
      path: map.path.map((n) => n.id),
    },
    objectives: { list: g.objectives.list, completed: g.objectives.completed },
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* storage full or blocked: the run just isn't saved */
  }
}

/** Puts a saved run back into a freshly created GameScene (before it starts moving). */
export function applySave(g, data) {
  Object.assign(g.state, structuredClone(data.state));
  g.areaIndex = data.areaIndex;
  g.leg = data.leg;

  const map = g.route.map;
  const byId = new Map();
  map.columns = data.map.columns.map((col, c) =>
    col.map((n) => {
      const node = { ...n, col: c };
      byId.set(n.id, node);
      return node;
    }),
  );
  map.nextId = data.map.nextId;
  map.stopsPerArea = data.map.stopsPerArea;
  map.areaPlan = data.map.areaPlan;
  map.current = byId.get(data.map.current);
  map.path = data.map.path.map((id) => byId.get(id)).filter(Boolean);

  g.route.nextId = data.routeNextId;
  g.route.junction = null;
  g.route.event = null;
  g.route.poi = { ...data.poi, visited: true };

  g.objectives.list = structuredClone(data.objectives.list);
  g.objectives.completed = data.objectives.completed;
}

/** A one-line description of a save for the title screen. */
export function describeSave(s) {
  return `${AREAS[s.areaIndex].name.replace(/^The /, '')} · ${(s.state.distance / 1000).toFixed(1)} km · £${Math.floor(s.state.money)}`;
}
