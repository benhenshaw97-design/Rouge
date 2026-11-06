# Asset to-do list

Kept up to date by Claude as art arrives. Status of each item:
- `[x]` **in the game**: uploaded, checked and showing in the game
- `[↑]` **uploaded, awaiting integration**: committed PNGs on the named art branch; not yet checked in game
- `[~]` **made, not uploaded yet**: generated (see ART-PRODUCTION-PROGRESS.md) but not in the repo;
  upload the PNGs to `art/sheets/` (any branch, or with an `art/event-art.json` entry) and they'll go in
- `[ ]` **still needed**

Sections 1–3 are for features already in the game that currently borrow other art; 4 onwards are
for the features still to come (story, train customisation, new stops, new areas).

**Last checked: 2026-11-06 (evening).** Integrated this round, from `codex/art-production-portraits-20261106`
(which includes the objectives branch): 15 character portraits, 6 objective icons, the Complete! ribbon,
the steam-leak animation and the Iron Badlands emblem. Portraits compressed 1.3 MB → 0.3 MB; the unused
combined `*-expressions.png` sheets and `steam-leak.png` strip were left out (the game uses the single files).

**Next artwork to make:** the dialogue box frame and name tag (section 4), then chapter title cards.
Section 3's sounds need an audio workflow.
**Next to upload:** 24 generated PNGs are still only in the ChatGPT chat: section 1's line events and
section 2's route-map art. They're listed in ART-PRODUCTION-PROGRESS.md.

## How to make art that drops straight in
- **Real transparency.** PNG with a transparent background: no checkerboard or white painted in
  (that's what caused the white edges and floating bits).
- **Side view, facing right** for anything on the line.
- **Leave space between pieces** on a sheet (20 px or more), so leaves and flags don't touch a neighbour.
- **One item per thing.** Loose props, not pre-arranged scenes. Separate bodies, underframes and wheels for trains.
- **Similar scale on a sheet**, and roughly in scale with the train (the locomotive is about
  250 px long by 130 px high in game). Say if something is meant to be bigger.
- **Strips that repeat** (ground, foreground, mountains) should join seamlessly left to right.
- **Icons:** square, transparent, readable at 32 px (draw at 64–128 px).
- **Sounds:** short WAV or MP3, trimmed with no silence at the start.

## 1. Line events (in the game now; each shows a stand-in prop until its own art arrives)
A prop beside the track where the train halts. Props with people go on the near bank at about
125 px high in game (a person is about half the engine's height); tall objects stand behind the
wagon (up to 330 × 175); low ones (logs, pools) lie on the bank (up to 230 × 62).
Optional: a square **vignette** (256×256) for each event's panel, replacing the plain icon.
- [x] Stranded family with luggage and a cart missing a wheel (any area)
- [~] Fallen tree across the rails: meadow, jungle and marsh versions
- [~] Abandoned coal wagon in a short siding (half full of coal)
- [x] Pedlar's cart with coal sacks and a water barrel, plus the pedlar
- [~] Snowdrift over the rails (snow)
- [~] Steaming hot spring (snow and jungle). The steam is already animated in game, so the pool alone is enough.
- [~] Sandstorm: a wall of red sand, as a strip that can scroll across the screen (desert)
- [~] Oasis pool with palms (desert)
- [~] Monkeys (3–4 poses) climbing on a wagon (jungle)
- [~] Marsh lights / will-o'-the-wisps (small glowing sprites, 3–4 frames)
- [~] Toll bridge barrier and a toll-keeper in a very official hat (coast, town, meadow)
- [~] Mail sack lying by the track
- [~] Shipwreck on the rocks with crates (coast)
- [~] Coal-thief urchins (2–3 children) (town)
- [~] **Relief engine**: a small tank engine, side view, in the same style as the train (it
      comes to the rescue when you run out of fuel). Will need code to drive it in.

## 2. Route map screen (in the game now, drawn with the HUD icons)
- [~] Parchment or painted map background (tileable, or about 1600×900)
- [~] Round map badges for each stop type (coal depot, town, mine, workshop, water tower), 96×96
- [~] Start station badge and a little train marker for "you are here"
- [~] An emblem per area (meadow, desert, snow, jungle, marsh, coast, Brasswick) for the map headings
- [x] Emblem for **the Iron Badlands**: shown on the route map beside the area name
- [~] Map button icon (now a hand-drawn folded map)

The map is ready for these: once uploaded and sliced to the names below, it uses them automatically
(otherwise it keeps the HUD icons). `assets/ui/map-parchment.png`, `assets/ui/badge-<stopType>.png`
(coalDepot, town, mine, workshop, waterTower, start), `assets/ui/map-train.png`,
`assets/ui/emblem-<areaId>.png` (meadow, desert, badlands, snow, jungle, marsh, coast, town).

## 3. Objectives, rescue and breakdowns (in the game now)
- [x] Objective icons: passengers, cargo, distance, visit, reach area, money: shown beside each objective on the map
- [x] "Complete!" ribbon: pops up with the objective's name and reward when one is finished
- [x] Steam-leak puff: animates from the engine while it's broken down
- [ ] Sounds: objective-complete jingle, map open/close (paper rustle), event sting (short
      "something's up" phrase), relief-engine whistle in the distance, breakdown bang/hiss

## 3b. Minigames (in the game now, drawn with shapes and HUD icons)
- [ ] Slot machine cabinet (front view, about 440 × 480, with three reel windows and a lever)
- [ ] Reel symbols drawn for the slots (coal, water, passenger, gems, gold, money bag), 96×96
- [ ] Ticket card (cream card stub with a railway crest; blank space for text) and a brass punch
- [ ] Sounds: ticket punch "ka-chunk", reel whirr, reel stop clunk, small win jingle, jackpot bells

## 4. Story (next)
- [x] Character portraits, chest-up, 3 expressions each: in the game as **crew chatter**: Old Bill (driver),
      Sam (fireman) and Mrs Pennywhistle (station mistress) comment on the run; Sir Reginald Crowe (rival)
      and the stranger in red turn up at stops now and then. Lines are in `src/content/dialogue.js`.
- [ ] Dialogue box frame (9-slice, like the existing buttons) and a name tag
- [ ] Chapter title cards (one painted scene per chapter, 1280×720)
- [ ] A few story props for stops: wanted poster, sealed letter, strange crate

## 5. Train customisation (next)
Same setup as the current train: body over its underframe, wheels separate.
- [x] Liveries: **in the game** as recolours of the current train (red, Brunswick green, midnight blue,
      royal plum, golden arrow), bought at a Workshop's Paint shop and kept across runs
      (`scripts/make-liveries.py`). Hand-painted versions would still look better than recolours; if
      made, keep the same part layout as `assets/sprites/locomotive.png` etc. so the wheels still fit.
- [ ] More cars: second passenger carriage, sleeper car, dining car, mail van, tanker wagon,
      livestock wagon, flatbed (uploaded) with loads, guard's van for the back of the train
- [ ] Cosmetic parts for the loco: 3 chimney styles, 2 headlamps, cowcatcher, brass nameplate
- [ ] Workshop/engine-shed screen background (1280×720) for the customisation menu
- [ ] Paint swatch and part icons for the menu (64×64)

## 6. New kinds of stop (next)
Each needs a building in every area's style (or one general version to start) plus an icon.
- [ ] **Inn / hotel**: rest the crew, more passengers
- [ ] **Market / trading post**: buy and sell different goods
- [ ] **Post office**: mail contracts
- [ ] **Engine shed / roundhouse**: customisation and bigger upgrades
- [ ] **Farm**, **lumber mill**, **quarry**, **fishing harbour**: new cargo sources
- [ ] **Signal box** or **watchtower**: shows more of the map
- [ ] Cargo loads for the new goods: mail sacks, fish crates, livestock. Logs, stone, crates, barrels
      and sacks are already uploaded.

## 7. More areas, and improving the current ones
A new area needs: far mountains, mid hills, a scatter of trees and props, a village strip, a ground bank
under the rails, 1–2 foreground rows, the five stop buildings plus a platform, and a signpost.
- [x] Industrial badlands (The Iron Badlands), from the painted scene `badlands-scene.png`

Ideas: **autumn forest** (autumn foreground rows are already uploaded), **canyon badlands**,
**volcanic ash fields**, **savannah**, **industrial mill town**, **haunted moor**, **cherry-blossom hills**.

Improvements to current areas:
- [ ] **Mid-ground strips**, one per area (the best fix for gaps in the scenery): a seamless,
      left-to-right repeating band about 2048×300 of dense trees/bushes/buildings whose **bottom
      edge is solid all the way across** (no sky or transparency at the base). It sits between the
      far hills and the line, so nothing behind it can show through. Jungle and marsh have stand-ins
      built from the kits; desert, snow, coast and Brasswick would benefit most.
- [ ] **Tunnel mountain versions**: snowy, sandy and jungle (the red rock clashes beside the snow)
- [ ] **Platforms** for the jungle, marsh and coast (they have none yet; snow and Brasswick do)
- [ ] **Junction signposts** to match each area (only the meadow's exists)
- [ ] Night or sunset meadow (the sunset sky and mountain strips are already uploaded)
- [ ] Passengers on platforms: 3–6 small people in each area's clothes
- [ ] **Area ambience loops** (30–60 s, seamless, MP3): meadow birdsong, desert wind, snow wind,
      jungle birds and insects, marsh frogs, coast waves and gulls, Brasswick street bustle.
      Stand-ins are synthesised for now; drop a file in `assets/audio/ambience/` and list it in
      `AMBIENCE_FILES` (assets.js). CC0 recordings from freesound.org work well.
- [ ] More radio music: a station of slower tracks, or one per area

## 8. Still wanted from earlier
- [ ] Branch line: track continuing off the end of the points piece, so junctions don't stop short
- [ ] Starting station "Rouge Central" as its own building (it reuses the Town now)
- [ ] App icon (512×512) and a "ROUGE" title logo
- [ ] Steam hiss (overheating), tunnel rumble, station ambience
- [ ] Brake sparks, desert dust

## Already uploaded, not used yet
No need to redo these. They're kept in `art/sheets/`:
- Green and blue locomotives (for liveries)
- Second desert kit (clouds, mesas, rock arches, ruins), desert crystals and small cacti
- Desert signs, lamps and market stall; meadow log/fern and autumn foreground rows
- Curved rails and snow track; the flatbed wagon; wheel animation frames

## Done
Sound effects, music, HUD icons, sky, ground, grass bank, foreground, train with underframes,
carriage, cargo wagon and loads, rails and points, the tunnel mountain, tunnel mouth and rock
bank, and seven areas (meadow, desert, snow, jungle, marsh, coast, Brasswick) with their stops.

## Production workflow
See `art/PRODUCTION.md` for style references, approved sources and the repeatable import command.

## What's in the repo but not used, and why
- `codex/asset-production-batch-1` and `train-game`: merged (event art, progress notes).
- `feature/area-registry`, `chore/area-asset-check`: **not merged**. They were built on an old copy
  of the game: the registry would remove six of the eight areas, and `check:assets` already
  exists. Ask Claude to port an idea from them rather than merging them.
- `chore/master-asset-inventory`: **not merged**. It lists uploads that have since been sorted
  into `art/sheets/` with descriptive names, so it's out of date.
