# Asset to-do list

Tick items off as you upload them (GitHub: Add file → Upload files, into `art/sheets/`).
Sections 1–3 are for features already in the game that currently borrow other art; 4 onwards are
for the features still to come (story, train customisation, new stops, new areas).

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

## 1. Line events (in the game now; most show a stand-in prop cut from the prop sheets)
The train stops for these, but there's nothing to see by the line yet, so each wants a prop
or small scene drawn beside the track, about train height or less. Also optional: a square
**vignette** (256×256) for each event's panel, replacing the plain icon.
- [x] Stranded family with luggage and a cart missing a wheel (any area)
- [ ] Fallen tree across the rails: meadow, jungle and marsh versions
- [ ] Abandoned coal wagon in a short siding (half full of coal)
- [x] Pedlar's cart with coal sacks and a water barrel, plus the pedlar
- [ ] Snowdrift over the rails (snow)
- [ ] Steaming hot spring (snow and jungle)
- [ ] Sandstorm: a wall of red sand, as a strip that can scroll across the screen (desert)
- [ ] Oasis pool with palms (desert)
- [ ] Monkeys (3–4 poses) climbing on a wagon (jungle)
- [ ] Marsh lights / will-o'-the-wisps (small glowing sprites, 3–4 frames)
- [ ] Toll bridge barrier and a toll-keeper in a very official hat (coast, town, meadow)
- [ ] Mail sack lying by the track
- [ ] Shipwreck on the rocks with crates (coast)
- [ ] Coal-thief urchins (2–3 children) (town)
- [ ] **Relief engine**: a small tank engine, side view, in the same style as the train (it
      comes to the rescue when you run out of fuel)

## 2. Route map screen (in the game now, drawn with the HUD icons)
- [ ] Parchment or painted map background (tileable, or about 1600×900)
- [ ] Round map badges for each stop type (coal depot, town, mine, workshop, water tower), 96×96
- [ ] Start station badge and a little train marker for "you are here"
- [ ] An emblem per area (meadow, desert, snow, jungle, marsh, coast, Brasswick) for the map headings
- [ ] Map button icon (now a hand-drawn folded map)

## 3. Objectives, rescue and breakdowns (in the game now)
- [ ] Objective icons: passengers, cargo, distance, visit, reach area, money (64×64)
- [ ] "Complete!" stamp or ribbon for finished objectives
- [ ] Steam-leak puff for breakdowns (4–6 frames)
- [ ] Sounds: objective-complete jingle, map open/close (paper rustle), event sting (short
      "something's up" phrase), relief-engine whistle in the distance, breakdown bang/hiss

## 4. Story (next)
- [ ] Character portraits, chest-up, 3 expressions each (neutral, happy, worried): the driver, the
      fireman, a station master, a mysterious client, a rival railway boss (256×256)
- [ ] Dialogue box frame (9-slice, like the existing buttons) and a name tag
- [ ] Chapter title cards (one painted scene per chapter, 1280×720)
- [ ] A few story props for stops: wanted poster, sealed letter, strange crate

## 5. Train customisation (next)
Same setup as the current train: body over its underframe, wheels separate.
- [ ] Liveries: the **green and blue locomotives are already uploaded**; tenders and carriages to match each
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
- [x] Industrial badlands (The Iron Badlands)

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
