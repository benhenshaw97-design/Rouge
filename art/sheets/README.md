# Art sheets

The original uploads, renamed so the name says what's on them. `scripts/slice-art.py` cuts the
game's images out of these into `assets/`. Sheets marked *not used yet* haven't been cut.

| Area | Sheets |
|---|---|
| Meadow (in game) | master-sheet, variants-sheet, parallax-kit-a/b/c, train-bodies*, wheel-*, rails, grass-embankment, foreground-grass-*, icons-ground-sky, carriage-and-underframes, goods-wagons, cargo-*; *not used yet:* meadow-stations, victorian-station-props |
| Desert (in game) | desert-kit-transparent, desert-embankment, desert-foreground, desert-stops, desert-props; *not used yet:* desert-kit-2, desert-stations, desert-train-kit |
| Tunnel (in game) | mountain-peak, mountain-foothill, mountain-base-strip, mountain-rock-band, tunnel-portal, tunnel-rock-bank, transition-foreground-rocks |
| Snow (in game, cut by `scripts/slice-areas.py`) | snow-kit, snow-kit-b, snow-scenery-rows, snow-village-strip(-b), snow-props(-b), snow-embankment, snow-foreground-rows, snow-stops(-b), snow-stations, snow-train-kit |
| Jungle (in game, cut by `scripts/slice-areas.py`) | jungle-kit(-b/-c/-d), jungle-layers, jungle-trees, jungle-embankment, jungle-foreground-rows, jungle-stops, tropical-stops(-b) |
| Marsh (in game, cut by `scripts/slice-areas.py`) | marsh-kit(-b), marsh-props, marsh-embankment, marsh-foreground-rows, marsh-stations, marsh-train-kit |
| Coast (in game, cut by `scripts/slice-areas.py`) | coast-kit, coast-sea, coast-props, coast-embankment, coast-foreground-rows, coast-stops |
| Victorian town (in game, cut by `scripts/slice-areas.py`) | town-kit, town-layers, town-embankment, town-foreground-rows |

Most of the new sheets have a painted magenta or checker background rather than real transparency;
the slicing script can remove it, but transparent PNGs cut more cleanly.
