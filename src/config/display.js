// Screen layout and "feel" settings: where things sit on screen and how the parallax moves.
// Gameplay/balance numbers live in balance.js instead.

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

/** Screen y of the top of the rail. Wheels sit on this line. */
export const RAIL_Y = 560;

/** How many screen pixels one metre of track occupies. Higher = world feels faster. */
export const PX_PER_METRE = 8;

/** Screen x of the locomotive's nose. The train never moves on screen; the world does. */
export const TRAIN_FRONT_X = 700;

/** Draw order. Higher numbers are drawn on top. */
export const DEPTH = {
  sky: 0,
  clouds: 1,
  hillsFar: 2,
  hillsMid: 3,
  buildings: 4,
  ground: 5,
  branchLine: 5.5,
  track: 6,
  trainBack: 9,
  train: 10,
  wheels: 11,
  rods: 12,
  smoke: 13,
  foreground: 40,
  signposts: 50,
  hud: 100,
  panel: 110,
  overlay: 120,
};

/**
 * Parallax layers, back to front.
 *  factor: 0 = never moves, 1 = moves with the track, >1 = moves faster (in front of the train)
 *  drift:  extra pixels/second the layer moves even when the train is stopped (e.g. clouds)
 *  y / height: where the layer is drawn. Art is scaled to this height, so replacement art
 *              of a different size still fits.
 */
export const PARALLAX_LAYERS = [
  { key: 'sky', factor: 0, y: 0, height: 720, depth: DEPTH.sky, tile: false },
  { key: 'clouds', factor: 0.04, drift: 6, y: 40, height: 240, depth: DEPTH.clouds },
  { key: 'hills-far', factor: 0.12, y: 270, height: 260, depth: DEPTH.hillsFar },
  { key: 'hills-mid', factor: 0.35, y: 336, height: 240, depth: DEPTH.hillsMid },
  { key: 'ground', factor: 1, y: 568, height: 152, depth: DEPTH.ground },
  { key: 'track', factor: 1, y: RAIL_Y - 8, height: 40, depth: DEPTH.track },
  { key: 'foreground', factor: 1.35, y: 630, height: 90, depth: DEPTH.foreground },
];

/**
 * The train, listed from the back to the front (the locomotive is last).
 * width/height: on-screen size of each car body (art is scaled to fit).
 * wheels: x is measured from the car's left edge; r is the radius in pixels.
 * Add another carriage by adding another entry here and an image in assets/config.
 */
export const TRAIN_LAYOUT = {
  gap: 8,
  bodyLift: 6,
  bobAmount: 1.2,
  cars: [
    {
      key: 'wagon',
      role: 'cargo',
      width: 120,
      height: 60,
      wheels: [{ x: 26, r: 12 }, { x: 94, r: 12 }],
      // Where the cargo heap sits: its bottom edge, in pixels down from the car's top.
      load: { y: 22, width: 104, height: 30 },
    },
    {
      key: 'carriage',
      role: 'passengers',
      width: 170,
      height: 90,
      wheels: [{ x: 30, r: 12 }, { x: 54, r: 12 }, { x: 116, r: 12 }, { x: 140, r: 12 }],
    },
    {
      key: 'tender',
      width: 110,
      height: 80,
      wheels: [{ x: 28, r: 13 }, { x: 82, r: 13 }],
    },
    {
      key: 'locomotive',
      width: 220,
      height: 140,
      wheels: [
        { x: 50, r: 22, driver: true },
        { x: 100, r: 22, driver: true },
        { x: 150, r: 22, driver: true },
        { x: 196, r: 12 },
      ],
      chimney: { x: 177, y: 18 },
      crankRadius: 9,
    },
  ],
};

/** Largest size a POI building is drawn at (art is scaled down to fit, never stretched). */
export const POI_BUILDING_MAX = { width: 320, height: 280 };

export const FONT = '"Trebuchet MS", "Segoe UI", Helvetica, Arial, sans-serif';
