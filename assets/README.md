# Art & Audio Assets

Everything the game draws or plays lives here. The files are served exactly as they are, so
to use your own art just **replace a file with one of the same name**.

If your replacement is a different format (say `locomotive.png` instead of `locomotive.svg`),
also update its path in [`src/config/assets.js`](../src/config/assets.js). SVG, PNG, JPG and
WebP work for images; WAV, MP3 and OGG for audio.

Art is scaled to fit its slot, so sizes don't need to match exactly. The sizes below are what
the placeholders use; matching the proportions will look best.

| Folder         | File                                                   | Size (px)  | Notes                                                    |
|----------------|--------------------------------------------------------|------------|----------------------------------------------------------|
| `backgrounds/` | `sky.svg`                                              | 1280 × 720 | Static, doesn't scroll                                   |
|                | `clouds.svg`                                           | 1024 × 240 | Tiles horizontally, transparent background               |
|                | `hills-far.svg`                                        | 1024 × 260 | Tiles horizontally, slowest layer                        |
|                | `hills-mid.svg`                                        | 1024 × 240 | Tiles horizontally, trees/buildings                      |
|                | `ground.svg`                                           | 512 × 152  | Tiles horizontally, the embankment under the track       |
|                | `track.svg`                                            | 256 × 40   | Tiles horizontally, **rail top at y = 8**                |
|                | `foreground.svg`                                       | 1024 × 90  | Tiles horizontally, drawn in front of the train          |
| `sprites/`     | `locomotive.svg`                                       | 220 × 140  | Facing right, no wheels (wheels are separate)            |
|                | `tender.svg`, `carriage.svg`, `wagon.svg`              | see file   | Facing right, no wheels                                  |
|                | `wheel.svg`                                            | 64 × 64    | Spins; spokes make the rotation visible                  |
|                | `smoke.svg`                                            | 64 × 64    | One puff, soft edges                                     |
|                | `cargo-load.svg`                                       | 104 × 26   | Heap shown in the wagon when carrying cargo              |
|                | `branch-line.svg`, `points-lever.svg`                  | see file   | Junction graphics                                        |
| `pois/`        | `coal-depot.svg`, `town.svg`, `mine.svg`, `workshop.svg`, `water-tower.svg` | 320 × 280 | Buildings; bottom edge sits on the ground |
| `ui/`          | `signpost.svg`                                         | 240 × 250  | Text is drawn over the board (top 110 px)                |
|                | `icon-*.svg`                                           | 48 × 48    | HUD and signpost icons                                   |
| `audio/`       | `music-loop.wav`                                       |            | Loops forever                                            |
|                | `chuff.wav`, `whistle.wav`, `brake.wav`, `coins.wav`, `click.wav`, `warning.wav` | | Sound effects |

Wheel positions and car sizes are set in `TRAIN_LAYOUT` in `src/config/display.js`. Update
them if your train art has its wheels in different places. Volumes are in `AUDIO_VOLUME` in
`src/config/assets.js`.

## Uploading on GitHub

1. Open the folder you want, such as `assets/sprites`.
2. Click **Add file → Upload files**.
3. Drag in a file with the **same name** as the one you're replacing and click **Commit changes**.

Deleted a placeholder by mistake? Run `npm run placeholders` to recreate any missing files.
It never overwrites existing ones.
