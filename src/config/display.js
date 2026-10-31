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
  { key: 'clouds', factor: 0.04, drift: 8, y: 10, height: 240, depth: DEPTH.clouds },
  { key: 'mountains', factor: 0.08, y: 226, height: 215, depth: DEPTH.mountains },
  { key: 'hills', factor: 0.16, y: 330, height: 150, depth: DEPTH.hills },
  { key: 'trees', factor: 0.3, y: 376, height: 198, depth: DEPTH.trees },
  { key: 'village', factor: 0.5, y: 372, height: 207, depth: DEPTH.village },
  { key: 'ground', factor: 1, y: 572, height: 1500, tileHeight: 160, depth: DEPTH.ground },
  // Track art: the rail's top edge is 2 px from the top of the image (x1.25 scale).
  { key: 'track', factor: 1, y: RAIL_Y - 2.5, height: 104, depth: DEPTH.track },
  { key: 'foreground', factor: 1.35, y: 618, height: 118, depth: DEPTH.foreground },
];

/**
 * The train, listed from the back to the front (the locomotive is last). All measurements are
 * design pixels relative to each car's top-left corner.
 *  width/height: on-screen size of the car body image
 *  bodyLift: gap between the rail and the bottom of the body image
 *  wheels: x = centre of the wheel from the car's left edge, r = radius, behind = drawn behind
 *          the body, driver = joined by the coupling rod
 *  heap: a load drawn on top of the car that grows with `fill` ('fuel' or 'cargo')
 */
const TENDER_WHEELS = [
  { x: 58, r: 11 },
  { x: 84, r: 11 },
  { x: 141, r: 11 },
  { x: 167, r: 11 },
];

export const TRAIN_LAYOUT = {
  gap: 0,
  bobAmount: 0.8,
  cars: [
    {
      key: 'wagon',
      width: 208.5,
      height: 53.6,
      bodyLift: 6,
      wheels: TENDER_WHEELS,
      heap: { key: 'cargo-load', x: 29.8, y: 0.5, width: 147.5, height: 17.5, fill: 'cargo' },
    },
    {
      key: 'tender',
      width: 208.5,
      height: 53.6,
      bodyLift: 6,
      wheels: TENDER_WHEELS,
      heap: { key: 'coal-heap', x: 29.8, y: 0.5, width: 147.5, height: 17.5, fill: 'fuel' },
    },
    {
      key: 'locomotive',
      width: 300,
      height: 97.3,
      bodyLift: 5,
      wheels: [
        { x: 44.6, r: 10.6, behind: true },
        { x: 93.5, r: 20.2, driver: true },
        { x: 138.1, r: 20.2, driver: true },
        { x: 182.8, r: 20.2, driver: true },
        { x: 233.8, r: 11.7, behind: true },
      ],
      chimney: { x: 247, y: 4 },
      crankRadius: 8,
      // Coupling rod image: where its two pivot holes are, as fractions of the image size.
      rod: { key: 'coupling-rod', leftEye: { x: 0.055, y: 0.48 }, eyeSpan: 0.847, aspect: 129 / 815 },
      // Where the connecting rod meets the piston (design px from the car's left edge / the rail).
      crosshead: { x: 228, aboveRail: 23 },
    },
  ],
};

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
