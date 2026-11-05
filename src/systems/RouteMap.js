/**
 * The route map for a run: a network of stops laid out in columns (one column per stop along
 * the way) and lanes (parallel lines). Each stop links forward to two stops in the next column,
 * and those two are what the junction after it offers. Runs of columns belong to an area; moving
 * into a column in a new area means a tunnel.
 *
 *   col:   0        1          2          3     …
 *   lane 0          ● ───────── ●  ──────── ●
 *   lane 1   ★ ──── ● ───────── ●  ──────── ●
 *   lane 2          ● ───────── ●  ──────── ●
 *
 * Rules (so it always plays fairly):
 *  - a stop in lane L links to two of lanes L-1, L, L+1 (so the middle lane is always reachable)
 *  - neighbouring lanes in a column never have the same kind of stop (the two choices differ;
 *    in the first column the outer lanes differ too, as the start offers those two)
 *  - every other column has a Coal Depot in the middle lane (fuel is never far away)
 *
 * Columns are generated as needed, so the line goes on as long as the run does.
 * No Phaser code here; MapView draws it.
 */
export const LANES = 3;

export class RouteMap {
  /**
   * @param {object} o
   * @param {object} o.poiTypes POI_TYPES (weights are used to pick stop kinds)
   * @param {number} o.areaCount how many areas the line cycles through
   * @param {number} o.stopsPerArea columns per area
   * @param {() => number} [o.random]
   */
  constructor({ poiTypes, areaCount, stopsPerArea, random = Math.random }) {
    this.poiTypes = poiTypes;
    this.areaCount = areaCount;
    this.stopsPerArea = stopsPerArea;
    this.random = random;
    this.nextId = 1;
    // Area plan: from column `from`, areas start at `area` and change every `per` columns.
    this.areaPlan = { from: 1, area: 0, per: stopsPerArea };
    const start = this.node(0, 1, 'start');
    start.visited = true;
    this.columns = [[start]];
    this.current = start;
    this.path = [start];
    this.ensure(8);
  }

  node(col, lane, type) {
    return { id: this.nextId++, col, lane, type, next: [], visited: false };
  }

  /** Area index (into AREAS) for a column. */
  areaOf(col) {
    if (col === 0) return 0;
    const p = this.areaPlan;
    if (col < p.from) return this.columns[col]?.[0]?.area ?? 0;
    return (p.area + Math.floor((col - p.from) / p.per)) % this.areaCount;
  }

  /** Makes sure columns up to `col` exist. */
  ensure(col) {
    while (this.columns.length <= col) this.addColumn();
  }

  addColumn() {
    const c = this.columns.length;
    const types = this.pickColumnTypes(c);
    const column = types.map((t, lane) => this.node(c, lane, t));
    for (const n of column) n.area = this.areaOf(c);
    this.columns.push(column);
    for (const prev of this.columns[c - 1]) prev.next = this.linksFrom(prev.lane, c - 1 === 0);
  }

  /** The two lanes a stop in `lane` links to in the next column. */
  linksFrom(lane, isStart) {
    if (lane === 0) return [0, 1];
    if (lane === LANES - 1) return [LANES - 2, LANES - 1];
    if (isStart) return [0, 2]; // (the start offers the two outer lanes; the middle comes next)
    return this.random() < 0.5 ? [lane - 1, lane] : [lane, lane + 1];
  }

  pickColumnTypes(col) {
    const ids = Object.keys(this.poiTypes);
    const types = [];
    const coalHere = col % 2 === 0;
    for (let lane = 0; lane < LANES; lane++) {
      if (coalHere && lane === 1) {
        types.push('coalDepot');
        continue;
      }
      const avoid = new Set([types[lane - 1]]);
      if (coalHere) avoid.add('coalDepot'); // (already in the middle)
      // The start's junction offers the two outer lanes, so they must differ too.
      if (col === 1 && lane === LANES - 1) avoid.add(types[0]);
      types.push(this.weightedPick(ids.filter((id) => !avoid.has(id))));
    }
    return types;
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

  /** The stops the junction after `node` offers. */
  children(node = this.current) {
    this.ensure(node.col + 1);
    return node.next.map((lane) => this.columns[node.col + 1][lane]);
  }

  /** The train has taken the branch to `node`. */
  choose(node) {
    this.current = node;
    node.visited = true;
    this.path.push(node);
    this.ensure(node.col + 8);
  }

  /** Area of the stops coming up next. */
  nextArea() {
    return this.areaOf(this.current.col + 1);
  }

  /**
   * Re-plans areas from column `from` on: they start at `area` and change every `per` columns.
   * (Used by the debug tools; already-built columns are relabelled.)
   */
  replanAreas(from, area, per = this.stopsPerArea) {
    this.stopsPerArea = per;
    this.areaPlan = { from, area, per };
    for (let c = from; c < this.columns.length; c++) for (const n of this.columns[c]) n.area = this.areaOf(c);
  }

  /** Stops (columns) until the line enters a different area, or null if not within reach. */
  stopsUntilNewArea() {
    const here = this.areaOf(this.current.col);
    for (let k = 1; k < 40; k++) if (this.areaOf(this.current.col + k) !== here) return k;
    return null;
  }
}
