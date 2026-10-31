// Every file the game loads, by key. Paths are relative to the /assets folder.
//
// To use your own art or music: replace the file with one of the same name, or point the
// path at your new file (e.g. change 'sprites/locomotive.svg' to 'sprites/locomotive.png').
// SVG, PNG, JPG and WebP all work for images; WAV, MP3 and OGG for audio.

export const IMAGES = {
  // Parallax background layers (see PARALLAX_LAYERS in display.js)
  sky: 'backgrounds/sky.svg',
  clouds: 'backgrounds/clouds.svg',
  'hills-far': 'backgrounds/hills-far.svg',
  'hills-mid': 'backgrounds/hills-mid.svg',
  ground: 'backgrounds/ground.svg',
  track: 'backgrounds/track.svg',
  foreground: 'backgrounds/foreground.svg',

  // Train (see TRAIN_LAYOUT in display.js)
  locomotive: 'sprites/locomotive.svg',
  tender: 'sprites/tender.svg',
  carriage: 'sprites/carriage.svg',
  wagon: 'sprites/wagon.svg',
  wheel: 'sprites/wheel.svg',
  smoke: 'sprites/smoke.svg',
  'cargo-load': 'sprites/cargo-load.svg',

  // Junctions
  'branch-line': 'sprites/branch-line.svg',
  'points-lever': 'sprites/points-lever.svg',

  // Points of interest (keys are referenced from POI_TYPES in balance.js)
  'poi-coal-depot': 'pois/coal-depot.svg',
  'poi-town': 'pois/town.svg',
  'poi-mine': 'pois/mine.svg',
  'poi-workshop': 'pois/workshop.svg',
  'poi-water-tower': 'pois/water-tower.svg',

  // UI
  signpost: 'ui/signpost.svg',
  'icon-fuel': 'ui/icon-fuel.svg',
  'icon-water': 'ui/icon-water.svg',
  'icon-heat': 'ui/icon-heat.svg',
  'icon-money': 'ui/icon-money.svg',
  'icon-passengers': 'ui/icon-passengers.svg',
  'icon-cargo': 'ui/icon-cargo.svg',
  'icon-condition': 'ui/icon-condition.svg',
  'icon-distance': 'ui/icon-distance.svg',
};

export const AUDIO = {
  music: 'audio/music-loop.wav',
  chuff: 'audio/chuff.wav',
  whistle: 'audio/whistle.wav',
  brake: 'audio/brake.wav',
  coins: 'audio/coins.wav',
  click: 'audio/click.wav',
  warning: 'audio/warning.wav',
};

/** Default volume for each sound (0..1). */
export const AUDIO_VOLUME = {
  music: 0.22,
  chuff: 0.16,
  whistle: 0.45,
  brake: 0.35,
  coins: 0.5,
  click: 0.4,
  warning: 0.45,
};
