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


def assemble(img, body, chassis, dy, wheels, *, heap=None, bake_wheels=False, erase=()):
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
                          [(1580, 575, 75), (1950, 575, 75)], heap=(1478, 2062, 167))
save_car('tender', car, lay, K_LOCO, heap, 'coal-heap')

# Passenger carriage on two bogies (the second underframe on the sheet).
carriage_sheet = S('carriage-and-underframes.png')
car, lay, _ = assemble(carriage_sheet, (118, 32, 1656, 528), (36, 718, 1738, 860), -287,
                       [(357, 770, 92), (642, 770, 92), (1132, 770, 92), (1412, 770, 92)])
save_car('carriage', car, lay, K_CARRIAGE)

# Goods wagons: every wagon on the sheet has the same underframe layout.
wagons_sheet = S('goods-wagons.png')
WAGONS = {
    'logs': ((16, 119, 406, 318), (16, 363, 406, 451)),
    'coal': ((411, 114, 768, 318), (412, 363, 768, 451)),
    'crates': ((775, 113, 1141, 319), (774, 363, 1142, 451)),
    'tanker': ((1148, 74, 1523, 319), (1147, 362, 1523, 451)),
    'boxcar': ((16, 588, 396, 808), (16, 851, 396, 940)),
    'slatted': ((402, 588, 768, 808), (402, 851, 768, 940)),
    'tarp': ((775, 607, 1142, 808), (775, 851, 1142, 940)),
    'stone': ((1148, 507, 1521, 808), (1147, 850, 1522, 941)),
}


def wagon_parts(body, chassis):
    dy = (body[3] - 52) - chassis[1]
    w, h = chassis[2] - chassis[0], chassis[3] - chassis[1]
    hub = chassis[1] + 2 + int(0.43 * h)
    r = chassis[3] - hub + 2
    return dy, [(chassis[0] + int(0.27 * w), hub, r), (chassis[0] + int(0.73 * w), hub, r)]


# The train's own goods wagon: the coal wagon, with its load recoloured as iron ore.
body, chassis = WAGONS['coal']
dy, wheels = wagon_parts(body, chassis)
car, lay, heap = assemble(wagons_sheet, body, chassis, dy, wheels, heap=(462, 720, 176))
ore = np.asarray(heap).astype(float)
l = ore[..., :3].mean(axis=2, keepdims=True) / 255.0
ore[..., :3] = np.clip(l * np.array([300, 190, 130]) + np.array([20, 10, 0]), 0, 255)
save_car('wagon', car, lay, K_WAGON, Image.fromarray(ore.astype(np.uint8)), 'cargo-load')

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

# The sheets have no water / wrench / distance icons, so paint pixel-art ones into the same frame.
PIXEL_ICONS = {
    'ui/icon-water.png': (
        {'b': (58, 132, 224), 'd': (28, 78, 160), 'w': (200, 232, 255)},
        [
            '.......dd.......',
            '......dbbd......',
            '......dbbd......',
            '.....dbbbbd.....',
            '.....dbbbbd.....',
            '....dbbbbbbd....',
            '...dbbbbbbbbd...',
            '...dbwbbbbbbd...',
            '..dbbwbbbbbbbd..',
            '..dbbwbbbbbbbd..',
            '..dbbbwbbbbbbd..',
            '..dbbbbbbbbbbd..',
            '...dbbbbbbbbd...',
            '....dbbbbbbd....',
            '.....dddddd.....',
            '................',
        ],
    ),
    'ui/icon-condition.png': (
        {'g': (196, 202, 208), 'd': (96, 102, 110), 'r': (176, 60, 52)},
        [
            '..........ggg...',
            '.........gg.....',
            '........gg....g.',
            '........gg...gg.',
            '........ggggggg.',
            '.......ggggggd..',
            '......gggddd....',
            '.....gggd.......',
            '....gggd........',
            '...gggd.........',
            '..rrrd..........',
            '.rrrd...........',
            '.rrd............',
            '..d.............',
            '................',
            '................',
        ],
    ),
    'ui/icon-distance.png': (
        {'p': (120, 82, 50), 'r': (200, 50, 44), 'R': (150, 30, 30), 'w': (240, 230, 210)},
        [
            '................',
            '..prrrrrrr......',
            '..prrwwrrrrr....',
            '..prrwwrrrrrr...',
            '..prrrrrrrrRR...',
            '..prrrrrrRR.....',
            '..pRRRRR........',
            '..p.............',
            '..p.............',
            '..p.............',
            '..p.............',
            '..p.............',
            '..p.............',
            '.ppp............',
            'ppppp...........',
            '................',
        ],
    ),
}
frame = crop(master, icons['ui/icon-fuel.png']).copy()
inner = (14, 14, frame.width - 14, frame.height - 14)
bg = frame.getpixel((frame.width // 2, 18))
for rel, (palette, rows) in PIXEL_ICONS.items():
    icon = frame.copy()
    ImageDraw.Draw(icon).rectangle(inner, fill=bg)
    px = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch in palette:
                px.putpixel((x, y), palette[ch] + (255,))
    size = (inner[2] - inner[0]) - 6
    px = px.resize((size, size), Image.NEAREST)
    icon.alpha_composite(px, ((icon.width - size) // 2, (icon.height - size) // 2))
    save(icon, rel)

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


# Sky: vertical gradient using the colours of the sky band in the flattened preview sheet.
flat = np.asarray(S('parallax-preview-flat.png').convert('RGB')).astype(float)
top = np.median(flat[2:6, :, :].reshape(-1, 3), axis=0)
mid = np.median(flat[80:90, :, :].reshape(-1, 3), axis=0)
horizon = np.array([236, 226, 205], dtype=float)
sky = np.zeros((720, 16, 3))
for yy in range(720):
    t = yy / 719
    c = top + (mid - top) * min(1, t / 0.55) if t < 0.55 else mid + (horizon - mid) * ((t - 0.55) / 0.45) ** 1.4
    sky[yy, :, :] = c
save(Image.fromarray(sky.astype(np.uint8)).convert('RGBA'), 'backgrounds/sky.png')

clouds = [p for p in pieces_in(kit_b, (0, 0, 1536, 212)) if p.height < 110]
save(compose(clouds, 2048, 240, spacing=(10, 120), seed=4, align='random'), 'backgrounds/clouds.png')

mountain_strip = kit_b.crop(tight(kit_b, (0, 205, 1536, 320), alpha=100))
save(crossfade_tile(mountain_strip, 120), 'backgrounds/mountains.png')

hills = pieces_in(kit_b, (0, 322, 1536, 409))
save(compose(hills, 2048, max(p.height for p in hills), overlap=40, seed=2), 'backgrounds/hills.png')

trees = pieces_in(kit_b, (0, 409, 1536, 545), min_w=50)
save(compose(trees, 2048, max(p.height for p in trees), overlap=24, seed=3), 'backgrounds/trees.png')

village = pieces_in(kit_c, (250, 475, 1774, 620), min_w=100)
save(compose(village, 2048, max(p.height for p in village), spacing=(20, 120), seed=5), 'backgrounds/village.png')

hedges = pieces_in(kit_b, (0, 698, 1536, 778))
save(compose(hedges, 2048, max(p.height for p in hedges), spacing=(30, 220), seed=6), 'backgrounds/foreground.png')

# Track bed: the gravel, dirt and grass from the old track strip (below its rails), a whole
# number of sleeper repeats wide so it tiles.
seg = kit_b.crop((1075, 785, 1456, 868))
band = np.asarray(seg.convert('L')).astype(float)[20:40, :].mean(axis=0)
band -= band.mean()
best = max(range(14, 60), key=lambda p: float(np.dot(band[:-p], band[p:])) / (len(band) - p))
reps = (seg.width - 40) // best
save(crossfade_tile(seg.crop((10, 44, 10 + reps * best + 40, seg.height)), 40), 'backgrounds/trackbed.png')

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

# Ground: speckled pixel-art dirt using colours sampled from the ground chunks.
chunk = np.asarray(kit_b.crop((252, 932, 428, 976)).convert('RGB')).reshape(-1, 3).astype(float)
lum = chunk.mean(axis=1)
dirt_mid = np.median(chunk[(lum > np.percentile(lum, 35)) & (lum < np.percentile(lum, 65))], axis=0)
dirt_dark = np.median(chunk[lum < np.percentile(lum, 15)], axis=0)
dirt_light = np.median(chunk[lum > np.percentile(lum, 85)], axis=0)
GW, GH, PX = 384, 160, 4  # tile size and art-pixel size
rng = np.random.default_rng(8)
cells = rng.random((GH // PX, GW // PX))
grid = np.where(cells < 0.12, 0, np.where(cells > 0.9, 2, 1))
palette = np.stack([dirt_dark, dirt_mid, dirt_light]).astype(np.uint8)
ground_rgb = palette[grid].repeat(PX, axis=0).repeat(PX, axis=1)
# Darken towards the top, where the ballast casts a shadow.
fade = np.clip(1 - np.linspace(0.35, 0, 24), 0, 1)[:, None, None]
ground_rgb = ground_rgb.astype(float)
ground_rgb[:24] *= fade
ground = Image.fromarray(ground_rgb.astype(np.uint8)).convert('RGBA')
save(ground, 'backgrounds/ground.png')

(ROOT / 'src' / 'config' / 'train-art.json').write_text(json.dumps(train_layout, indent=2) + '\n')
print(json.dumps(report, indent=1))
print(json.dumps(train_layout, indent=1))
