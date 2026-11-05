import { BALANCE, POI_TYPES } from '../config/balance.js';

/**
 * What each POI lets you do. Prices and amounts come from POI_TYPES / BALANCE.
 *
 * buildOptions() returns a list of options for the panel:
 *   {
 *     label:   button text
 *     cost?:   money it costs (shown as -£x)
 *     gain?:   money it earns (shown as +£x)
 *     disabledReason?: why it can't be used right now (button greys out and shows this)
 *     sound?:  sound key to play when used
 *     run():   applies the effect and returns a message for the panel
 *   }
 * The panel rebuilds the list after every action, so options always reflect current state.
 *
 * To add a new POI type: add it to POI_TYPES in balance.js and add a builder here with the
 * same key.
 */

/**
 * Per-stop data that lasts while you're parked (e.g. a town's waiting passengers).
 * where: { leg, next: { leg, name } }: which area of the run this stop is in (counted from
 * the start) and the area the line runs to next (through passengers are booked there).
 */
export function createVisit(poi, where = { leg: 0, next: null }) {
  const def = POI_TYPES[poi.type];
  const visit = { poi, def, leg: where.leg, next: where.next };
  if (def.waitingPassengers) visit.waitingPassengers = randInt(...def.waitingPassengers);
  if (def.throughPassengers && where.next) visit.throughPassengers = randInt(...def.throughPassengers);
  if (def.ores) visit.ore = def.ores[randInt(0, def.ores.length - 1)];
  return visit;
}

export function buildOptions(state, visit) {
  const builder = BUILDERS[visit.poi.type];
  const options = builder ? builder(state, visit, visit.def) : [];
  // Out of fuel with no coal to be had (or no money for it here): offer the relief engine.
  const canBuyCoal = visit.poi.type === 'coalDepot' && state.money >= POI_TYPES.coalDepot.prices.fuelPerUnit;
  if (state.isOutOfFuel && !canBuyCoal) options.push(rescueOption(state));
  return options;
}

/** A relief engine brings fuel out to you (see BALANCE.rescue). */
export function rescueOption(state) {
  const r = BALANCE.rescue;
  const price = r.costs[Math.min(state.rescues, r.costs.length - 1)];
  const cost = Math.min(price, state.money);
  return {
    label: price === 0 ? `Call a relief engine (+${r.fuel} fuel, free this once)` : `Call a relief engine (+${r.fuel} fuel)`,
    cost: cost || undefined,
    sound: 'whistle',
    run: () => {
      state.spend(cost);
      state.rescues++;
      state.addFuel(r.fuel);
      return cost < price
        ? `The relief crew took all you had (${money(cost)}) and shovelled in ${r.fuel} fuel.`
        : `A relief engine puffed up and shovelled in ${r.fuel} fuel${cost ? ` for ${money(cost)}` : ''}.`;
    },
  };
}

/** The panel for a line event (see content/events.js). ctx: { area, next }. */
export function eventVisit(def, ctx) {
  return {
    poi: { id: -2, type: 'event', name: def.title },
    def: { name: 'On the line', icon: def.icon, description: def.text },
    event: def,
    ctx: { ...ctx, roll: Math.random },
    chosen: false,
    resume: true,
  };
}

/** The panel for being stranded between stops (out of fuel). */
export function strandedVisit() {
  return {
    poi: { id: -1, type: 'stranded', name: 'Between stops' },
    def: {
      name: 'Stranded',
      icon: 'icon-fuel',
      description: 'The fire’s out and the train has rolled to a stop. Send for help, or call it a day.',
    },
    resume: true,
  };
}

const money = (n) => `£${Math.round(n)}`;
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const notEnough = (state, cost) => (state.canAfford(cost) ? null : 'Not enough money');

const BUILDERS = {
  event(state, visit) {
    return visit.event.choices.map((c) => ({
      label: c.label,
      cost: c.cost,
      gain: c.gain,
      disabledReason: visit.chosen ? 'Already decided' : (c.disabled?.(state) ?? null),
      sound: c.cost ? 'coins' : 'click',
      run: () => {
        visit.chosen = true;
        return c.run(state, visit.ctx);
      },
    }));
  },

  coalDepot(state, visit, def) {
    const price = def.prices.fuelPerUnit;
    const space = Math.floor(state.fuelCapacity - state.fuel);
    const buy = (units) => {
      state.spend(units * price);
      state.addFuel(units);
      return `Shovelled in ${units} fuel for ${money(units * price)}.`;
    };

    const options = def.bundles
      .filter((n) => n < space)
      .map((n) => ({
        label: `Buy ${n} fuel`,
        cost: n * price,
        disabledReason: notEnough(state, n * price),
        sound: 'coins',
        run: () => buy(n),
      }));

    const affordable = Math.floor(state.money / price);
    const fill = Math.min(space, affordable);
    options.push({
      label: fill >= space ? `Fill the tank (+${space})` : `Buy all you can afford (+${fill})`,
      cost: fill * price,
      disabledReason: space < 1 ? 'Tank is full' : fill < 1 ? 'Not enough money' : null,
      sound: 'coins',
      run: () => buy(fill),
    });
    return options;
  },

  town(state, visit, def) {
    const stopId = visit.poi.id;
    const leaving = state.passengersForDropOff(stopId, visit.leg);
    const leavingCount = leaving.reduce((n, g) => n + g.count, 0);
    const fare = state.fareFor(leaving, stopId, visit.leg);
    const cargoValue = state.cargo * def.prices.cargoSellPerUnit;
    // Aboard but booked further on (shown so you know why they stay).
    const onward = state.passengers.filter((g) => g.dest && state.dropOffKind(g, stopId, visit.leg) === 'stay' && g.boardedStop !== stopId);
    const onwardCount = onward.reduce((n, g) => n + g.count, 0);

    const pickUp = (key, dest, label) => {
      const waiting = visit[key] ?? 0;
      const n = Math.min(waiting, state.freeSeats);
      return {
        label: waiting > 0 ? `${label}: pick up ${n || waiting} (${waiting} waiting)` : `${label}: nobody waiting`,
        disabledReason: waiting <= 0 ? 'The platform is empty' : state.freeSeats <= 0 ? 'Carriage is full' : null,
        sound: 'click',
        run: () => {
          state.boardPassengers(n, stopId, dest);
          visit[key] -= n;
          return dest
            ? `${plural(n, 'passenger')} booked through to ${dest.name}. They pay extra, but only get off at a town there.`
            : `${plural(n, 'passenger')} climbed aboard. They pay on arrival at another town.`;
        },
      };
    };

    const options = [
      {
        label: leavingCount ? `Drop off ${plural(leavingCount, 'passenger')}` : 'Drop off passengers',
        gain: leavingCount ? fare : undefined,
        disabledReason: leavingCount
          ? null
          : onwardCount
            ? `${onwardCount} aboard are bound for ${onward[0].dest.name}`
            : 'No passengers to drop off',
        sound: 'coins',
        run: () => {
          const { count, fare: paid, missed } = state.dropOffPassengers(stopId, visit.leg);
          const note = missed ? ` (${missed} were carried past their stop and paid half.)` : '';
          return `${plural(count, 'passenger')} paid ${money(paid)} in fares.${note}`;
        },
      },
      {
        label: state.cargo ? `Sell ${state.cargo} cargo` : 'Sell cargo',
        gain: state.cargo ? cargoValue : undefined,
        disabledReason: state.cargo ? null : 'No cargo aboard',
        sound: 'coins',
        run: () => {
          const n = state.removeAllCargo();
          state.earn(n * def.prices.cargoSellPerUnit);
          state.stats.cargoSold += n;
          return `Sold ${n} cargo for ${money(n * def.prices.cargoSellPerUnit)}.`;
        },
      },
      pickUp('waitingPassengers', null, 'Any town'),
    ];
    if (visit.next) options.push(pickUp('throughPassengers', visit.next, `To ${visit.next.name} (×${BALANCE.passengers.throughFareMultiplier} fare)`));
    return options;
  },

  mine(state, visit, def) {
    const price = def.prices.cargoBuyPerUnit;
    const space = state.cargoCapacity - state.cargo;
    const burnPct = Math.round(BALANCE.fuel.cargoBurnPerUnit * 100);
    const load = (n) => {
      state.spend(n * price);
      state.addCargo(n, visit.ore.image);
      return `Loaded ${n} ${visit.ore.name} for ${money(n * price)}. Fuel burn is now +${Math.round((state.burnMultiplier - 1) * 100)}%.`;
    };
    const bundle = Math.min(def.loadBundle, space);
    const fill = Math.min(space, Math.floor(state.money / price));

    return [
      {
        label: `Load ${bundle || def.loadBundle} ${visit.ore.name} (+${burnPct * (bundle || def.loadBundle)}% burn)`,
        cost: bundle * price,
        disabledReason: space <= 0 ? 'Cargo hold is full' : notEnough(state, bundle * price),
        sound: 'coins',
        run: () => load(bundle),
      },
      {
        label: fill >= space ? `Fill the hold (+${space})` : `Load all you can afford (+${fill})`,
        cost: fill * price,
        disabledReason: space <= 0 ? 'Cargo hold is full' : fill <= 0 ? 'Not enough money' : null,
        sound: 'coins',
        run: () => load(fill),
      },
    ];
  },

  workshop(state, visit, def) {
    const price = def.prices.repairPerPoint;
    const missing = Math.ceil(BALANCE.condition.max - state.condition);
    const affordable = Math.floor(state.money / price);
    const points = Math.min(missing, affordable);

    const options = [
      {
        label: points >= missing ? `Full repair (+${missing}% condition)` : `Repair what you can afford (+${points}%)`,
        cost: Math.ceil(points * price),
        disabledReason: missing <= 0 ? 'In perfect shape' : points <= 0 ? 'Not enough money' : null,
        sound: 'click',
        run: () => {
          state.spend(Math.ceil(points * price));
          state.repair(points);
          return `The fitters hammered out ${points}% of wear.`;
        },
      },
    ];

    for (const [id, up] of Object.entries(BALANCE.upgrades)) {
      const level = state.upgradeLevel(id);
      const max = state.upgradeMaxLevel(id);
      const cost = up.costs[level];
      options.push({
        label: level >= max ? `${up.name} (max level)` : `${up.name}: ${up.description} (Lv ${level + 1}/${max})`,
        cost: level >= max ? undefined : cost,
        disabledReason: level >= max ? 'Fully upgraded' : notEnough(state, cost),
        sound: 'coins',
        run: () => {
          state.spend(cost);
          state.applyUpgrade(id);
          return `Fitted: ${up.name} level ${level + 1}.`;
        },
      });
    }
    return options;
  },

  waterTower(state, visit, def) {
    const cost = def.prices.refill;
    const nothingToDo = state.water >= state.waterCapacity - 0.5 && state.heat < 1;
    return [
      {
        label: `Refill water & cool boiler (-${def.heatReduction} heat)`,
        cost,
        disabledReason: nothingToDo ? 'Already topped up' : notEnough(state, cost),
        sound: 'click',
        run: () => {
          state.spend(cost);
          state.refillWater();
          state.coolBoiler(def.heatReduction);
          return 'Tank brimming, boiler hissing happily.';
        },
      },
    ];
  },
};

function randInt(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1));
}
