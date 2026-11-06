"""Cuts the props shown beside the line for line events (src/content/events.js) from the prop
sheets in art/sheets, into assets/sprites/event-<id>.png. Run after changing EVENT_PROPS:

    python3 scripts/slice-events.py && python3 scripts/compress-images.py

Each entry: (sheet, row band (y0, y1) on the sheet, which piece in that row, counted from the
left). Events not listed use a sprite the game already has (see `prop` in events.js).
"""
from pathlib import Path
import json
import runpy

from artlib import objects_in, sheet

ROOT = Path(__file__).resolve().parent.parent
SHEETS = ROOT / 'art' / 'sheets'
OUT = ROOT / 'assets' / 'sprites'

DESERT = ('desert-props.png', {0: (7, 189), 1: (199, 368), 2: (379, 517), 3: (523, 676)})
SNOW = ('snow-props.png', {1: (162, 451), 3: (599, 713)})
MARSH = ('marsh-props.png', {0: (8, 149), 1: (160, 300), 2: (308, 712)})

EVENT_PROPS = {
    'stranded-family': (DESERT, 0, 3),  # cart with a broken wheel
    'fallen-tree': (MARSH, 2, 29),  # fallen log
    'abandoned-coal': (DESERT, 1, 6),  # crates, barrels and sacks
    'pedlar': (DESERT, 1, 1),  # market stall
    'snowdrift': (SNOW, 1, 20),  # snow mound
    'hot-spring': (SNOW, 3, 5),  # pool
    'sandstorm': (DESERT, 2, 10),  # stacked rocks
    'oasis': (MARSH, 2, 27),  # lily pool
    'monkeys': (MARSH, 2, 20),  # crates and barrels
    'marsh-lights': (MARSH, 2, 24),  # glowing mushrooms
    'toll-bridge': (MARSH, 2, 10),  # wooden barrier
    'shipwreck': (MARSH, 2, 30),  # wrecked boat
    'street-urchins': (DESERT, 1, 6),  # crates and barrels
}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = json.loads((ROOT / 'art' / 'event-art.json').read_text())
    approved = {entry['id'] for entry in manifest['approved']}
    for event, ((name, bands), band, index) in EVENT_PROPS.items():
        if event in approved:
            continue
        img = sheet(str(SHEETS / name))
        y0, y1 = bands[band]
        pieces = objects_in(img, (0, y0, img.width, y1), min_w=30, grow=3)
        p = pieces[index]
        p.save(OUT / f'event-{event}.png', optimize=True)
        print(event, p.size)
    runpy.run_path(str(ROOT / 'scripts' / 'prepare-event-art.py'), run_name='__main__')


if __name__ == '__main__':
    main()
