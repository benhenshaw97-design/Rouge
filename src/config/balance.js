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
    money: 100,
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
    burnPerMetre: 0.0048, // fuel used per metre travelled
    burnPerSecond: 0.03, // extra fuel used per second while moving under steam
    cargoBurnPerUnit: 0.03, // each unit of cargo adds 3% to fuel burn
    lowWarningFraction: 0.25, // show the LOW FUEL warning at or below 25% of the tank
  },

  water: {
    capacity: 100,
    usePerMetre: 0.004, // the boiler uses water as you travel; empty = heat climbs fast
  },

  heat: {
    max: 100,
    gainPerSecond: 0.45, // at full speed (scales with speed²)
    coolPerSecond: 0.25, // passive cooling while the boiler has water
    restCoolMultiplier: 6, // standing at a stop with the fire damped, it cools 6x faster
    dryBoilerMultiplier: 2.5, // heat gain multiplier when water is empty
    overheatSpeedFactor: 0.4, // when overheated, top speed is limited to 40%
    ventCoolingMultiplier: 3, // while overheated the safety valve vents, cooling 3x faster
    recoverBelow: 70, // overheating ends once heat drops to this
  },

  condition: {
    max: 100,
    wearPerMetre: 0.0016, // 0.16% per 100 m
    slowBelow: 50, // below this, top speed starts dropping...
    minSpeedFactor: 0.6, // ...down to 60% of top speed at 0 condition
    // Breakdowns: below breakdownBelow, the train may break down and stop on the line while the
    // crew patch it up. The chance rises as condition falls (breakdownsPerKmAtZero at 0%).
    breakdownBelow: 40,
    breakdownsPerKmAtZero: 0.3,
    breakdownRepairSeconds: 6,
    breakdownPatch: 6, // condition the crew's patch-up restores
  },

  /**
   * Running out of fuel isn't the end: a relief engine can bring fuel out to you. Each call in
   * a run costs more (the last price repeats); if you can't pay, they take what money you have.
   */
  rescue: {
    fuel: 25,
    costs: [0, 30, 60, 100],
  },

  /** Line events between stops (see src/content/events.js). */
  events: {
    chancePerLeg: 0.55, // chance of an event on the way to each junction
  },

  passengers: {
    baseFare: 5, // paid per passenger on drop-off
    farePerKm: 1.5, // plus this per passenger per km carried (trips are long, so this is modest)
    // Some passengers book through to the next area: they only get off at a town there, and pay
    // this multiple of the normal fare. Carried past it, they get off at the next town for half.
    throughFareMultiplier: 1.8,
    missedStopFareMultiplier: 0.5,
  },

  // Stops are far apart (about 2–3.5 km, a couple of minutes at full steam) so it feels like a
  // journey; fuel, water and wear per metre are low to match: a full tank lasts about 5 stops,
  // a full boiler about 8. Check changes with: node scripts/simulate-runs.mjs
  route: {
    /** Distance from a POI to the next junction [min, max]. */
    junctionDistance: [1500, 2400],
    /** Distance from a junction to the POI down the chosen branch [min, max]. */
    branchDistance: [600, 1000],
    /** Signposts appear when the junction is this close. */
    signpostRevealDistance: 360,
    /** Stops in each area before a tunnel leads to the next (see systems/RouteMap.js). */
    stopsPerArea: 3,
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
    workForFuel: 15, // short of money, the crew can shovel for their keep (once per visit)
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
    waitingPassengers: [2, 6], // [min, max] passengers waiting for any town
    throughPassengers: [2, 6], // [min, max] passengers booked through to the next area
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

/**
 * Place names for stops in each area, by POI type (areas or types not listed use the names in
 * POI_TYPES above, which suit the meadows).
 */
export const STOP_NAMES = {
  badlands: {
    coalDepot: ['Slagheap Sidings', 'Cokeworks Yard', 'Cinder Flats'],
    town: ['Ironhold', 'Smelter’s Rest', 'Gearwick', 'Rustgate', 'Boilerton'],
    mine: ['Great Wheel Pit', 'Ironvein Works', 'Hollow Gear Mine'],
    workshop: ['Furnace Row Works', 'Cogspire Foundry'],
    waterTower: ['Rusty Tank', 'Condenser Halt', 'Dry Gulch Tower'],
  },
  desert: {
    coalDepot: ['Dustbowl Bunkers', 'Scorch Siding', 'Cinderflat Yard'],
    town: ['Mirage Wells', 'Sandhollow', 'Red Mesa', 'Oasis Junction', 'Dry Gulch'],
    mine: ['Sunstone Dig', 'Rattlesnake Pit', 'Copper Butte Mine'],
    workshop: ['Sandblast Works', 'Gearwind Forge'],
    waterTower: ['Last Drop Tank', 'Cactus Spring', 'Dune Cistern'],
  },
  snow: {
    coalDepot: ['Frostcoal Yard', 'Icebox Bunkers', 'Hearthstone Siding'],
    town: ['Whitepeak', 'Frostholm', 'Pinecrest', 'Hollowfrost', 'Glacier Bay'],
    mine: ['Rimeheart Mine', 'Crystal Hollow', 'Glacier Vein'],
    workshop: ['Sleighbell Works', 'Thawforge'],
    waterTower: ['Snowmelt Tank', 'Icicle Tower', 'Frostwell'],
  },
  jungle: {
    coalDepot: ['Vinecoal Depot', 'Mossy Bunkers', 'Canopy Yard'],
    town: ['Emerald Falls', 'Parrot Cove', 'Templeton', 'Vinewood', 'Monkey Bridge'],
    mine: ['Idol’s Eye Mine', 'Jade Hollow', 'Serpent Cave'],
    workshop: ['Rootbound Works', 'Tangleworks'],
    waterTower: ['Rainfall Tank', 'Waterfall Halt', 'Monsoon Tower'],
  },
  marsh: {
    coalDepot: ['Peat Cut Yard', 'Bogside Bunkers', 'Mudlark Siding'],
    town: ['Mistmoor', 'Fenwick', 'Willowmere', 'Bogsworth', 'Reedby'],
    mine: ['Sunken Shaft', 'Bogiron Pit', 'Murkwater Mine'],
    workshop: ['Rustwater Works', 'Lantern Sheds'],
    waterTower: ['Mill Wheel', 'Fen Pump', 'Reedwater Tank'],
  },
  coast: {
    coalDepot: ['Harbour Coal Stage', 'Anchor Yard', 'Tidecoal Siding'],
    town: ['Saltwind', 'Gullhaven', 'Port Mallow', 'Lighthouse Point', 'Crabbe Bay'],
    mine: ['Seacliff Mine', 'Pearl Grotto', 'Smugglers’ Cave'],
    workshop: ['Dockside Works', 'Shipwright Sheds'],
    waterTower: ['Rainbarrel Tank', 'Cliffspring', 'Harbour Tower'],
  },
  town: {
    coalDepot: ['Gasworks Sidings', 'Coalhouse Yard', 'Soot Lane'],
    town: ['Brasswick Central', 'Kingsgate', 'Clocktower Square', 'Victoria Road', 'Foundry Row'],
    mine: ['Underworks Mine', 'Sewer Shaft', 'Old Cellar Pit'],
    workshop: ['Brasswick Foundry', 'Cogsworth & Co'],
    waterTower: ['Waterworks', 'Pumphouse Halt', 'Reservoir Tower'],
  },
};

/**
 * Paint schemes for the train, sold at Workshops (see state/liveries.js). Once bought, a livery
 * is kept for good (across runs); switching to one you already own costs `repaint`.
 */
export const LIVERIES = {
  red: { name: 'Rouge red', price: 0 },
  green: { name: 'Brunswick green', price: 120 },
  blue: { name: 'Midnight blue', price: 150 },
  royal: { name: 'Royal plum', price: 200 },
  gold: { name: 'Golden arrow', price: 300 },
};
export const LIVERY_REPAINT_COST = 10;

/** The station you start each run from (uses the town building art). */
export const START_STATION = {
  name: 'Rouge Central',
  building: 'poi-town',
  platform: true,
  departDelayMs: 1200,
};
