/**
 * Plans the line ahead: after each stop, a junction with two signposted branches, then the
 * POI down whichever branch the points are set to.
 *
 *   depart POI ──(junctionDistance)──> junction ──(branchDistance)──> next POI
 *
 * Extend here for track events, terrain changes, longer branches, etc.
 */
export class RouteManager {
  constructor(balance, poiTypes, random = Math.random) {
    this.b = balance;
    this.poiTypes = poiTypes;
    this.random = random;
    this.junction = null; // { id, at, options: [typeId, typeId], buildings, selected: 0|1, resolved }
    this.poi = null; // { id, type, name, building, at, visited }
    this.nextId = 1;
    this.junctionsSinceCoal = 0;
  }

  /** Plans the next junction after leaving a stop at `fromDistance`; `area` is where its stops will be. */
  planJunction(fromDistance, area) {
    const r = this.b.route;
    this.poi = null;
    this.junction = {
      id: this.nextId++,
      at: fromDistance + this.range(r.junctionDistance),
      options: this.pickOptions(),
      selected: this.random() < 0.5 ? 0 : 1, // points start set one way at random
      resolved: false,
    };
    // Pick which look each destination has now, so the signpost can show the real building.
    // (Using the area the stops will be in, which may differ from the current one after a tunnel.)
    this.junction.buildings = this.junction.options.map((type) => this.pick(area?.buildings?.[type] ?? this.poiTypes[type].buildings));
    return this.junction;
  }

  select(index) {
    if (this.junction && !this.junction.resolved) this.junction.selected = index;
  }

  /** The train has reached the junction: commit to the selected branch and place its POI. */
  resolveJunction() {
    const j = this.junction;
    j.resolved = true;
    const type = j.options[j.selected];
    const def = this.poiTypes[type];
    this.poi = {
      id: this.nextId++,
      type,
      name: this.pick(def.names),
      building: j.buildings[j.selected],
      at: j.at + this.range(this.b.route.branchDistance),
      visited: false,
    };
    return this.poi;
  }

  /** Metres until the train must stop, or null if no stop is planned yet. */
  stopIn(distance) {
    return this.poi && !this.poi.visited ? this.poi.at - distance : null;
  }

  pickOptions() {
    const ids = Object.keys(this.poiTypes);
    const first = this.weightedPick(ids);
    const second = this.weightedPick(ids.filter((id) => id !== first));
    const options = [first, second];

    const guarantee = this.b.route.coalDepotGuaranteeEvery;
    if (!options.includes('coalDepot') && this.junctionsSinceCoal + 1 >= guarantee) {
      options[this.random() < 0.5 ? 0 : 1] = 'coalDepot';
    }
    this.junctionsSinceCoal = options.includes('coalDepot') ? 0 : this.junctionsSinceCoal + 1;
    return options;
  }

  weightedPick(ids) {
    const total = ids.reduce((s, id) => s + (this.poiTypes[id].weight ?? 1), 0);
    let roll = this.random() * total;
    for (const id of ids) {
      roll -= this.poiTypes[id].weight ?? 1;
      if (roll <= 0) return id;
    }
    return ids[ids.length - 1];
  }

  pick(list) {
    return list[Math.floor(this.random() * list.length)];
  }

  range([min, max]) {
    return min + this.random() * (max - min);
  }
}
