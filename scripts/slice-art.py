"""Cuts the game's sprites out of the art sheets in art/sheets and writes them to assets/.

    python3 scripts/slice-art.py        (needs Pillow and numpy: pip install pillow numpy)

The sheets are AI-generated "kits", so this script:
  * crops single sprites (train, wheel, rod, POI buildings, icons, buttons, signposts)
  * composes seamless, horizontally tiling parallax layers from the loose pieces
    (clouds, mountains, hills, trees, village, hedges, track, ground)

Re-running it overwrites the files it makes. If you replace one of those files by hand,
don't re-run this script afterwards (or remove that entry below first).
"""
import json
import random
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

from artlib import find_pieces, sheet, tight

ROOT = Path(__file__).resolve().parent.parent
SHEETS = ROOT / 'art' / 'sheets'
OUT = ROOT / 'assets'
report = {}


def S(name):
    return sheet(str(SHEETS / name))


def save(img, rel):
    path = OUT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, optimize=True)
    report[rel] = img.size


def scale(img, factor, resample=Image.LANCZOS):
    return img.resize((max(1, round(img.width * factor)), max(1, round(img.height * factor))), resample)


def crop(img, box):
    return img.crop(tight(img, box, alpha=100))


# ------------------------------------------------------------------------------------------
# Train. Each car is its body drawn over its underframe ("chassis"); wheels are centred on the
# underframe's axle hangers so the train sits properly on the rails. Source measurements are
# in the sheets' own pixels. Layout numbers for the game go to src/config/train-art.json.
# ------------------------------------------------------------------------------------------
HI = 2  # images are written at 2x their in-game size so they stay sharp on phones
K_LOCO, K_CARRIAGE, K_WAGON = 0.22, 0.19, 0.34  # design px per sheet px, per sheet
train_layout = {}

wheel_src = crop(S('wheel-large.png'), (0, 0, 1272, 1236))
save(wheel_src.resize((128, 128), Image.LANCZOS), 'sprites/wheel.png')


def split_heap(body_img, body_box, heap):
    """Cut the load (coal) off a body: pixels above the rim, between the brass corner posts."""
    xl, xr, rim = heap
    arr = np.asarray(body_img).copy()
    ys, xs = np.mgrid[body_box[1]:body_box[3], body_box[0]:body_box[2]]
    lum = arr[..., :3].mean(axis=2)
    brass = ((arr[..., 0].astype(int) - arr[..., 2].astype(int)) > 40) & (lum > 70)
    in_heap = (ys < rim) & (xs > xl) & (xs < xr) & ~brass
    heap_arr = arr.copy()
    heap_arr[..., 3] = np.where(in_heap, arr[..., 3], 0)
    arr[..., 3] = np.where(in_heap, 0, arr[..., 3])
    return Image.fromarray(arr), Image.fromarray(heap_arr)


def assemble(img, body, chassis, dy, wheels, *, heap=None, bake_wheels=False, erase=(), move=()):
    """Body over underframe. wheels: [(x, hub_y_on_underframe, r)] in sheet px.
    Returns the car image, its layout (sheet px, relative to the image) and the heap image."""
    x0, y0 = min(body[0], chassis[0]), body[1]
    hubs = [(x, hy + dy, r) for x, hy, r in wheels]
    rail = max(hy + r for _, hy, r in hubs)
    x1 = max(body[2], chassis[2])
    y1 = max(body[3], chassis[3] + dy, rail)
    car = Image.new('RGBA', (x1 - x0, y1 - y0 + 1), (0, 0, 0, 0))

    def put(piece, x, y):
        layer = Image.new('RGBA', car.size, (0, 0, 0, 0))
        layer.paste(piece, (x - x0, y - y0))
        car.alpha_composite(layer)

    put(img.crop(chassis), chassis[0], chassis[1] + dy)
    # Shift parts of the underframe (in car-image coords), e.g. raise buffers to match other cars.
    for mx0, my0, mx1, my1, mdy in move:
        piece = car.crop((mx0, my0, mx1, my1))
        car.paste(Image.new('RGBA', piece.size, (0, 0, 0, 0)), (mx0, my0))
        layer = Image.new('RGBA', car.size, (0, 0, 0, 0))
        layer.paste(piece, (mx0, my0 + mdy))
        car.alpha_composite(layer)
    body_img = img.crop(body)
    # Remove parts of the body that the underframe also draws (e.g. a second cowcatcher).
    for ex0, ey0, ex1, ey1 in erase:
        clear = Image.new('RGBA', (ex1 - ex0, ey1 - ey0), (0, 0, 0, 0))
        body_img.paste(clear, (ex0 - body[0], ey0 - body[1]))
    heap_img, heap_info = None, None
    if heap:
        body_img, heap_full = split_heap(body_img, body, heap)
        bb = heap_full.getchannel('A').point(lambda v: 255 if v > 100 else 0).getbbox()
        heap_img = heap_full.crop(bb)
        heap_info = {'x': body[0] + bb[0] - x0, 'bottom': body[1] + bb[3] - y0, 'w': heap_img.width, 'h': heap_img.height}
    put(body_img, body[0], body[1])
    if bake_wheels:
        for x, hy, r in hubs:
            put(wheel_src.resize((2 * r, 2 * r), Image.LANCZOS), x - r, hy - r)
    layout = {
        'width': car.width,
        'height': car.height,
        'railY': rail - y0,
        'wheels': [{'x': x - x0, 'y': hy - y0, 'r': r} for x, hy, r in hubs],
    }
    if heap_info:
        layout['heap'] = heap_info
    return car, layout, heap_img


def design(layout, k):
    """Sheet-px layout -> design-px layout."""
    out = {}
    for key, v in layout.items():
        if isinstance(v, (int, float)):
            out[key] = round(v * k, 2)
        elif isinstance(v, dict):
            out[key] = {kk: round(vv * k, 2) for kk, vv in v.items()}
        elif isinstance(v, list):
            out[key] = [{kk: round(vv * k, 2) for kk, vv in w.items()} for w in v]
    return out


def save_car(name, car, layout, k, heap_img=None, heap_name=None, extra=None):
    save(scale(car, k * HI), f'sprites/{name}.png')
    entry = design(layout, k)
    entry.update(extra or {})
    if heap_img is not None:
        save(scale(heap_img, k * HI), f'sprites/{heap_name}.png')
        entry['heap']['key'] = heap_name
    train_layout[name] = entry


chassis_sheet = S('train-bodies-and-chassis.png')

# Locomotive: four coupled driving wheels on the underframe's four axle hangers.
car, lay, _ = assemble(chassis_sheet, (16, 16, 1337, 474), (16, 482, 1330, 670), -157,
                       [(255, 540, 100), (497, 540, 100), (763, 540, 100), (1060, 540, 100)],
                       erase=[(1150, 372, 1337, 474)])  # the body's cowcatcher; the underframe has its own
save_car('locomotive', car, lay, K_LOCO, extra={
    'chimney': {'x': round((1069 - 16) * K_LOCO, 2), 'y': round((18 - 16) * K_LOCO, 2)},
    'crankRadius': round(40 * K_LOCO, 2),
})

# Tender: two axles; coal heap cut off so it can shrink as fuel burns.
car, lay, heap = assemble(chassis_sheet, (1362, 85, 2170, 423), (1362, 482, 2163, 652), -157,
                          [(1580, 575, 66), (1950, 575, 66)], heap=(1478, 2062, 167))
save_car('tender', car, lay, K_LOCO, heap, 'coal-heap')

# Passenger carriage on two bogies (the second underframe on the sheet).
carriage_sheet = S('carriage-and-underframes.png')
# Its buffers sit lower than the other cars', so: slightly bigger wheels (raising the whole car)
# and the buffer beams at each end lifted 20 px. Buffers end up level with the locomotive's.
CARRIAGE_W = 1738 - 36
car, lay, _ = assemble(carriage_sheet, (118, 32, 1656, 528), (36, 718, 1738, 860), -287,
                       [(357, 770, 115), (642, 770, 115), (1132, 770, 115), (1412, 770, 115)],
                       move=[(0, 395, 125, 500, -20), (CARRIAGE_W - 125, 395, CARRIAGE_W, 500, -20)])
save_car('carriage', car, lay, K_CARRIAGE)

# Cargo wagon: the modular flat wagon from cargo-wagon-base.png, with interchangeable loads
# from cargo-loads.png. Wheels sit on its two axle hangers; the wheel size is chosen so its
# buffers are at the same height above the rail as the locomotive's.
wagon_base_sheet = S('cargo-wagon-base.png')
BASE_BOX = (80, 93, 2092, 641)
base = wagon_base_sheet.crop(BASE_BOX)
HUB, R = 575 - BASE_BOX[1], 134
K_CARGO = 0.1
lay = {
    'width': base.width,
    'height': HUB + R + 1,
    'railY': HUB + R,
    'wheels': [{'x': 573 - BASE_BOX[0], 'y': HUB, 'r': R}, {'x': 1599 - BASE_BOX[0], 'y': HUB, 'r': R}],
}
car = Image.new('RGBA', (base.width, lay['height']), (0, 0, 0, 0))
car.alpha_composite(base, (0, 0))
save_car('wagon', car, lay, K_CARGO)

# Loads sit on the deck, between the brass corner posts.
DECK_TOP, DECK_LEFT, DECK_RIGHT = 362 - BASE_BOX[1], 250 - BASE_BOX[0], 1840 - BASE_BOX[0]
loads_sheet = S('cargo-loads.png')
LOADS = {
    'logs': (49, 65, 586, 270), 'coal': (608, 37, 1048, 268), 'crates': (1089, 44, 1618, 268),
    'tanker': (1644, 12, 2134, 268), 'stone': (34, 315, 552, 493), 'pipes': (590, 336, 1116, 495),
    'barrels': (1158, 315, 1613, 493), 'sacks': (1663, 318, 2137, 493), 'gold': (34, 544, 446, 694),
    'red-gems': (475, 544, 851, 694), 'blue-gems': (879, 544, 1252, 694), 'trunks': (1284, 541, 1693, 694),
    'tarp': (1722, 541, 2138, 694),
}
loads = {}
for name, box in LOADS.items():
    load = crop(loads_sheet, box)
    w = DECK_RIGHT - DECK_LEFT
    fit = w / load.width
    save(scale(load, fit * K_CARGO * HI), f'sprites/cargo-{name}.png')
    h = load.height * fit
    loads[name] = {'w': round(w * K_CARGO, 2), 'h': round(h * K_CARGO, 2)}
train_layout['wagon']['load'] = {
    'x': round(DECK_LEFT * K_CARGO, 2),
    'bottom': round((DECK_TOP + 6) * K_CARGO, 2),
    'loads': loads,
}

rod = S('wheel-and-rod-parts.png').crop((531, 589, 1346, 718))
save(scale(rod, 0.26), 'sprites/coupling-rod.png')

save(crop(S('master-sheet.png'), (1110, 215, 1205, 300)), 'sprites/smoke.png')
save(crop(S('variants-sheet.png'), (660, 845, 780, 966)), 'sprites/junction-signpost.png')
save(crop(S('variants-sheet.png'), (965, 850, 1400, 966)), 'sprites/platform.png')

# ------------------------------------------------------------------------------------------
# POI buildings: the originals from the master sheet plus the A/B alternatives.
# ------------------------------------------------------------------------------------------
master = S('master-sheet.png')
variants = S('variants-sheet.png')


def split_x(img, box, lo, hi):
    """Column with the least opacity between lo and hi (to separate touching sprites)."""
    a = np.asarray(img.crop((lo, box[1], hi, box[3])).getchannel('A')).astype(int).sum(axis=0)
    return lo + int(a.argmin())


town_split = split_x(variants, (971, 430, 1352, 572), 1140, 1200)
pois = {
    'pois/coal-depot.png': (master, (781, 470, 950, 650)),
    'pois/town.png': (master, (955, 500, 1193, 650)),
    'pois/mine.png': (master, (1201, 470, 1390, 650)),
    'pois/workshop.png': (master, (1398, 455, 1600, 650)),
    'pois/water-tower.png': (master, (1609, 455, 1756, 650)),
    'pois/coal-depot-a.png': (variants, (668, 430, 794, 573)),
    'pois/coal-depot-b.png': (variants, (797, 430, 966, 573)),
    'pois/town-a.png': (variants, (968, 425, town_split, 573)),
    'pois/town-b.png': (variants, (town_split, 425, 1358, 573)),
    'pois/mine-a.png': (variants, (1360, 425, 1525, 573)),
    'pois/mine-b.png': (variants, (662, 600, 821, 772)),
    'pois/workshop-a.png': (variants, (822, 600, 1006, 772)),
    'pois/workshop-b.png': (variants, (1006, 600, 1248, 772)),
    'pois/water-tower-a.png': (variants, (1248, 600, 1383, 772)),
    'pois/water-tower-b.png': (variants, (1385, 600, 1525, 772)),
}
for rel, (img, box) in pois.items():
    save(crop(img, box), rel)

# ------------------------------------------------------------------------------------------
# UI: icons and 9-slice buttons.
# ------------------------------------------------------------------------------------------
icons = {
    'ui/icon-fuel.png': (1276, 60, 1363, 147),
    'ui/icon-heat.png': (1372, 60, 1459, 147),
    'ui/icon-money.png': (1469, 60, 1557, 147),
    'ui/icon-passengers.png': (1567, 60, 1657, 148),
    'ui/icon-cargo.png': (1668, 60, 1757, 148),
}
for rel, box in icons.items():
    save(crop(master, box), rel)

# Water / wrench / distance icons, from icons-ground-sky.png. That sheet has its checkerboard
# painted in rather than real transparency, so the background is removed first.
def remove_painted_background(img):
    """Make the light, grey/white checkerboard connected to the image edges transparent."""
    a = np.asarray(img.convert('RGBA')).astype(int)
    rgb = a[..., :3]
    cand = (rgb.mean(axis=2) > 200) & ((rgb.max(axis=2) - rgb.min(axis=2)) < 25)
    bg = np.zeros_like(cand)
    bg[0, :], bg[-1, :], bg[:, 0], bg[:, -1] = cand[0, :], cand[-1, :], cand[:, 0], cand[:, -1]
    while True:
        g = bg.copy()
        g[1:] |= bg[:-1]
        g[:-1] |= bg[1:]
        g[:, 1:] |= bg[:, :-1]
        g[:, :-1] |= bg[:, 1:]
        g &= cand
        if (g == bg).all():
            break
        bg = g
    a[..., 3] = np.where(bg, 0, a[..., 3])
    return Image.fromarray(a.astype(np.uint8))


extra = remove_painted_background(S('icons-ground-sky.png'))
for rel, x0, x1 in (('ui/icon-water.png', 440, 720), ('ui/icon-condition.png', 740, 1030), ('ui/icon-distance.png', 1050, 1335)):
    save(crop(extra, (x0, 35, x1, 325)).resize((88, 88), Image.LANCZOS), rel)

buttons = {'blue': 167, 'gold': 217, 'green': 267, 'red': 319}
for colour, y in buttons.items():
    for state, x in (('', 1166), ('-hover', 1287), ('-pressed', 1407)):
        save(crop(variants, (x - 2, y - 2, x + 116, y + 44)), f'ui/button-{colour}{state}.png')
for state, x in (('', 1290), ('-hover', 1450), ('-pressed', 1610)):
    save(crop(master, (x - 2, 226, x + 150, 282)), f'ui/button-brown{state}.png')

# ------------------------------------------------------------------------------------------
# Parallax layers, composed from loose pieces so they tile seamlessly.
# ------------------------------------------------------------------------------------------
kit_b = S('parallax-kit-b.png')
kit_c = S('parallax-kit-c.png')


def pieces_in(img, box, min_w=30):
    return [img.crop(p) for p in find_pieces(img, box, alpha=100, grow=1, min_size=16) if p[2] - p[0] >= min_w]


def paste_wrap(tile, piece, x, y):
    w = tile.width
    for dx in (-w, 0, w):
        if x + dx < w and x + dx + piece.width > 0:
            layer = Image.new('RGBA', tile.size, (0, 0, 0, 0))
            layer.paste(piece, (x + dx, y))
            tile.alpha_composite(layer)


def compose(pieces, width, height, *, spacing=(0, 0), overlap=0, seed=1, y_jitter=0, align='bottom'):
    rng = random.Random(seed)
    tile = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    order = []
    x = 0
    while x < width:
        if not order:
            order = pieces[:]
            rng.shuffle(order)
        p = order.pop()
        y = height - p.height - rng.randint(0, y_jitter) if align == 'bottom' else rng.randint(0, max(0, height - p.height))
        paste_wrap(tile, p, x, y)
        x += p.width - overlap + rng.randint(*spacing)
    return tile


def crossfade_tile(strip, blend):
    """Make a continuous strip tile by blending its last `blend` columns into its first."""
    a = np.asarray(strip).astype(float)
    a[..., :3] *= a[..., 3:4] / 255.0  # premultiply
    w = strip.width - blend
    out = a[:, :w].copy()
    t = np.linspace(0, 1, blend)[None, :, None]
    out[:, :blend] = a[:, w:w + blend] * (1 - t) + a[:, :blend] * t
    alpha = out[..., 3:4]
    out[..., :3] = np.where(alpha > 0, out[..., :3] * 255.0 / np.maximum(alpha, 1e-6), 0)
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))


# Sky: the cloud strip from icons-ground-sky.png becomes the scrolling clouds layer; the sky
# image behind it is a gradient built from the strip's own top and bottom rows so they meet
# without an edge. Design layout: sky image spans y -1200..720; strip drawn at y 20..290.
strip = extra.crop((40, 637, 1733, 820)).convert('RGBA')
cloud_tile = crossfade_tile(strip, 160)
save(cloud_tile, 'backgrounds/clouds.png')
srows = np.asarray(strip.convert('RGB')).astype(float)
# Use the median of each row so clouds don't skew the colour.
row_col = np.median(srows, axis=1)
STRIP_TOP, STRIP_H = 20 + 1200, 270  # in sky-image rows
horizon = np.array([236, 226, 205], dtype=float)
sky = np.zeros((1920, 16, 3))
for yy in range(1920):
    if yy < STRIP_TOP:
        c = row_col[0]
    elif yy < STRIP_TOP + STRIP_H:
        c = row_col[min(len(row_col) - 1, int((yy - STRIP_TOP) / STRIP_H * len(row_col)))]
    else:
        t = min(1, (yy - STRIP_TOP - STRIP_H) / (1920 - STRIP_TOP - STRIP_H))
        c = row_col[-1] + (horizon - row_col[-1]) * t ** 1.3
    sky[yy, :, :] = c
save(Image.fromarray(sky.astype(np.uint8)).convert('RGBA'), 'backgrounds/sky.png')

mountain_strip = kit_b.crop(tight(kit_b, (0, 205, 1536, 320), alpha=100))
save(crossfade_tile(mountain_strip, 120), 'backgrounds/mountains.png')

hills = pieces_in(kit_b, (0, 322, 1536, 409))
save(compose(hills, 2048, max(p.height for p in hills), overlap=40, seed=2), 'backgrounds/hills.png')

trees = pieces_in(kit_b, (0, 409, 1536, 545), min_w=50)
save(compose(trees, 2048, max(p.height for p in trees), overlap=24, seed=3), 'backgrounds/trees.png')

village = pieces_in(kit_c, (250, 475, 1774, 620), min_w=100)
save(compose(village, 2048, max(p.height for p in village), spacing=(20, 120), seed=5), 'backgrounds/village.png')

# Foreground grass along the bottom of the screen: rows from foreground-grass-tiling.png, which
# repeat left-right as drawn. Row 1 = bushes and posts (front), row 2 = flowers and fence (behind).
# Rows 3 (logs, ferns) and 4 (autumn) are there for other seasons/areas later.
fg_sheet = S('foreground-grass-tiling.png')
FG_ROWS = {'foreground': ((0, 9, 2172, 202), 0.42), 'foreground-back': ((0, 224, 2172, 399), 0.36)}
for name, (box, k) in FG_ROWS.items():
    save(scale(fg_sheet.crop(box), k * HI), f'backgrounds/{name}.png')
    report[f'{name}.designHeight'] = round((box[3] - box[1]) * k, 1)

# Rails: the long straight rail from rails.png, cropped to whole sleeper repeats so it tiles.
K_RAIL = K_LOCO
rails_sheet = S('rails.png')
strip = rails_sheet.crop((34, 126, 2137, 206))
alpha = np.asarray(strip.getchannel('A')) > 128
rail_top = int(np.argmax(alpha.mean(axis=1) > 0.95))
b = alpha[-12:, :].mean(axis=0).astype(float)
b -= b.mean()
period = max(range(60, 180), key=lambda p: float(np.dot(b[:-p], b[p:])) / (len(b) - p))
n = (strip.width - 80) // period
rails_tile = strip.crop((40, 0, 40 + n * period, strip.height))
save(scale(rails_tile, K_RAIL * HI), 'backgrounds/rails.png')
train_layout['rails'] = {
    'height': round(rails_tile.height * K_RAIL, 2),
    'railTop': round(rail_top * K_RAIL, 2),
    'sleeperPeriod': period,
}

# Points (where a branch line splits off), for junctions.
points_box = tight(rails_sheet, (1730, 505, 2140, 680), alpha=100)
points = rails_sheet.crop(points_box)
pa = np.asarray(points.getchannel('A')) > 128
left = pa[:, : pa.shape[1] // 6].mean(axis=1)
points_rail_top = int(np.argmax(left > 0.9))
save(scale(points, K_RAIL * HI), 'sprites/points.png')
train_layout['points'] = {
    'width': round(points.width * K_RAIL, 2),
    'height': round(points.height * K_RAIL, 2),
    'railTop': round(points_rail_top * K_RAIL, 2),
}

# Ground: the grass embankment from grass-embankment.png, cut just below its sleeper tops (the
# rails have their own sleepers). It tiles left-right as drawn; below it the bottom colour
# continues so tall screens are covered. Scale 0.3 design px per sheet px, written at 2x.
bank = S('grass-embankment.png').crop((0, 362, 2172, 724)).convert('RGBA')
bottom = np.median(np.asarray(bank.convert('RGB'))[-20:].reshape(-1, 3), axis=0)
pad = 200
ground = Image.new('RGBA', (bank.width, bank.height + pad), tuple(int(c) for c in bottom) + (255,))
ground.alpha_composite(bank, (0, 0))
save(scale(ground, 0.3 * HI), 'backgrounds/ground.png')
report['ground.designHeight'] = round(ground.height * 0.3, 1)

# ------------------------------------------------------------------------------------------
# Desert area. Layer images are written at the sheet's own resolution; display.js (AREAS) sets
# how big each is drawn. Heights in design px are reported to src/config/area-art.json.
# ------------------------------------------------------------------------------------------
area_art = {}
dkit = remove_painted_background(S('desert-kit.png'))


def desert_layer(name, img, scale_):
    save(img, f'backgrounds/{name}.png')
    area_art[name] = {'height': round(img.height * scale_, 1)}


mesas = pieces_in(dkit, (0, 157, 1774, 250), min_w=60)
desert_layer('desert-mesas', compose(mesas, 2048, max(p.height for p in mesas), overlap=30, seed=7), 1.9)
dunes = dkit.crop(tight(dkit, (0, 268, 1774, 341), alpha=100))
dunes = crossfade_tile(dunes, 140)
# Continue the sand below the dunes so there's desert floor behind the rocks and village.
sand = np.median(np.asarray(dunes.convert('RGB'))[-4:].reshape(-1, 3), axis=0)
dunes_full = Image.new('RGBA', (dunes.width, dunes.height + 60), tuple(int(c) for c in sand) + (255,))
dunes_full.paste(Image.new('RGBA', (dunes.width, dunes.height), (0, 0, 0, 0)), (0, 0))
dunes_full.alpha_composite(dunes, (0, 0))
desert_layer('desert-dunes', dunes_full, 1.9)
rocks = pieces_in(dkit, (0, 360, 1774, 469), min_w=80)
desert_layer('desert-rocks', compose(rocks, 2048, max(p.height for p in rocks), spacing=(20, 160), seed=8), 1.5)
village_d = pieces_in(dkit, (0, 484, 1774, 614), min_w=60)
desert_layer('desert-village', compose(village_d, 2048, max(p.height for p in village_d), spacing=(10, 120), seed=9), 1.5)

# Sand bank under the rails (cut below its sleeper tops), like the grass one.
dbank = S('desert-embankment.png').crop((0, 398, 2170, 725)).convert('RGBA')
dbottom = np.median(np.asarray(dbank.convert('RGB'))[-20:].reshape(-1, 3), axis=0)
dground = Image.new('RGBA', (dbank.width, dbank.height + 200), tuple(int(c) for c in dbottom) + (255,))
dground.alpha_composite(dbank, (0, 0))
save(scale(crossfade_tile(dground, 120), 0.3 * HI), 'backgrounds/desert-ground.png')
area_art['desert-ground'] = {'height': round(dground.height * 0.3, 1)}

# Foreground rows have tapered ends, so they're crossfaded into a loop.
dfg = S('desert-foreground.png')
for name, box, k in (('desert-foreground', (40, 28, 2130, 198), 0.42), ('desert-foreground-back', (40, 219, 2130, 360), 0.36)):
    save(scale(crossfade_tile(dfg.crop(box), 160), k * HI), f'backgrounds/{name}.png')
    area_art[name] = {'height': round((box[3] - box[1]) * k, 1)}

# Landmarks and the tunnel.
# Tunnel mountain kit: a tall peak (cut off at the top, so it towers off the screen), a tapered
# rocky foothill for either side, and a grassy rock strip along the peak's foot.
save(scale(S('mountain-peak.png'), 0.75), 'sprites/mountain-peak.png')
save(scale(S('mountain-foothill.png').crop((115, 5, 2070, 511)), 0.5), 'sprites/mountain-foothill.png')
save(scale(S('mountain-base-strip.png').crop((0, 675, 1671, 941)), 0.45), 'sprites/mountain-base.png')
portal = scale(crop(S('tunnel-portal.png'), (0, 0, 1312, 1199)), 0.4)
save(portal, 'sprites/tunnel-portal.png')
save(portal.transpose(Image.FLIP_LEFT_RIGHT), 'sprites/tunnel-portal-exit.png')  # mirrored, for the far end

(ROOT / 'src' / 'config' / 'area-art.json').write_text(json.dumps(area_art, indent=2) + '\n')

(ROOT / 'src' / 'config' / 'train-art.json').write_text(json.dumps(train_layout, indent=2) + '\n')
print(json.dumps(report, indent=1))
print(json.dumps(train_layout, indent=1))
