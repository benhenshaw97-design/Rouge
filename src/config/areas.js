import AREA_ART from './area-art.json';

// Region definitions live here rather than inside display/layout configuration.
// Incomplete regions (such as the marsh) are deliberately NOT enabled until their
// required art is available. Add new region definitions here as assets are prepared.
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
