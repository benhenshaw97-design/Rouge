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

Add `?timescale=4` to the URL to run the simulation 4× faster when testing balance.

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

| Stop        | What you can do                                                  |
| ----------- | ---------------------------------------------------------------- |
| Coal Depot  | Buy fuel                                                         |
| Town        | Drop off passengers for fares, sell cargo, pick up passengers    |
| Mine        | Load cargo (sell it at a Town; each unit adds 3% fuel burn)      |
| Workshop    | Repair wear, upgrade the fuel tank or boiler                     |
| Water Tower | Cheap water refill that lowers boiler heat                       |

Boiler heat climbs with speed and climbs fast when the water runs dry. If it maxes out, the
train is limited to 40% speed until it cools. Condition wears down with distance; below 50%
your top speed drops.

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
    debug.js               URL-driven dev helpers (?timescale=)
  scenes/
    BootScene.js           Loads assets, title screen
    GameScene.js           The run: world, train and rules
    UIScene.js             HUD, signposts, stop menus and messages, drawn on top
    GameOverScene.js       Distance travelled + restart
  state/TrainState.js      Fuel, water, heat, money, passengers, cargo… (no Phaser)
  systems/
    TrainMotion.js         Acceleration, planned braking, coasting (no Phaser)
    RouteManager.js        Plans junctions and which POIs sit down each branch
    ParallaxBackground.js  Scrolls the background layers
    WorldLayer.js          Moves objects pinned to a spot on the line
    Viewport.js            Screen sizing and the phone / desktop layouts
    AudioManager.js        Sound effects that tolerate missing files
    MusicPlayer.js         Streams the music playlist (light on phone memory)
  objects/
    Train.js               Train visuals: cars, wheels, rods, smoke, cargo heap
    worldObjects.js        Station buildings and junction graphics
  poi/poiActions.js        What each POI lets you do
  ui/                      HUD, junction picker, stop menu, status card, 9-slice buttons
scripts/slice-art.py       Cuts the sprites and builds the scrolling layers from art/sheets
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
- **Changing terrain**: add parallax layer sets to `display.js` and swap them in `ParallaxBackground`.

## Deploying to GitHub Pages

A workflow in `.github/workflows/deploy.yml` builds and deploys on every push to `main` or `master`.
One-time setup: in the repository on GitHub, go to **Settings → Pages** and set **Source** to
**GitHub Actions**. The game will then be live at `https://<user>.github.io/<repo>/`.

The build uses relative paths (`base: './'`), so it works under any repository name.
