import { STOP_NAMES } from '../config/balance.js';
import { RouteMap } from './RouteMap.js';
import { EVENTS } from '../content/events.js';

/**
 * Plans the line ahead: after each stop, a junction with two signposted branches, then the
 * POI down whichever branch the points are set to. Which stops the branches lead to comes from
 * the run's route map (RouteMap.js), so the whole network can be shown and planned ahead.
 *
 *   depart POI ──(junctionDistance)──> junction ──(branchDistance)──> next POI
 */
export class RouteManager {
  constructor(balance, poiTypes, random = Math.random, areaCount = 1) {
    this.b = balance;
    this.poiTypes = poiTypes;
    this.random = random;
    this.map = new RouteMap({ poiTypes, areaCount, stopsPerArea: balance.route.stopsPerArea, random });
    this.junction = null; // { id, at, options: [typeId, typeId], buildings, selected: 0|1, resolved }
    this.poi = null; // { id, type, name, building, at, visited }
    this.nextId = 1;
  }

  /**
   * Plans the next junction after leaving a stop at `fromDistance`; `area` is where its stops
   * will be. `state` (TrainState) lets events check whether they make sense (e.g. need cargo).
   */
  planJunction(fromDistance, area, state = null) {
    const r = this.b.route;
    this.poi = null;
    const nodes = this.map.children();
    if (this.forcedOptions) {
      // (The debug panel chose this junction's stops: relabel them on the map too.)
      nodes.forEach((n, i) => (n.type = this.forcedOptions[i]));
      this.forcedOptions = null;
    }
    this.junction = {
      id: this.nextId++,
      at: fromDistance + this.range(r.junctionDistance),
      options: nodes.map((n) => n.type),
      nodes,
      selected: this.random() < 0.5 ? 0 : 1, // points start set one way at random
      resolved: false,
    };
    // Pick which look each destination has now, so the signpost can show the real building.
    // (Using the area the stops will be in, which may differ from the current one after a tunnel.)
    this.junction.buildings = this.junction.options.map((type) => this.buildingFor(type, area));
    this.junction.area = area;
    this.planEvent(fromDistance, area, state);
    return this.junction;
  }

  /**
   * Maybe an event on the way to the junction: somewhere in the middle of the stretch, well
   * clear of the stop behind and the signposts ahead.
   */
  planEvent(fromDistance, area, state = null, force = null) {
    this.event = null;
    if (!force && this.random() >= this.b.events.chancePerLeg) return null;
    const def = force ?? this.pickEvent(area, state);
    if (!def) return null;
    const from = fromDistance + 600;
    const to = this.junction.at - this.b.route.signpostRevealDistance - 200;
    if (to <= from) return null;
    this.event = { def, at: from + this.random() * (to - from), visited: false, warned: false };
    return this.event;
  }

  pickEvent(area, state) {
    const ok = EVENTS.filter((e) => (!e.areas || e.areas.includes(area?.id)) && (!state || !e.when || e.when(state)));
    if (!ok.length) return null;
    const total = ok.reduce((n, e) => n + (e.weight ?? 1), 0);
    let roll = this.random() * total;
    for (const e of ok) {
      roll -= e.weight ?? 1;
      if (roll <= 0) return e;
    }
    return ok[ok.length - 1];
  }

  select(index) {
    if (this.junction && !this.junction.resolved) this.junction.selected = index;
  }

  /** The train has reached the junction: commit to the selected branch and place its POI. */
  resolveJunction() {
    const j = this.junction;
    j.resolved = true;
    this.map.choose(j.nodes[j.selected]);
    return this.placeStop(j.options[j.selected], j.at + this.range(this.b.route.branchDistance), j.area, j.buildings[j.selected]);
  }

  /** Puts the next stop (a POI of `type`) at `at` metres, in `area`'s style. */
  placeStop(type, at, area, building = this.buildingFor(type, area)) {
    const def = this.poiTypes[type];
    this.poi = {
      id: this.nextId++,
      type,
      name: this.pick(STOP_NAMES[area?.id]?.[type] ?? def.names),
      building,
      at,
      visited: false,
    };
    return this.poi;
  }

  /** Metres until the train must stop, or null if no stop is planned yet. */
  stopIn(distance) {
    // Whichever comes first: a line event or the stop.
    const ev = this.event && !this.event.visited ? this.event.at - distance : null;
    const poi = this.poi && !this.poi.visited ? this.poi.at - distance : null;
    if (ev == null) return poi;
    if (poi == null) return ev;
    return Math.min(ev, poi);
  }

  /** A building for a POI type in an area (the area's own look if it has one). */
  buildingFor(type, area) {
    return this.pick(area?.buildings?.[type] ?? this.poiTypes[type].buildings);
  }

  /** Re-picks the pending junction's buildings for an area (after going through a tunnel). */
  restyleJunction(area) {
    if (!this.junction) return;
    this.junction.buildings = this.junction.options.map((type) => this.buildingFor(type, area));
    this.junction.area = area;
  }

    pick(list) {
    return list[Math.floor(this.random() * list.length)];
  }

  range([min, max]) {
    return min + this.random() * (max - min);
  }
}
