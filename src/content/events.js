/**
 * Line events: things that happen between stops. The train pulls up and you choose what to do.
 *
 * Each event:
 *   id       unique key
 *   title    heading on the panel
 *   text     what's happening
 *   icon     image key for the panel (an icon-… for now; see ASSETS-TODO.md for event art)
 *   effect   optional animation at the prop: 'steam', 'glow', 'sparks' or 'sand'
 *   prop     image shown beside the line where the train stops (default: event-<id>, cut by
 *            scripts/slice-events.py; leave both out for none)
 *   areas    area ids it can happen in (leave out for anywhere)
 *   weight   how likely it is compared with the others (default 1)
 *   when(state)  optional: only happens if this returns true
 *   choices  [{ label, cost?, gain?, disabled?(state) → reason|null, run(state, ctx) → message }]
 *
 * ctx gives { area, next } (the current area and the next one: { leg, name }) and roll(),
 * a 0..1 random number. Choices change the train through TrainState's methods and fields.
 * How often events happen: BALANCE.events.
 */

const seats = (state, n) => (state.freeSeats >= n ? null : 'Not enough free seats');
const afford = (state, n) => (state.canAfford(n) ? null : 'Not enough money');

export const EVENTS = [
  {
    id: 'stranded-family',
    title: 'Stranded travellers',
    text: 'A family stands by the line with their luggage, waving their hats. Their cart has lost a wheel.',
    icon: 'icon-passengers',
    choices: [
      {
        label: 'Give them a lift (3 passengers, any town)',
        disabled: (s) => seats(s, 3),
        run: (s) => {
          s.boardPassengers(3, -2);
          return 'They climb aboard, full of thanks. They’ll pay their fare at the next town.';
        },
      },
      { label: 'Wave and steam on', run: () => 'You tip your cap and leave them to it.' },
    ],
  },
  {
    id: 'fallen-tree',
    title: 'Tree across the line',
    text: 'A great tree has come down across the rails. The crew eye it gloomily.',
    icon: 'icon-condition',
    areas: ['meadow', 'jungle', 'marsh'],
    choices: [
      {
        label: 'Shove it aside with the buffers (−8% condition)',
        run: (s) => {
          s.condition = Math.max(0, s.condition - 8);
          return 'With a crunch and a shower of leaves, the line is clear. The buffers have seen better days.';
        },
      },
      {
        label: 'Pay a woodcutter to clear it',
        cost: 15,
        disabled: (s) => afford(s, 15),
        run: (s) => {
          s.spend(15);
          return 'A woodcutter appears as if by magic and saws it up in no time.';
        },
      },
    ],
  },
  {
    id: 'abandoned-coal',
    title: 'Abandoned coal wagon',
    text: 'A coal wagon sits in a siding, its owner nowhere to be seen. It’s half full.',
    icon: 'icon-fuel',
    weight: 1.2,
    choices: [
      {
        label: 'Help yourselves (+20 fuel)',
        run: (s, ctx) => {
          s.addFuel(20);
          if (ctx.roll() < 0.3) {
            s.spend(Math.min(s.money, 10));
            return 'You shovel in 20 fuel… and the owner turns up. You pay him £10 to keep the peace.';
          }
          return 'You shovel 20 fuel into the tender. Nobody seems to mind.';
        },
      },
      { label: 'Leave it be', run: () => 'Honesty is its own reward. Probably.' },
    ],
  },
  {
    id: 'pedlar',
    title: 'Pedlar’s cart',
    text: 'A pedlar has set up beside the line with sacks of coal and a barrel of water, at pedlar’s prices.',
    icon: 'icon-money',
    choices: [
      {
        label: 'Buy 15 fuel',
        cost: 25,
        disabled: (s) => afford(s, 25) ?? (s.fuel >= s.fuelCapacity - 1 ? 'Tank is full' : null),
        run: (s) => {
          s.spend(25);
          s.addFuel(15);
          return '15 fuel, and a sermon on the price of coal these days.';
        },
      },
      {
        label: 'Fill the boiler',
        cost: 8,
        disabled: (s) => afford(s, 8) ?? (s.water >= s.waterCapacity - 1 ? 'Boiler is full' : null),
        run: (s) => {
          s.spend(8);
          s.refillWater();
          return 'The boiler gurgles happily.';
        },
      },
      {
        label: 'Sell him your cargo (£4 a unit)',
        disabled: (s) => (s.cargo ? null : 'No cargo aboard'),
        run: (s) => {
          const n = s.removeAllCargo();
          s.earn(n * 4);
          return `He takes ${n} cargo off your hands for £${n * 4}. Less than a town would pay.`;
        },
      },
      { label: 'No thank you', run: () => 'He shrugs and goes back to his pipe.' },
    ],
  },
  {
    id: 'snowdrift',
    title: 'Snowdrift',
    text: 'The wind has piled snow across the line, higher than the buffers.',
    icon: 'icon-water',
    areas: ['snow'],
    weight: 1.5,
    choices: [
      {
        label: 'Ram it (−10% condition)',
        run: (s) => {
          s.condition = Math.max(0, s.condition - 10);
          return 'The engine bursts through in a cloud of white. Something rattled loose.';
        },
      },
      {
        label: 'Dig through (−6 fuel keeping the fire up)',
        run: (s) => {
          s.fuel = Math.max(0.5, s.fuel - 6);
          return 'An hour of shovelling later, you’re through. The boiler kept everyone warm, at least.';
        },
      },
    ],
  },
  {
    id: 'hot-spring',
    effect: 'steam',
    title: 'Hot spring',
    text: 'Steam rises from a spring beside the line. The water is warm and clean.',
    icon: 'icon-water',
    areas: ['snow', 'jungle'],
    choices: [
      {
        label: 'Fill the boiler and cool off',
        run: (s) => {
          s.refillWater();
          s.coolBoiler(40);
          return 'Boiler full, crew refreshed. A fine stop.';
        },
      },
    ],
  },
  {
    id: 'sandstorm',
    effect: 'sand',
    title: 'Sandstorm',
    text: 'A wall of red sand rolls towards the line. Sand in the works is bad news.',
    icon: 'icon-heat',
    areas: ['desert'],
    weight: 1.5,
    choices: [
      {
        label: 'Shutter up and wait it out',
        run: (s) => {
          s.water = Math.max(0, s.water - 15);
          return 'You wait in the dark as sand hisses past. The boiler drank 15 water keeping steam up.';
        },
      },
      {
        label: 'Push on through (−8% condition)',
        run: (s) => {
          s.condition = Math.max(0, s.condition - 8);
          return 'You emerge sand-blasted but on time.';
        },
      },
    ],
  },
  {
    id: 'oasis',
    title: 'Oasis',
    text: 'Palms and a still pool, right beside the line. The crew are already off the footplate.',
    icon: 'icon-water',
    areas: ['desert'],
    choices: [
      {
        label: 'Top up the water',
        run: (s) => {
          s.refillWater();
          return 'Water brimming. The crew are in no hurry to leave.';
        },
      },
    ],
  },
  {
    id: 'monkeys',
    title: 'Monkey business',
    text: 'A troop of monkeys has boarded the wagon and is making off with your cargo!',
    icon: 'icon-cargo',
    areas: ['jungle'],
    weight: 1.5,
    when: (s) => s.cargo > 0,
    choices: [
      {
        label: 'Bribe them with fruit',
        cost: 5,
        disabled: (s) => afford(s, 5),
        run: (s) => {
          s.spend(5);
          return 'The monkeys accept the fruit and leave your cargo alone. Mostly.';
        },
      },
      {
        label: 'Chase them off',
        run: (s, ctx) => {
          const lost = Math.min(s.cargo, 2 + Math.floor(ctx.roll() * 4));
          s.addCargo(-lost);
          if (s.cargo <= 0) s.removeAllCargo();
          return `After a lot of shouting, you count the losses: ${lost} cargo gone.`;
        },
      },
    ],
  },
  {
    id: 'marsh-lights',
    effect: 'glow',
    title: 'Lights in the mist',
    text: 'Pale lights bob out in the marsh. The fireman swears they’re lanterns; the driver isn’t so sure.',
    icon: 'icon-heat',
    areas: ['marsh'],
    weight: 1.5,
    choices: [
      {
        label: 'Go and look',
        run: (s, ctx) => {
          if (ctx.roll() < 0.55) {
            s.earn(30);
            return 'A smugglers’ cache, long forgotten! You find £30 in a tin box.';
          }
          s.condition = Math.max(0, s.condition - 6);
          return 'The lights vanish. On the way back, someone puts a boot through a rotten sleeper (−6% condition).';
        },
      },
      { label: 'Keep to the line', run: () => 'Wise. The lights follow you for a while, then fade.' },
    ],
  },
  {
    id: 'toll-bridge',
    title: 'Toll bridge',
    text: 'A man in a very official hat has lowered a barrier across the bridge.',
    icon: 'icon-money',
    areas: ['coast', 'town', 'meadow'],
    choices: [
      {
        label: 'Pay the toll',
        cost: 10,
        disabled: (s) => afford(s, 10),
        run: (s) => {
          s.spend(10);
          return 'He raises the barrier with great ceremony.';
        },
      },
      {
        label: 'Take the long way round (−8 fuel)',
        run: (s) => {
          s.fuel = Math.max(0.5, s.fuel - 8);
          return 'A long detour later, you rejoin the line.';
        },
      },
    ],
  },
  {
    id: 'mail-sack',
    title: 'Lost mail sack',
    prop: 'cargo-sacks',
    text: 'A mail sack lies by the track, fallen from some other train.',
    icon: 'icon-cargo',
    choices: [
      {
        label: 'Take it to the post office',
        run: (s) => {
          s.earn(20);
          return 'You hand it in at the next halt. A reward of £20 is pressed into your hand.';
        },
      },
      { label: 'Leave it', run: () => 'Someone else will find it.' },
    ],
  },
  {
    id: 'shipwreck',
    title: 'Wreck on the shore',
    text: 'Below the line, a wrecked ship lies on the rocks with crates spilling from its hold.',
    icon: 'icon-cargo',
    areas: ['coast'],
    weight: 1.5,
    choices: [
      {
        label: 'Salvage the crates (+6 cargo)',
        disabled: (s) => (s.cargo >= s.cargoCapacity ? 'Cargo hold is full' : null),
        run: (s) => {
          s.addCargo(6, 'crates');
          return 'You haul up 6 crates of salvage to sell at the next town.';
        },
      },
      { label: 'Leave it to the gulls', run: () => 'The gulls approve.' },
    ],
  },
  {
    id: 'street-urchins',
    title: 'Coal thieves',
    text: 'While you take on water at a standpipe, urchins are filling their pockets from your tender.',
    icon: 'icon-fuel',
    areas: ['town'],
    weight: 1.5,
    when: (s) => s.fuel > 15,
    choices: [
      {
        label: 'Let them have a little',
        run: (s) => {
          s.fuel -= 5;
          return 'They scamper off with 5 fuel and a cheeky grin.';
        },
      },
      {
        label: 'Give chase',
        run: (s, ctx) => (ctx.roll() < 0.5 ? 'You catch them and get it all back.' : ((s.fuel -= 10), 'They’re too quick: 10 fuel gone.')),
      },
    ],
  },
];
