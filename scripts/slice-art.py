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
# Train. Source measurements are in train-bodies.png pixels (see display.js for how they map).
# ------------------------------------------------------------------------------------------
TRAIN_OUT_SCALE = 0.425  # sprites are written at 2x their in-game size so they stay sharp
bodies = S('train-bodies.png')

loco_box = (670, 10, 2082, 468)
save(scale(bodies.crop(loco_box), TRAIN_OUT_SCALE), 'sprites/locomotive.png')

TENDER_LEFT, TENDER_RIGHT, TENDER_RIM, TENDER_BOTTOM = 25, 1006, 462, 714
tender_body = bodies.crop((TENDER_LEFT, TENDER_RIM, TENDER_RIGHT, TENDER_BOTTOM))
save(scale(tender_body, TRAIN_OUT_SCALE), 'sprites/tender.png')
save(scale(tender_body, TRAIN_OUT_SCALE), 'sprites/wagon.png')

# The coal heap sits between the tender's brass corner posts. Parts of the locomotive overlap
# this area of the sheet (top right), so mask those out.
HEAP_BOX = (165, 380, 860, 463)
arr = np.asarray(bodies.crop(HEAP_BOX)).copy()
ys, xs = np.mgrid[HEAP_BOX[1]:HEAP_BOX[3], HEAP_BOX[0]:HEAP_BOX[2]]
arr[..., 3] = np.where((xs > 690) & (ys < 418), 0, arr[..., 3])
lum = arr[..., :3].mean(axis=2)
warm = (arr[..., 0].astype(int) - arr[..., 2].astype(int)) > 40
arr[..., 3] = np.where(warm & (lum > 70), 0, arr[..., 3])
heap = Image.fromarray(arr)
heap = heap.crop(heap.getchannel('A').point(lambda v: 255 if v > 100 else 0).getbbox())
report['heap.offset'] = [HEAP_BOX[0] - TENDER_LEFT, HEAP_BOX[1]]
save(scale(heap, TRAIN_OUT_SCALE), 'sprites/coal-heap.png')

# Ore for the cargo wagon: the coal heap recoloured to a rusty iron-ore brown.
ore = np.asarray(heap).astype(float)
l = ore[..., :3].mean(axis=2, keepdims=True) / 255.0
ore[..., :3] = np.clip(l * np.array([300, 190, 130]) + np.array([20, 10, 0]), 0, 255)
save(scale(Image.fromarray(ore.astype(np.uint8)), TRAIN_OUT_SCALE), 'sprites/cargo-load.png')

wheel = crop(S('wheel-large.png'), (0, 0, 1272, 1236)).resize((128, 128), Image.LANCZOS)
save(wheel, 'sprites/wheel.png')

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

# Track: crop a whole number of sleeper repeats from the middle of the longest segment.
seg = kit_b.crop((1075, 785, 1456, 868))
band = np.asarray(seg.convert('L')).astype(float)[20:40, :].mean(axis=0)
band -= band.mean()
best = max(range(14, 60), key=lambda p: float(np.dot(band[:-p], band[p:])) / (len(band) - p))
reps = (seg.width - 40) // best
track = seg.crop((20, 0, 20 + reps * best, seg.height))
rail_top = int(np.argmax((np.asarray(track.getchannel('A')) > 128).mean(axis=1) > 0.9))
save(track, 'backgrounds/track.png')
report['track.railTop'] = rail_top
report['track.sleeperPeriod'] = best

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

print(json.dumps(report, indent=1))
