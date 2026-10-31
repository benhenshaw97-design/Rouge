# Art & Audio Assets

Everything the game draws or plays lives here, and is served exactly as it is.

## Where the art comes from

The PNGs here are cut from your sprite sheets in [`art/sheets/`](../art/sheets) by
[`scripts/slice-art.py`](../scripts/slice-art.py). That script crops the train, wheel, rods,
buildings, icons and buttons, and builds seamless scrolling layers from the loose cloud,
mountain, hill, tree, village, hedge, track and ground pieces.

To re-cut everything after changing a sheet: `python3 scripts/slice-art.py` (needs Pillow and numpy).

## Replacing a single image

Upload a file with the **same name** over the one you want to change. If it's a different
format, also update its path in [`src/config/assets.js`](../src/config/assets.js). Art is
scaled to fit its slot, so sizes don't need to match exactly. Matching the proportions looks best.

Don't re-run the slicing script after hand-replacing a file, or it will be overwritten.

| Folder         | Files                                                         | Notes                                                                   |
|----------------|---------------------------------------------------------------|-------------------------------------------------------------------------|
| `backgrounds/` | `sky`, `clouds`, `mountains`, `hills`, `trees`, `village`, `ground`, `track`, `foreground` | Scrolling layers. Each must tile left-to-right. The rail's top edge is 2 px from the top of `track.png` |
| `sprites/`     | `locomotive`, `tender`, `wagon`                               | Train bodies, facing right, **without wheels**                           |
|                | `coal-heap`, `cargo-load`                                     | Loads on the tender and wagon (they grow and shrink with fuel and cargo) |
|                | `wheel`, `coupling-rod`                                       | The wheel spins; the rod rides the crank pins                           |
|                | `smoke`, `junction-signpost`, `platform`, `branch-line.svg`   | Smoke puff and line-side scenery                                         |
| `pois/`        | `coal-depot`, `town`, `mine`, `workshop`, `water-tower`, each with `-a` and `-b` versions | One of the three looks is picked at random for each stop |
| `ui/`          | `icon-*`                                                      | HUD and menu icons                                                       |
|                | `button-<colour>`, `-hover`, `-pressed`                       | Stretched as 9-slices for every button and panel                         |
| `audio/`       | `music-loop.wav`, `chuff`, `whistle`, `brake`, `coins`, `click`, `warning` | Placeholder sounds: upload your own with the same names     |

Wheel positions, car sizes and where the loads sit are set in `TRAIN_LAYOUT` in
`src/config/display.js`. Update them if replacement train art has its wheels in different places.
Volumes are in `AUDIO_VOLUME` in `src/config/assets.js`.

## Uploading on GitHub

1. Open the folder you want, such as `assets/sprites`.
2. Click **Add file → Upload files**.
3. Drag in a file with the **same name** as the one you're replacing and click **Commit changes**.

New sprite sheets go in `art/sheets/`. Ask for them to be sliced in, since sheets need cutting
up before the game can use them.
