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
| `backgrounds/` | `sky`, `clouds`, `mountains`, `hills`, `trees`, `village`, `ground` (grass bank), `rails`, `foreground` | Scrolling layers. Each must tile left-to-right |
| `sprites/`     | `locomotive`, `tender`, `wagon`, `carriage`                   | Each car is its body drawn over its underframe, facing right, **without wheels** |
|                | `coal-heap`                                                   | Coal on the tender (shrinks as fuel burns) |
|                | `cargo-*`                                                     | Loads for the modular cargo wagon (gold, gems, logs, crates...)          |
|                | `wheel`, `coupling-rod`                                       | The wheel spins; the rod rides the crank pins                           |
|                | `points`, `smoke`, `junction-signpost`, `platform`            | Junction points, smoke puff and line-side scenery                        |
| `pois/`        | `coal-depot`, `town`, `mine`, `workshop`, `water-tower`, each with `-a` and `-b` versions | One of the three looks is picked at random for each stop |
| `ui/`          | `icon-*`                                                      | HUD and menu icons                                                       |
|                | `button-<colour>`, `-hover`, `-pressed`                       | Stretched as 9-slices for every button and panel                         |
| `audio/music/` | `trains-1.mp3` … `trains-4.mp3`                               | Your music, played in a shuffled order. Add more and list them in `MUSIC` in `src/config/assets.js` |
| `audio/`       | `chuff`, `whistle`, `brake`, `coins`, `click`, `warning`      | Placeholder sound effects: upload your own with the same names           |

Car sizes, wheel positions (centred on each underframe's axle hangers), the rail line and where
the loads sit are measured by the slicing script and saved to `src/config/train-art.json`. If you
replace a car image by hand with one whose wheels are elsewhere, edit that file to match.

The original music (Opus in `.m4a`, which iPhones don't reliably play) is kept in `art/music/`;
the game uses MP3 copies made with `ffmpeg -i in.m4a -b:a 112k out.mp3`.
Volumes are in `AUDIO_VOLUME` in `src/config/assets.js`.

## Uploading on GitHub

1. Open the folder you want, such as `assets/sprites`.
2. Click **Add file → Upload files**.
3. Drag in a file with the **same name** as the one you're replacing and click **Commit changes**.

New sprite sheets go in `art/sheets/`. Ask for them to be sliced in, since sheets need cutting
up before the game can use them.
