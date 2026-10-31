import AREA_ART from './area-art.json';
import TRAIN_ART from './train-art.json';

// Layout and "feel" settings. Gameplay/balance numbers live in balance.js instead.
//
// The world is laid out in "design pixels" on a 1280 × 720 stage. The camera then zooms and
// positions that stage to suit the screen (wide desktop, phone held sideways, phone upright),
// so nothing here needs to change for different devices.

/** Design stage size. */
export const WORLD_WIDTH = 1280;
export const WORLD_HEIGHT = 720;

/** Design y of the top of the rail. Wheels sit on this line. */
export const RAIL_Y = 560;

/** How many design pixels one metre of track occupies. Higher = world feels faster. */
export const PX_PER_METRE = 8;

/** Design x of the locomotive's front buffer. The train never moves; the world does. */
export const TRAIN_FRONT_X = 800;

/** Draw order. Higher numbers are drawn on top. */
export const DEPTH = {
  sky: 0,
  clouds: 1,
  mountains: 2,
  hills: 3,
  trees: 3.5,
  village: 3.8,
  buildings: 4,
  tunnel: 30,
  platform: 4.5,
  ground: 5,
  branchLine: 5.5,
  track: 6,
  lineside: 6.5,
  trainBack: 9,
  heaps: 9.5,
  train: 10,
  wheels: 11,
  rods: 12,
  smoke: 13,
  foreground: 40,
};

/**
 * Parallax layers, back to front.
 *  factor: 0 = never moves, 1 = moves with the track, >1 = moves faster (in front of the train)
 *  drift:  extra pixels/second the layer moves even when stopped (e.g. clouds)
 *  y / height: design-pixel position. Art is scaled to this height, so replacement art of a
 *              different size still fits.
 *  extendUp / extendDown: stretch the layer beyond the stage for very tall screens.
 */
export const PARALLAX_LAYERS = [
  { key: 'sky', factor: 0, y: -1200, height: 1920, depth: DEPTH.sky, tile: false },
  // The cloud strip is opaque sky; sky.png's colours match its top and bottom rows (y 20..290).
  { key: 'clouds', factor: 0.04, drift: 8, y: 20, height: 270, depth: DEPTH.clouds },
  { key: 'mountains', factor: 0.08, y: 226, height: 215, depth: DEPTH.mountains },
  { key: 'hills', factor: 0.16, y: 330, height: 150, depth: DEPTH.hills },
  { key: 'trees', factor: 0.3, y: 376, height: 198, depth: DEPTH.trees },
  { key: 'village', factor: 0.5, y: 372, height: 207, depth: DEPTH.village },
  // Grass bank under the line (its top sits just below the rail so the sleepers rest in the grass).
  { key: 'ground', factor: 1, y: RAIL_Y + 6, height: 1500, tileHeight: 168.6, depth: DEPTH.ground },
  // The rails, positioned so the rail's top edge is RAIL_Y.
  { key: 'rails', factor: 1, y: RAIL_Y - TRAIN_ART.rails.railTop, height: TRAIN_ART.rails.height, depth: DEPTH.track },
  // Grass, flowers and bushes along the bottom of the screen, nearer the viewer than the line.
  { key: 'foreground-back', factor: 1.15, y: 706 - 63, height: 63, depth: DEPTH.foreground - 1 },
  { key: 'foreground', factor: 1.35, y: 726 - 81, height: 81, depth: DEPTH.foreground },
];

/**
 * Areas the line passes through, in order (it loops back to the first). Each lists the
 * parallax layers it swaps in: a layer's art and drawn height; its bottom edge stays where
 * PARALLAX_LAYERS puts it (or at `bottom` if given). Layers not listed keep the default art.
 * buildings: stop buildings per POI type (else POI_TYPES' own); platform: platform image for towns.
 */
const areaLayer = (key) => ({ key, height: AREA_ART[key].height });
export const AREAS = [
  { id: 'meadow', name: 'The Meadows', layers: {}, platform: 'platform' },
  {
    id: 'desert',
    name: 'The Red Desert',
    layers: {
      mountains: areaLayer('desert-mesas'),
      // Dunes run down to the line, so sand fills in behind the rocks and village.
      hills: { ...areaLayer('desert-dunes'), bottom: 590 },
      trees: areaLayer('desert-rocks'),
      village: areaLayer('desert-village'),
      ground: { key: 'desert-ground', height: 1500, tileHeight: AREA_ART['desert-ground'].height },
      'foreground-back': areaLayer('desert-foreground-back'),
      foreground: areaLayer('desert-foreground'),
    },
    // Stops here use desert buildings (one look picked at random) and the desert platform.
    buildings: {
      coalDepot: ['desert-coal-depot'],
      town: ['desert-town'],
      mine: ['desert-mine'],
      workshop: ['desert-workshop'],
      waterTower: ['desert-water-tower'],
    },
    platform: 'desert-platform',
  },
];

/**
 * Tunnels between areas: the line runs through a towering peak, with a tunnel mouth at each foot,
 * rocky foothills either side (behind the train) and a grassy rock strip along the peak's base.
 * Heights are design px. The peak must be wider than the train so the whole train fits inside.
 *  opening: where the dark opening is in the tunnel-mouth image (fractions of width/height)
 */
export const TUNNEL = {
  bottom: RAIL_Y + 34,
  peakHeight: 660,
  foothillHeight: 250,
  foothillOverlap: 0.45, // how much of each foothill tucks behind the peak
  baseHeight: 96,
  rockBandHeight: 150, // long low ridge behind the foothills
  // Rock bank filling the bottom of the screen in front of the train, all along the tunnel
  // stretch: its top edge sits at bankTop, and it runs bankMargin past each foothill.
  bankTop: RAIL_Y - 40,
  bankMargin: 900,
  portalHeight: 190,
  opening: { left: 0.216, right: 0.595, top: 0.33 },
};

/**
 * The train, listed from the back to the front (the locomotive is last).
 * Sizes, wheel positions (on the underframes' axle hangers), the rail line and where loads sit
 * all come from train-art.json, which scripts/slice-art.py writes when it cuts the art.
 *  heap.fill: what the heap shows ('fuel')
 *  load: where cargo sits on the cargo wagon's deck
 *  drivers: wheels joined by the coupling rod
 */
export const TRAIN_LAYOUT = {
  gap: 0,
  bobAmount: 0.8,
  /** The camera keeps at least this much of the train (from the front) in view. */
  cameraFocus: 700,
  cars: [
    { key: 'carriage', ...TRAIN_ART.carriage },
    // The cargo wagon shows a load on its deck (cargo-<kind> image) while carrying cargo.
    { key: 'wagon', ...TRAIN_ART.wagon },
    { key: 'tender', ...TRAIN_ART.tender, heap: { ...TRAIN_ART.tender.heap, fill: 'fuel' } },
    {
      key: 'locomotive',
      ...TRAIN_ART.locomotive,
      drivers: true,
      // Coupling rod image: where its two pivot holes are, as fractions of the image size.
      rod: { key: 'coupling-rod', leftEye: { x: 0.055, y: 0.48 }, eyeSpan: 0.847, thickness: 9 },
    },
  ],
};

export const POINTS = TRAIN_ART.points;

/** POI buildings are scaled to this height (design px). */
export const POI_BUILDING_HEIGHT = 235;

/** Pixel font that matches the art, with fallbacks if it can't load. */
export const FONT = '"Pixelify Sans", "Trebuchet MS", "Segoe UI", sans-serif';

/** Colours used by the UI (text, bars, panels). */
export const COLORS = {
  text: '#f6ead2',
  textDim: '#cbb48c',
  textDark: '#2b1d12',
  gold: '#ffd77a',
  good: '#a8f0a0',
  bad: '#ff8a7e',
  panel: 0x1d1612,
  brass: 0xd6a84a,
  trough: 0x0d0a08,
  fuel: 0xe39b2d,
  water: 0x3f8fd8,
  heat: 0xe0782d,
  condition: 0x6dbb5a,
  danger: 0xe0352b,
};
