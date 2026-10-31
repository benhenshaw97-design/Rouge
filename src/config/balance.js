// ============================================================================================
//  BALANCE & POI DEFINITIONS: every gameplay number lives in this file.
//
//  Units: distances in metres, speeds in metres/second, time in seconds, money in pounds.
//  (The train's top speed of 25 m/s is 90 km/h.)
// ============================================================================================

export const BALANCE = {
  /** What you start each run with. */
  start: {
    fuel: 70,
    water: 100,
    heat: 10,
    money: 50,
    condition: 100,
  },

  train: {
    maxSpeed: 25, // m/s at full steam
    acceleration: 2.2, // m/s² pulling away from a stop
    throttleRampSeconds: 1.5, // how long it takes to open the regulator fully (smooth start)
    brakeDeceleration: 3.0, // m/s² used to plan the stop at a POI
    coastDeceleration: 0.8, // m/s² when out of fuel (rolling resistance)
    overspeedDeceleration: 1.5, // m/s² when forced to slow (overheating / worn train)
    passengerCapacity: 12,
    cargoCapacity: 20,
  },

  fuel: {
    tankCapacity: 100,
    burnPerMetre: 0.014, // fuel used per metre travelled
    burnPerSecond: 0.12, // extra fuel used per second while moving under steam
    cargoBurnPerUnit: 0.03, // each unit of cargo adds 3% to fuel burn
    lowWarningFraction: 0.25, // show the LOW FUEL warning at or below 25% of the tank
  },

  water: {
    capacity: 100,
    usePerMetre: 0.02, // the boiler uses water as you travel; empty = heat climbs fast
  },

  heat: {
    max: 100,
    gainPerSecond: 0.9, // at full speed (scales with speed²)
    coolPerSecond: 0.25, // passive cooling while the boiler has water
    dryBoilerMultiplier: 2.5, // heat gain multiplier when water is empty
    overheatSpeedFactor: 0.4, // when overheated, top speed is limited to 40%
    ventCoolingMultiplier: 3, // while overheated the safety valve vents, cooling 3x faster
    recoverBelow: 70, // overheating ends once heat drops to this
  },

  condition: {
    max: 100,
    wearPerMetre: 0.005, // 0.5% per 100 m
    slowBelow: 50, // below this, top speed starts dropping...
    minSpeedFactor: 0.6, // ...down to 60% of top speed at 0 condition
  },

  passengers: {
    baseFare: 5, // paid per passenger on drop-off
    farePerKm: 3, // plus this per passenger per km carried
  },

  route: {
    /** Distance from a POI to the next junction [min, max]. */
    junctionDistance: [500, 800],
    /** Distance from a junction to the POI down the chosen branch [min, max]. */
    branchDistance: [250, 400],
    /** Signposts appear when the junction is this close. */
    signpostRevealDistance: 360,
    /** Force a Coal Depot onto a signpost if none has been offered for this many junctions. */
    coalDepotGuaranteeEvery: 2,
    /** How far the line runs through each area before a tunnel leads to the next [min, max]. */
    areaLength: [2200, 3200],
    /** The tunnel comes this far after leaving a stop. */
    tunnelAfterDepart: 130,
  },

  upgrades: {
    fuelTank: {
      name: 'Bigger fuel tank',
      description: '+25 fuel capacity',
      costs: [60, 100, 150], // one entry per level; length = max level
      capacityPerLevel: 25,
    },
    boiler: {
      name: 'Efficient boiler',
      description: '-12% fuel burn',
      costs: [70, 120, 180],
      burnReductionPerLevel: 0.12,
    },
  },
};

/**
 * Points of interest.
 *  weight:   how often this type shows up on signposts (relative to the others)
 *  buildings: image keys (see config/assets.js); one is picked at random for each stop
 *  platform: draw a station platform in front of the building
 *  icon:     image key shown on signposts
 *  blurb:    short line shown on the signpost
 *  names:    random place names shown when you arrive
 * The options each POI offers are built in src/poi/poiActions.js using the prices here.
 */
export const POI_TYPES = {
  coalDepot: {
    name: 'Coal Depot',
    blurb: 'Buy fuel',
    description: 'Coal by the shovelful. Top up the tender before the long haul.',
    weight: 3,
    buildings: ['poi-coal-depot', 'poi-coal-depot-a', 'poi-coal-depot-b'],
    icon: 'icon-fuel',
    names: ['Blackheap Sidings', 'Cinder Yard', 'Ashpit Lane', 'Collier’s Halt'],
    prices: { fuelPerUnit: 1 },
    bundles: [10, 25], // quick-buy amounts (a "fill the tank" option is always offered too)
  },

  town: {
    name: 'Town',
    blurb: 'Passengers & trade',
    description: 'Drop off passengers for their fares, sell cargo, and pick up new travellers.',
    weight: 3,
    buildings: ['poi-town', 'poi-town-a', 'poi-town-b'],
    platform: true,
    icon: 'icon-passengers',
    names: ['Millbrook', 'Hartwell', 'Kingsferry', 'Little Rouge', 'Oakham Cross', 'Stourby'],
    prices: { cargoSellPerUnit: 7 },
    waitingPassengers: [3, 10], // [min, max] passengers on the platform
  },

  mine: {
    name: 'Mine',
    blurb: 'Load cargo',
    description: 'Cheap ore to sell at the next Town. Heavy loads burn more fuel.',
    weight: 2,
    buildings: ['poi-mine', 'poi-mine-a', 'poi-mine-b'],
    icon: 'icon-cargo',
    names: ['Deepvein Colliery', 'Redrock Pit', 'Gallows Hill Mine', 'Tinner’s Shaft'],
    prices: { cargoBuyPerUnit: 2 },
    loadBundle: 5,
    // What the mine produces; one is picked per visit. image = cargo-<image> load on the wagon.
    ores: [
      { name: 'gold ore', image: 'gold' },
      { name: 'rubies', image: 'red-gems' },
      { name: 'sapphires', image: 'blue-gems' },
    ],
  },

  workshop: {
    name: 'Workshop',
    blurb: 'Repairs & upgrades',
    description: 'Patch up wear and tear, or fit better parts.',
    weight: 1.5,
    buildings: ['poi-workshop', 'poi-workshop-a', 'poi-workshop-b'],
    icon: 'icon-condition',
    names: ['Rivet & Sons', 'Crankshaft Works', 'Boilerplate Sheds'],
    prices: { repairPerPoint: 0.6 },
  },

  waterTower: {
    name: 'Water Tower',
    blurb: 'Water & cool down',
    description: 'Fill the boiler and let it breathe. Cheap, and keeps the heat down.',
    weight: 2,
    buildings: ['poi-water-tower', 'poi-water-tower-a', 'poi-water-tower-b'],
    icon: 'icon-water',
    names: ['Spring Tank', 'Wellmere Halt', 'Fernside Tower'],
    prices: { refill: 5 },
    heatReduction: 50,
  },
};

/** The station you start each run from (uses the town building art). */
export const START_STATION = {
  name: 'Rouge Central',
  building: 'poi-town',
  platform: true,
  departDelayMs: 1200,
};
