# Rouge

A side-scrolling steam train management game. Keep the fire burning by choosing which stop
to head for at each junction: coal, passengers, cargo, repairs or water. If the fuel runs
out between stops, the run is over.

Built with [Phaser 3](https://phaser.io) and [Vite](https://vite.dev). Works on desktop and on
phones held either way up.

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
```

| Command                | What it does                                                    |
| ---------------------- | --------------------------------------------------------------- |
| `npm run dev`          | Dev server with hot reload                                      |
| `npm run build`        | Production build into `dist/`                                   |
| `npm run preview`      | Serve the production build locally                              |
| `npm run placeholders` | Recreate any missing placeholder sounds (never overwrites)      |
| `python3 scripts/slice-art.py` | Re-cut the game's art from the sheets in `art/sheets/`  |
| `python3 scripts/slice-areas.py` | Re-cut the snow, jungle, marsh, coast and town areas     |
| `python3 scripts/compress-images.py` | Shrink images (run after either slicing script) |
| `npm run check:assets` | Check every file the game loads exists                          |

Add `?timescale=4` to the URL to run the simulation 4× faster when testing balance.

**Debug mode:** tap the dim **GOD** button by the sound button (or add `#god` to the URL, or press
**G** / **`**). It lights up and opens the debug panel (a side panel; the bottom half on an upright
phone). It's remembered on that device until you press *God mode off* in the panel.

| Section | What's in it |
| ------- | ------------ |
| Info    | Live readout: area, distance, speed, next junction and its stops, next stop, next tunnel, passengers, FPS |
| Travel  | Jump to any area, tunnel to the next one, skip ahead (500 m or to the next junction/stop), game speed 0.25–12× |
| Stops   | Put any kind of stop just ahead; choose the two stops the next junction offers |
| Train   | Sliders for fuel, water, heat, condition and money; fill everything, max upgrades, load cargo or passengers |
| Events  | Break down, overheat, low fuel, out of fuel, dry boiler |
| Cheats  | Unlimited fuel & water, no breakdowns, no wear |
| Tuning  | Stop spacing and area length multipliers (until reload) to try out longer journeys |
| View & run | Hide the game UI for screenshots, corner readout, restart or end the run, reset best |

The panel is built from a list in `src/debug/DebugPanel.js` (`SECTIONS`), with the actions in
`src/debug/debugActions.js`, so a new feature's debug tool is usually one action plus one line.

## Controls

- **Tap or click a signpost**, or press **1 / 2**, to set the points before a junction
- **Tap or click options** in the stop menu to buy, sell, load and repair
- **Depart** (or Space / Enter) leaves a stop
- The speaker button (or **M**) mutes; the corners button goes fullscreen where the browser allows it

## Phones

The layout adapts to the screen:

- **Upright:** gauges along the top, the line in a band across the middle, and signposts,
  stop menus and a "next stop" card underneath, within thumb reach.
- **Sideways:** a compact gauge strip over the sky, with signposts and menus in a column on the right.
- **Desktop:** the full gauge panel top-left, menus on the right.

Turning the phone mid-game re-lays the screen out without losing your place. The canvas renders
at the phone's pixel density, so text and art stay sharp.

## How it plays

1. **Run**: the train burns fuel per metre and per second under steam. Cargo makes it burn more.
2. **Choose**: signposts rise before each junction, each naming the stop down that branch.
   The lit signpost is where the points are set; click the other one to switch.
3. **Stop**: the train brakes smoothly to a halt at the stop and a panel opens.
4. **Leave**: depart and the fuel starts draining again.

**The route map** (MAP button, or Tab): each run has its own network of stops, three lanes wide,
running through the areas in turn. Every stop links to two in the next column, and those are what
the next junction offers, so you can plan ahead. Tap one of the two next stops on the map to set the
points. Every other column has a Coal Depot in the middle lane. The game pauses while the map is open.

**Line events**: on about half the stretches something happens between stops (a tree across the line,
a pedlar, a snowdrift, monkeys after your cargo…). The train pulls up and you choose what to do.
They're listed in `src/content/events.js`, and many only happen in certain areas.

**Objectives**: three at a time (deliver passengers, sell cargo, reach the next area, travel so far…),
each paying a reward when done and replaced with a new one. They're on the map screen
(`src/content/objectives.js`).

**The radio** (radio button, or R): tune between stations (Rouge Radio, Steam FM, Pixel Dreams,
Marimba Junction), skip or go back a track, switch the music off, and set music, effects and
ambience volumes. It's all remembered on the device. Stations are `RADIO_STATIONS` in `assets.js`.

**Ambience**: each area has its own background sound (wind in the snow and desert, waves on the
coast, birds and insects in the jungle, frogs in the marsh). For now these are made on the fly
(`src/systems/Ambience.js`); add real loops to `AMBIENCE_FILES` in `assets.js` to replace them.

**Liveries**: the Workshop's Paint shop sells paint schemes for the train. Once bought they're
yours on every run (`LIVERIES` in `balance.js`, art from `scripts/make-liveries.py`).

**Saving**: the run is saved whenever you're at a stop (on arrival and after anything you buy or
sell there). Continue on the title screen takes you back to that stop. Ending a run deletes the save.
`src/state/save.js` says what's kept.

**Running out of fuel** isn't the end: a relief engine can bring fuel out (free the first time,
then more each call; if you're broke they take what you have). Or you can end the run.

| Stop        | What you can do                                                  |
| ----------- | ---------------------------------------------------------------- |
| Coal Depot  | Buy fuel                                                         |
| Town        | Drop off passengers for fares, sell cargo, pick up passengers (for any town, or booked through to the next area for a bigger fare) |
| Mine        | Load cargo (sell it at a Town; each unit adds 3% fuel burn)      |
| Workshop    | Repair wear, upgrade the fuel tank or boiler                     |
| Water Tower | Cheap water refill that lowers boiler heat                       |

Boiler heat climbs with speed and climbs fast when the water runs dry. If it maxes out, the
train is limited to 40% speed until it cools. Condition wears down with distance; below 50%
your top speed drops, and below 60% the train may break down: it pulls up on the line while the
crew patch it for a few seconds. Passengers booked through to the next area only get off at a
town there; carry them past it and they pay half at the next town.

The line runs through eight areas (the meadows, the Red Desert, the Iron Badlands, the Frozen Peaks, the Emerald
Jungle, the Mistbound Marshes, the Saltwind Coast and the town of Brasswick), with a tunnel between
each. Each area has its own scenery, stop buildings and place names (`STOP_NAMES` in `balance.js`);
it snows in the Frozen Peaks and fog drifts through the marshes. Only the meadows' art is loaded
before the title screen; the rest downloads in the background while you play.

## Project layout

```
art/sheets/                Your original sprite sheets (not shipped with the game)
art/music/                 Your original music files
assets/                    Art & audio cut from the sheets, served as-is (see assets/README.md)
src/
  main.js                  Phaser game config
  config/
    balance.js             ★ All gameplay numbers + POI definitions. Tune here.
    display.js             Design-stage layout, parallax layers, train composition, colours
    train-art.json         Car sizes and wheel/rail positions measured from the art (generated)
    assets.js              Every asset file the game loads, by key
    debug.js               Debug-mode switches (god mode, ?timescale=, cheats)
  scenes/
    BootScene.js           Loads assets, title screen
    GameScene.js           The run: world, train and rules
    UIScene.js             HUD, signposts, stop menus and messages, drawn on top
    GameOverScene.js       Distance travelled + restart
  state/TrainState.js      Fuel, water, heat, money, passengers, cargo… (no Phaser)
  state/best.js            Best distance, remembered per device
  state/save.js            Saving a run at stops, and Continue
  systems/
    TrainMotion.js         Acceleration, planned braking, coasting (no Phaser)
    RouteManager.js        Plans junctions, stops and events along the line
    RouteMap.js            The run's network of stops (columns × lanes, areas, coal rule)
    Objectives.js          Tracks objectives and pays out
    ParallaxBackground.js  Scrolls the background layers
    WorldLayer.js          Moves objects pinned to a spot on the line
    Viewport.js            Screen sizing and the phone / desktop layouts
    AudioManager.js        Sound effects that tolerate missing files
    MusicPlayer.js         The radio: stations, skipping, volumes (streams, light on phone memory)
    Ambience.js            Area background sound (real loops, or made on the fly)
    Weather.js             Falling snow (areas with weather: 'snow')
    BackgroundLoader.js    Loads other areas' art in the background
  objects/
    Train.js               Train visuals: cars, wheels, rods, smoke, cargo heap
    worldObjects.js        Station buildings and junction graphics
  poi/poiActions.js        What each POI lets you do (and the event / stranded panels)
  content/events.js        ★ Line events and their choices. Add new ones here.
  content/objectives.js    ★ Objective types and rewards
  debug/                   The debug panel (DebugPanel.js) and what its controls do (debugActions.js)
  ui/                      HUD, junction picker, stop menu, status card, map screen, radio, 9-slice buttons
scripts/slice-art.py       Cuts the sprites and builds the scrolling layers from art/sheets
scripts/slice-areas.py     Same for the desert-onward areas (writes src/config/new-areas.json)
scripts/slice-events.py    Cuts the props shown beside the line for events
scripts/compress-images.py Shrinks every PNG to a 256-colour palette (run after slicing)
scripts/generate-placeholders.mjs   Makes placeholder files for anything without real art
```

### Extending it

- **Carriages / wagons**: cut the art in `scripts/slice-art.py` (see how the carriage is assembled), then add an
  entry to `TRAIN_LAYOUT.cars` in `display.js` and an image key in `assets.js`.
  To make it matter, read capacities from the car list in `TrainState`.
- **New POI type**: add it to `POI_TYPES` in `balance.js` and a builder with the same key in `poi/poiActions.js`.
- **Breakdowns / track events**: `TrainState.update()` already returns events. Add new ones
  there (e.g. a breakdown chance scaled by condition) and react to them in `GameScene.onStateEvent()`.
  Pin things to the line with `WorldLayer.add(metres, gameObject)`.
- **Passenger requests**: passengers are stored as groups with where and when they boarded
  (`TrainState.passengers`), so a destination field slots in naturally.
- **New areas**: add an entry to `AREAS` in `scripts/slice-areas.py` (where each piece is on its sheets) and
  run it; or hand-write one in `AREAS` in `display.js` listing the layer art it swaps in. The line runs through
  the areas in turn, with a tunnel between each (`route.stopsPerArea` in `balance.js` sets how many stops each has).

## Deploying to GitHub Pages

A workflow in `.github/workflows/deploy.yml` builds and deploys on every push to `main` or `master`.
One-time setup: in the repository on GitHub, go to **Settings → Pages** and set **Source** to
**GitHub Actions**. The game will then be live at `https://<user>.github.io/<repo>/`.

The build uses relative paths (`base: './'`), so it works under any repository name.
