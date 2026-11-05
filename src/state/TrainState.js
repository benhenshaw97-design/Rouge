import { BALANCE } from '../config/balance.js';

/**
 * Everything about the train's resources, with no Phaser code in it.
 * Scenes and UI read from this; POI actions call its methods to change it.
 *
 * update() returns a list of event names (e.g. 'lowFuel', 'overheated') so the scene can
 * react with sounds and messages without this class knowing about either.
 */
export class TrainState {
  constructor(balance = BALANCE) {
    this.b = balance;
    const s = balance.start;

    this.fuel = s.fuel;
    this.water = s.water;
    this.heat = s.heat;
    this.money = s.money;
    this.condition = s.condition;
    this.cargo = 0;
    this.cargoKind = null; // which load the wagon shows, e.g. 'gold'
    /**
     * Passenger groups: { count, boardedAt (metres), boardedStop (stop id), dest }.
     * dest is null (any other town) or { leg, name }: an area they're booked to, where `leg`
     * counts areas from the start of the run (so it still works when the line loops round).
     */
    this.passengers = [];
    this.upgrades = { fuelTank: 0, boiler: 0 };

    this.distance = 0; // metres travelled this run
    this.overheated = false;
    this.lowFuelWarned = false;
    this.brokenDown = false;
    this.rescues = 0; // relief engines called this run

    this.stats = { earned: 0, stops: 0, passengersDelivered: 0 };
  }

  // --- Derived values ------------------------------------------------------------------------

  get fuelCapacity() {
    return this.b.fuel.tankCapacity + this.upgrades.fuelTank * this.b.upgrades.fuelTank.capacityPerLevel;
  }
  get waterCapacity() {
    return this.b.water.capacity;
  }
  get passengerCount() {
    return this.passengers.reduce((n, g) => n + g.count, 0);
  }
  get passengerCapacity() {
    return this.b.train.passengerCapacity;
  }
  get freeSeats() {
    return this.passengerCapacity - this.passengerCount;
  }
  get cargoCapacity() {
    return this.b.train.cargoCapacity;
  }
  get isOutOfFuel() {
    return this.fuel <= 0;
  }
  get isLowFuel() {
    return this.fuel / this.fuelCapacity <= this.b.fuel.lowWarningFraction;
  }

  /** Multiplier on fuel burn from cargo weight and boiler upgrades. */
  get burnMultiplier() {
    const cargo = 1 + this.cargo * this.b.fuel.cargoBurnPerUnit;
    const boiler = 1 - this.upgrades.boiler * this.b.upgrades.boiler.burnReductionPerLevel;
    return cargo * boiler;
  }

  /** Fraction (0..1) of normal top speed currently allowed. */
  get speedFactor() {
    let f = 1;
    if (this.overheated) f = Math.min(f, this.b.heat.overheatSpeedFactor);
    const c = this.b.condition;
    if (this.condition < c.slowBelow) {
      const t = this.condition / c.slowBelow;
      f *= c.minSpeedFactor + (1 - c.minSpeedFactor) * t;
    }
    return f;
  }

  // --- Per-frame simulation --------------------------------------------------------------------

  /**
   * @param {number} dt seconds since last frame
   * @param {number} speed current speed (m/s)
   * @param {number} metres distance travelled this frame
   * @param {boolean} underSteam true when the firebox is burning (moving with fuel)
   * @returns {string[]} events that happened this frame
   */
  update(dt, speed, metres, underSteam) {
    const events = [];
    const b = this.b;
    this.distance += metres;

    if (underSteam) {
      const burn = (b.fuel.burnPerMetre * metres + b.fuel.burnPerSecond * dt) * this.burnMultiplier;
      this.fuel = Math.max(0, this.fuel - burn);
      this.water = Math.max(0, this.water - b.water.usePerMetre * metres);
      this.condition = Math.max(0, this.condition - b.condition.wearPerMetre * metres);
      if (this.fuel === 0) events.push('outOfFuel');
    }

    // Heat: rises with speed (only while firing), cools while there's water in the boiler.
    const h = b.heat;
    const speedFrac = Math.min(1, speed / b.train.maxSpeed);
    const dry = this.water <= 0;
    const gain = underSteam ? h.gainPerSecond * speedFrac * speedFrac * (dry ? h.dryBoilerMultiplier : 1) : 0;
    const cool = dry ? 0 : h.coolPerSecond * (this.overheated ? h.ventCoolingMultiplier : 1);
    this.heat = clamp(this.heat + (gain - cool) * dt, 0, h.max);

    if (!this.overheated && this.heat >= h.max) {
      this.overheated = true;
      events.push('overheated');
    } else if (this.overheated && this.heat <= h.recoverBelow) {
      this.overheated = false;
      events.push('cooledDown');
    }

    if (this.isLowFuel && !this.lowFuelWarned && this.fuel > 0) {
      this.lowFuelWarned = true;
      events.push('lowFuel');
    } else if (!this.isLowFuel) {
      this.lowFuelWarned = false;
    }

    return events;
  }

  // --- Actions (called by POI options) ---------------------------------------------------------

  canAfford(amount) {
    return this.money >= amount - 1e-9;
  }
  spend(amount) {
    this.money = Math.max(0, this.money - amount);
  }
  earn(amount) {
    this.money += amount;
    this.stats.earned += amount;
  }

  addFuel(units) {
    this.fuel = Math.min(this.fuelCapacity, this.fuel + units);
  }

  refillWater() {
    this.water = this.waterCapacity;
  }

  coolBoiler(amount) {
    this.heat = Math.max(0, this.heat - amount);
    if (this.overheated && this.heat <= this.b.heat.recoverBelow) this.overheated = false;
  }

  repair(points) {
    this.condition = Math.min(this.b.condition.max, this.condition + points);
  }

  addCargo(units, kind = this.cargoKind) {
    this.cargo = Math.min(this.cargoCapacity, this.cargo + units);
    if (units > 0) this.cargoKind = kind;
  }
  removeAllCargo() {
    const n = this.cargo;
    this.cargo = 0;
    this.cargoKind = null;
    return n;
  }

  boardPassengers(count, stopId, dest = null) {
    if (count <= 0) return;
    this.passengers.push({ count, boardedAt: this.distance, boardedStop: stopId, dest });
  }

  /**
   * How a group fares at a town (stop `stopId`, in area leg `leg`):
   *   'off'    gets off and pays the normal fare (or the through fare, at their area)
   *   'missed' carried past their area: gets off for a reduced fare
   *   'stay'   stays aboard (boarded here, or booked to an area further on)
   */
  dropOffKind(g, stopId, leg) {
    if (g.boardedStop === stopId) return 'stay';
    if (!g.dest || g.dest.leg === leg) return 'off';
    return g.dest.leg < leg ? 'missed' : 'stay';
  }

  /** Passengers who get off at this town (so you can't board and drop instantly). */
  passengersForDropOff(stopId, leg = 0) {
    return this.passengers.filter((g) => this.dropOffKind(g, stopId, leg) !== 'stay');
  }

  fareFor(groups, stopId, leg = 0) {
    const p = this.b.passengers;
    return Math.round(
      groups.reduce((sum, g) => {
        const km = Math.max(0, this.distance - g.boardedAt) / 1000;
        const kind = this.dropOffKind(g, stopId, leg);
        const k = kind === 'missed' ? p.missedStopFareMultiplier : g.dest ? p.throughFareMultiplier : 1;
        return sum + g.count * (p.baseFare + p.farePerKm * km) * k;
      }, 0),
    );
  }

  /** Drops off every eligible passenger. Returns { count, fare, missed }. */
  dropOffPassengers(stopId, leg = 0) {
    const leaving = this.passengersForDropOff(stopId, leg);
    const count = leaving.reduce((n, g) => n + g.count, 0);
    const missed = leaving.filter((g) => this.dropOffKind(g, stopId, leg) === 'missed').reduce((n, g) => n + g.count, 0);
    const fare = this.fareFor(leaving, stopId, leg);
    this.passengers = this.passengers.filter((g) => !leaving.includes(g));
    this.earn(fare);
    this.stats.passengersDelivered += count;
    return { count, fare, missed };
  }

  /**
   * Breakdown check for a stretch of line (wear makes them likelier).
   * @param {number} metres distance covered under steam this frame
   * @param {() => number} random 0..1
   */
  rollBreakdown(metres, random = Math.random) {
    const c = this.b.condition;
    if (this.brokenDown || this.condition >= c.breakdownBelow || metres <= 0) return false;
    const perKm = c.breakdownsPerKmAtZero * (1 - this.condition / c.breakdownBelow);
    return random() < (perKm * metres) / 1000;
  }

  upgradeLevel(id) {
    return this.upgrades[id] ?? 0;
  }
  upgradeMaxLevel(id) {
    return this.b.upgrades[id].costs.length;
  }
  applyUpgrade(id) {
    this.upgrades[id] = Math.min(this.upgradeMaxLevel(id), this.upgradeLevel(id) + 1);
  }
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
