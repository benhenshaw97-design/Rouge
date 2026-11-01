// Validate asset references before running or deploying the game.
// Run: npm run check:assets
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { IMAGES, AUDIO, MUSIC } from '../src/config/assets.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const warnings = [];
const check = (key, path) => {
  if (typeof path !== 'string' || !path.trim()) {
    errors.push(`${key}: missing or invalid asset path`);
  } else if (!existsSync(resolve(root, 'assets', path))) {
    errors.push(`${key}: assets/${path} does not exist`);
  }
};

for (const [key, path] of Object.entries(IMAGES)) check(`image "${key}"`, path);
for (const [key, path] of Object.entries(AUDIO)) check(`sound "${key}"`, path);
for (const [index, path] of MUSIC.entries()) check(`music track ${index + 1}`, path);

const art = JSON.parse(readFileSync(resolve(root, 'src/config/area-art.json'), 'utf8'));
for (const [key, data] of Object.entries(art)) {
  if (key === 'tunnelOpening') continue;
  if (!Object.hasOwn(IMAGES, key)) {
    errors.push(`area-art.json: "${key}" has measurements but no image registered in assets.js`);
  }
  if (!Number.isFinite(data.height) || data.height <= 0) {
    errors.push(`area-art.json: "${key}" needs a positive numeric height`);
  }
}

// Check the shared scenery layers that every area uses unless overridden.
const sharedLayers = [
  'sky', 'clouds', 'mountains', 'hills', 'trees', 'village',
  'ground', 'rails', 'foreground-back', 'foreground',
];
for (const key of sharedLayers) {
  if (!Object.hasOwn(IMAGES, key)) errors.push(`shared scenery layer "${key}" is not registered`);
}

// Check all five stop types and a platform for the currently implemented desert area.
const desertLayers = [
  'desert-mesas', 'desert-dunes', 'desert-rocks', 'desert-village',
  'desert-ground', 'desert-foreground-back', 'desert-foreground',
];
const desertStops = [
  'desert-coal-depot', 'desert-town', 'desert-mine',
  'desert-workshop', 'desert-water-tower', 'desert-platform',
];
for (const key of [...desertLayers, ...desertStops]) {
  if (!Object.hasOwn(IMAGES, key)) errors.push(`desert area: missing image registration "${key}"`);
}
for (const key of desertLayers) {
  if (!Object.hasOwn(art, key)) warnings.push(`desert area: no size metadata for "${key}"`);
}

console.log(`Checked ${Object.keys(IMAGES).length} images, ${Object.keys(AUDIO).length} sounds and ${MUSIC.length} music tracks.`);
for (const warning of warnings) console.warn(`WARNING: ${warning}`);
for (const error of errors) console.error(`ERROR: ${error}`);
if (errors.length) {
  console.error(`Asset check failed: ${errors.length} error(s).`);
  process.exitCode = 1;
} else {
  console.log('Asset check passed.');
}
