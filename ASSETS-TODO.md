# Asset to-do list

Tick items off as you upload them. Upload into `assets/` on GitHub (Add file → Upload files),
or tell Claude where they are and it will slice them in.

**General rules:** PNG with real transparency (not a checkerboard drawn into the picture),
side view, vehicles facing **right**. Keep train bodies, underframes and wheels as separate
pieces, like the existing train sheet.

## 1. Needed now (the game is using placeholders)

### Sound effects (`assets/audio/`)
Done with your uploads (see `art/sfx/README.md`). Could still use: a steam hiss for overheating,
and a gentle station ambience (your 37 s steam recording might do for that).

- [x] `chuff.wav`: a single steam "chuff" (under 0.3 s). It plays rapidly in time with the wheels
- [x] `whistle.wav`: departure whistle (1–2 s)
- [x] `brake.wav`: brakes squealing and hissing as the train pulls into a stop (about 1 s)
- [x] `coins.wav`: buying or earning money (under 0.5 s)
- [x] `click.wav`: button tap, points switching (very short)
- [x] `warning.wav`: low-fuel / overheating alert (under 0.5 s)

### Stand-ins I made myself (would look better in your style)
- [x] **Water icon**, **wrench (condition) icon**, **distance icon**: same framed style as the
      coal / fire / coins / people / crate icons
- [x] **Ground / dirt** below the track: a strip that tiles left to right (currently generated noise)
- [x] **Sky** backdrop: tall gradient, can include a sun (currently generated from your colours)
- [x] **Ore load** for the cargo wagon: done with your modular wagon loads (gold, rubies, sapphires)
- [ ] **Branch line**: track continuing off from the end of the points piece, so junctions don't stop short

## 2. Nice to have (would improve what's already there)
- [ ] **Starting station** "Rouge Central": a unique building (it currently reuses the Town)
- [ ] **Passengers** waiting on platforms at Towns (a few small people sprites)
- [ ] **Title logo** for "ROUGE"
- [ ] **App icon / favicon**, 512×512, for the browser tab and phone home screen
- [ ] **Steam effects**: safety-valve steam for overheating; brake sparks
- [ ] **Game-over picture**, e.g. the train stopped with no smoke

## 3. For future features
- [ ] **Breakdowns**: a broken-down loco (smoke, steam leak), a repair crew
- [ ] **Passenger requests**: a speech bubble / ticket icon, and destination icons
- [ ] **Track events**: fallen tree, cows on the line, rockfall, signal post (red/green)
- [ ] **More cargo types**: icons for logs, crates, oil, stone (the matching wagons already exist)
- [ ] **New terrain sets**, each needing sky, mountains, hills, trees, foreground and track bed:
  - [ ] Desert
  - [ ] Snow (you already have a snow track piece)
  - [ ] Coast
  - [ ] Industrial town
- [ ] **Night / sunset** version of the scenery (you already have sunset sky and mountain strips)
- [ ] **Bridge / tunnel** pieces

## Already uploaded but not used yet
You don't need to make these. They're here so nothing gets forgotten.
- Green and blue locomotive variants (could be unlockable paint jobs)
- Sunset skies, autumn trees and foreground variants (good for a time-of-day or seasons feature)
- Snow track and curved rail pieces
- Wheel animation frames, and the flatbed's end views
