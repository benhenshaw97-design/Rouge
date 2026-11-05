import NEW_AREAS from './new-areas.json' with { type: 'json' };

// Every file the game loads, by key. Paths are relative to the /assets folder.
//
// Most images are cut from the sheets in /art/sheets by scripts/slice-art.py.
// To use different art: replace the file with one of the same name, or point the path at a
// new file here. SVG, PNG, JPG and WebP all work for images; WAV, MP3 and OGG for audio.

export const IMAGES = {
  // Snow, jungle, marsh, coast and town areas (written by scripts/slice-areas.py)
  ...NEW_AREAS.images,

  // Parallax background layers (see PARALLAX_LAYERS in display.js)
  sky: 'backgrounds/sky.png',
  clouds: 'backgrounds/clouds.png',
  mountains: 'backgrounds/mountains.png',
  hills: 'backgrounds/hills.png',
  trees: 'backgrounds/trees.png',
  village: 'backgrounds/village.png',
  ground: 'backgrounds/ground.png',
  rails: 'backgrounds/rails.png',
  // Layers only some areas use (e.g. the jungle); empty everywhere else.
  railgrass: 'sprites/blank.png',
  'foreground-trees': 'sprites/blank.png',
  'fog-back': 'sprites/blank.png',
  thicket: 'sprites/blank.png',
  undergrowth: 'sprites/blank.png',
  'fog-front': 'sprites/blank.png',
  'foreground-back': 'backgrounds/foreground-back.png',
  foreground: 'backgrounds/foreground.png',

  // Desert area layers (see AREAS in display.js)
  'desert-mesas': 'backgrounds/desert-mesas.png',
  'desert-dunes': 'backgrounds/desert-dunes.png',
  'desert-rocks': 'backgrounds/desert-rocks.png',
  'desert-village': 'backgrounds/desert-village.png',
  'desert-ground': 'backgrounds/desert-ground.png',
  'desert-foreground-back': 'backgrounds/desert-foreground-back.png',
  'desert-foreground': 'backgrounds/desert-foreground.png',

  // Tunnels between areas: the mountains the line runs through, and the tunnel mouth
  'mountain-peak': 'sprites/mountain-peak.png',
  'mountain-foothill': 'sprites/mountain-foothill.png',
  'mountain-base': 'sprites/mountain-base.png',
  'mountain-rock-band': 'sprites/mountain-rock-band.png',
  'tunnel-rock-bank': 'sprites/tunnel-rock-bank.png',

  // Desert stops (see AREAS in display.js)
  'desert-coal-depot': 'pois/desert-coal-depot.png',
  'desert-town': 'pois/desert-town.png',
  'desert-mine': 'pois/desert-mine.png',
  'desert-workshop': 'pois/desert-workshop.png',
  'desert-water-tower': 'pois/desert-water-tower.png',
  'desert-platform': 'sprites/desert-platform.png',
  'tunnel-portal': 'sprites/tunnel-portal.png',
  'tunnel-portal-exit': 'sprites/tunnel-portal-exit.png',
  'tunnel-portal-front': 'sprites/tunnel-portal-front.png',
  'tunnel-portal-exit-front': 'sprites/tunnel-portal-exit-front.png',

  // Train: each car is its body drawn over its underframe, without wheels.
  // Wheel positions etc. are in src/config/train-art.json (written by scripts/slice-art.py).
  locomotive: 'sprites/locomotive.png',
  tender: 'sprites/tender.png',
  wagon: 'sprites/wagon.png',
  carriage: 'sprites/carriage.png',
  'coal-heap': 'sprites/coal-heap.png',

  // Loads for the cargo wagon (shown on its deck while carrying cargo)
  'cargo-logs': 'sprites/cargo-logs.png',
  'cargo-coal': 'sprites/cargo-coal.png',
  'cargo-crates': 'sprites/cargo-crates.png',
  'cargo-tanker': 'sprites/cargo-tanker.png',
  'cargo-stone': 'sprites/cargo-stone.png',
  'cargo-pipes': 'sprites/cargo-pipes.png',
  'cargo-barrels': 'sprites/cargo-barrels.png',
  'cargo-sacks': 'sprites/cargo-sacks.png',
  'cargo-gold': 'sprites/cargo-gold.png',
  'cargo-red-gems': 'sprites/cargo-red-gems.png',
  'cargo-blue-gems': 'sprites/cargo-blue-gems.png',
  'cargo-trunks': 'sprites/cargo-trunks.png',
  'cargo-tarp': 'sprites/cargo-tarp.png',

  wheel: 'sprites/wheel.png',
  'coupling-rod': 'sprites/coupling-rod.png',
  smoke: 'sprites/smoke.png',

  // Line-side
  points: 'sprites/points.png',
  'junction-signpost': 'sprites/junction-signpost.png',
  platform: 'sprites/platform.png',


  // Points of interest. Each type has several looks; see `buildings` in POI_TYPES (balance.js).
  'poi-coal-depot': 'pois/coal-depot.png',
  'poi-coal-depot-a': 'pois/coal-depot-a.png',
  'poi-coal-depot-b': 'pois/coal-depot-b.png',
  'poi-town': 'pois/town.png',
  'poi-town-a': 'pois/town-a.png',
  'poi-town-b': 'pois/town-b.png',
  'poi-mine': 'pois/mine.png',
  'poi-mine-a': 'pois/mine-a.png',
  'poi-mine-b': 'pois/mine-b.png',
  'poi-workshop': 'pois/workshop.png',
  'poi-workshop-a': 'pois/workshop-a.png',
  'poi-workshop-b': 'pois/workshop-b.png',
  'poi-water-tower': 'pois/water-tower.png',
  'poi-water-tower-a': 'pois/water-tower-a.png',
  'poi-water-tower-b': 'pois/water-tower-b.png',

  // UI icons
  'icon-fuel': 'ui/icon-fuel.png',
  'icon-water': 'ui/icon-water.png',
  'icon-heat': 'ui/icon-heat.png',
  'icon-money': 'ui/icon-money.png',
  'icon-passengers': 'ui/icon-passengers.png',
  'icon-cargo': 'ui/icon-cargo.png',
  'icon-condition': 'ui/icon-condition.png',
  'icon-distance': 'ui/icon-distance.png',

  // UI buttons and frames (drawn as 9-slices, so they stretch to any size)
  'button-brown': 'ui/button-brown.png',
  'button-brown-hover': 'ui/button-brown-hover.png',
  'button-brown-pressed': 'ui/button-brown-pressed.png',
  'button-gold': 'ui/button-gold.png',
  'button-gold-hover': 'ui/button-gold-hover.png',
  'button-gold-pressed': 'ui/button-gold-pressed.png',
  'button-green': 'ui/button-green.png',
  'button-green-hover': 'ui/button-green-hover.png',
  'button-green-pressed': 'ui/button-green-pressed.png',
  'button-red': 'ui/button-red.png',
  'button-red-hover': 'ui/button-red-hover.png',
  'button-red-pressed': 'ui/button-red-pressed.png',
  'button-blue': 'ui/button-blue.png',
  'button-blue-hover': 'ui/button-blue-hover.png',
  'button-blue-pressed': 'ui/button-blue-pressed.png',
};

/** Images drawn with hard pixel edges when enlarged (the 9-slice frames). */
export const PIXEL_PERFECT = Object.keys(IMAGES).filter((k) => k.startsWith('button-') || k.endsWith('-fgtrees'));

/**
 * 9-slice frames: how many pixels from each edge of the image are border (kept unstretched).
 * Keyed by the start of the image key.
 */
export const NINE_SLICE = {
  'button-brown': { left: 16, right: 16, top: 14, bottom: 14 },
  default: { left: 12, right: 12, top: 11, bottom: 11 },
};

/** Background music, played in a shuffled order (streamed, see systems/MusicPlayer.js). */
export const MUSIC = [
  'audio/music/marimba-breakbeat-2.mp3',
  'audio/music/marimba-breakbeat.mp3',
  'audio/music/snes-dub-dreams-2.mp3',
  'audio/music/snes-dub-dreams.mp3',
  'audio/music/steambox-arpeggios.mp3',
  'audio/music/steamy-pixel-dreams-2.mp3',
  'audio/music/steamy-pixel-dreams.mp3',
  'audio/music/trains-1.mp3',
  'audio/music/trains-2.mp3',
  'audio/music/trains-3.mp3',
  'audio/music/trains-4.mp3',
  'audio/music/wandering-pixel-groove.mp3',
];

/**
 * The in-game radio's stations (see systems/MusicPlayer.js and ui/RadioPanel.js): each plays its
 * tracks shuffled. Track titles come from the file names ("trains-3" → "Trains 3") unless given in
 * TRACK_TITLES. The first station is what plays on a first visit.
 */
const track = (name) => `audio/music/${name}.mp3`;
export const RADIO_STATIONS = [
  { id: 'all', name: 'Rouge Radio', blurb: 'A bit of everything', tracks: MUSIC },
  { id: 'steam', name: 'Steam FM', blurb: 'Songs of the line', tracks: ['trains-1', 'trains-2', 'trains-3', 'trains-4', 'steambox-arpeggios'].map(track) },
  { id: 'dreams', name: 'Pixel Dreams', blurb: 'Late-night chiptune', tracks: ['steamy-pixel-dreams', 'steamy-pixel-dreams-2', 'snes-dub-dreams', 'snes-dub-dreams-2'].map(track) },
  { id: 'groove', name: 'Marimba Junction', blurb: 'Breakbeats and grooves', tracks: ['marimba-breakbeat', 'marimba-breakbeat-2', 'wandering-pixel-groove'].map(track) },
];

/**
 * Ambience loops per area (streamed, looping). Areas not listed get a stand-in made on the fly
 * (see systems/Ambience.js). e.g. coast: 'audio/ambience/coast.mp3'
 */
export const AMBIENCE_FILES = {};

/** Nicer titles for particular tracks (by file name without the extension). */
export const TRACK_TITLES = {
  'snes-dub-dreams': 'SNES Dub Dreams',
  'snes-dub-dreams-2': 'SNES Dub Dreams II',
  'steamy-pixel-dreams-2': 'Steamy Pixel Dreams II',
  'marimba-breakbeat-2': 'Marimba Breakbeat II',
};

/**
 * Sound effects. Originals are in art/sfx (Kenney packs are CC0; see art/sfx/README.md).
 */
export const AUDIO = {
  chuff: 'audio/chuff.wav',
  whistle: 'audio/whistle.wav',
  brake: 'audio/brake.wav',
  coins: 'audio/coins.wav',
  click: 'audio/click.wav',
  switch: 'audio/switch.wav',
  warning: 'audio/warning.wav',
};

/** Default volume for each sound (0..1). */
export const AUDIO_VOLUME = {
  music: 0.4,
  chuff: 0.22,
  whistle: 0.5,
  brake: 0.9,
  coins: 0.6,
  click: 0.35,
  switch: 0.45,
  warning: 0.35,
};

/**
 * Art only needed once the line reaches other areas. It isn't waited for at start-up: it loads in
 * the background while you play the meadows (see systems/BackgroundLoader.js).
 */
export const LATER_IMAGES = Object.keys(IMAGES).filter((k) => /^(desert|snow|jungle|marsh|coast|town)-/.test(k));
