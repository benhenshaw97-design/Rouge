# Master upload inventory

Source: `master` branch. This is a **read-only inventory**, not an asset import.

- 61 PNG files (49 at repository root, 12 in `assets/`).
- 17 WAV, MP3 or M4A audio files.
- Full source filenames and file sizes are in [master-upload-inventory.csv](master-upload-inventory.csv).

## Important

The uploaded PNGs have UUID-style names, which **do not identify their contents**. The GitHub text connector can list files but does not render the binary images for visual inspection. Consequently **no region, sprite role, alpha quality, tileability or dimensions have been guessed** in the CSV. Every asset is marked `awaiting_visual_review`.

## Integration plan

1. Visually inspect/contact-sheet the files before renaming or sorting.
2. Assign each image a descriptive filename, region and role (background layer, foreground strip, POI, platform, prop, etc.).
3. Check actual PNG transparency and edge tiling; do not infer transparency from extension.
4. Copy approved assets selectively to the game branch under `assets/backgrounds/`, `assets/pois/`, or `assets/sprites/`.
5. Register them in `src/config/assets.js`, then configure the region in `src/config/display.js` (or a future dedicated region config).
6. Run `npm run check:assets` once the separate asset-check pull request has been merged.

Do **not** merge `master` wholesale into `train-game`. The game code lives on `train-game` and the raw uploads live on `master`.
