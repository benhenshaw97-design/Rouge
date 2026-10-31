# Rouge

A side-scrolling steam train management game. Keep the fire burning by choosing which stop
to head for at each junction: coal, passengers, cargo, repairs or water. If the fuel runs
out between stops, the run is over.

Built with [Phaser 3](https://phaser.io) and [Vite](https://vite.dev).

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
| `npm run placeholders` | Recreate any missing placeholder art/audio (never overwrites)   |

Add `?timescale=4` to the URL to run the simulation 4× faster when testing balance.

## Controls

- **Click a signpost**, or press **1 / 2**, to set the points before a junction
- **Click options** in the stop panel to buy, sell, load and repair
- **Space / Enter** departs from a stop
- **M** mutes the sound

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
assets/                    Art & audio, served as-is (see assets/README.md)
src/
  main.js                  Phaser game config
  config/
    balance.js             ★ All gameplay numbers + POI definitions. Tune here.
    display.js             Screen layout, parallax layers, train composition
    assets.js              Every asset file the game loads, by key
    debug.js               URL-driven dev helpers (?timescale=)
  scenes/
    BootScene.js           Loads assets, title card
    GameScene.js           The run: ties every system together
    GameOverScene.js       Distance travelled + restart
  state/TrainState.js      Fuel, water, heat, money, passengers, cargo… (no Phaser)
  systems/
    TrainMotion.js         Acceleration, planned braking, coasting (no Phaser)
    RouteManager.js        Plans junctions and which POIs sit down each branch
    ParallaxBackground.js  Scrolls the background layers
    WorldLayer.js          Moves objects pinned to a spot on the line
    AudioManager.js        Sound playback that tolerates missing files
  objects/
    Train.js               Train visuals: cars, wheels, rods, smoke, cargo heap
    worldObjects.js        Station buildings and junction graphics
  poi/poiActions.js        What each POI lets you do
  ui/                      HUD, signposts, stop panel, buttons, toasts
scripts/generate-placeholders.mjs   Makes the placeholder SVG/WAV files
```

### Extending it

- **Carriages**: add an entry to `TRAIN_LAYOUT.cars` in `display.js` and an image key in `assets.js`.
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
