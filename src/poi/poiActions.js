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

/** Per-stop data that lasts while you're parked (e.g. a town's waiting passengers). */
export function createVisit(poi) {
  const def = POI_TYPES[poi.type];
  const visit = { poi, def };
  if (def.waitingPassengers) visit.waitingPassengers = randInt(...def.waitingPassengers);
  if (def.ores) visit.ore = def.ores[randInt(0, def.ores.length - 1)];
  return visit;
}

export function buildOptions(state, visit) {
  const builder = BUILDERS[visit.poi.type];
  return builder ? builder(state, visit, visit.def) : [];
}

const money = (n) => `£${Math.round(n)}`;
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const notEnough = (state, cost) => (state.canAfford(cost) ? null : 'Not enough money');

const BUILDERS = {
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
    const leaving = state.passengersForDropOff(stopId);
    const leavingCount = leaving.reduce((n, g) => n + g.count, 0);
    const fare = state.fareFor(leaving);
    const cargoValue = state.cargo * def.prices.cargoSellPerUnit;
    const boardable = Math.min(visit.waitingPassengers, state.freeSeats);

    return [
      {
        label: leavingCount ? `Drop off ${plural(leavingCount, 'passenger')}` : 'Drop off passengers',
        gain: leavingCount ? fare : undefined,
        disabledReason: leavingCount ? null : 'No passengers to drop off',
        sound: 'coins',
        run: () => {
          const { count, fare: paid } = state.dropOffPassengers(stopId);
          return `${plural(count, 'passenger')} paid ${money(paid)} in fares.`;
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
          return `Sold ${n} cargo for ${money(n * def.prices.cargoSellPerUnit)}.`;
        },
      },
      {
        label:
          visit.waitingPassengers > 0
            ? `Pick up ${plural(boardable || visit.waitingPassengers, 'passenger')} (${visit.waitingPassengers} waiting)`
            : 'Pick up passengers',
        disabledReason:
          visit.waitingPassengers <= 0 ? 'The platform is empty' : state.freeSeats <= 0 ? 'Carriage is full' : null,
        sound: 'click',
        run: () => {
          state.boardPassengers(boardable, stopId);
          visit.waitingPassengers -= boardable;
          return `${plural(boardable, 'passenger')} climbed aboard. They pay on arrival at another town.`;
        },
      },
    ];
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
