"""Cuts the five extra areas (snow, jungle, marsh, coast, Victorian town) out of their sheets in
art/sheets and writes:
  assets/backgrounds/<area>-*.png   parallax layers, ground bank and foreground rows
  assets/pois/<area>-*.png          stop buildings
  assets/sprites/<area>-platform.png (where the area has one)
  src/config/new-areas.json         what the game needs to know (image paths, drawn heights)

    python3 scripts/slice-areas.py      (needs Pillow and numpy)

Each area is described in AREAS below by where things are on its sheets, so adding an area or
swapping a piece is a matter of editing that table.
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image

from artlib import compose, continue_down, paste_wrap, crop, crossfade_tile, objects_in, scale, sheet, tight

ROOT = Path(__file__).resolve().parent.parent
SHEETS = ROOT / 'art' / 'sheets'
OUT = ROOT / 'assets'
HI = 2  # images are written at up to 2x their drawn size

# Drawn heights (design px), matching the meadow and desert.
H_MOUNTAINS, H_HILLS, H_TREES, H_VILLAGE = 185, 120, 190, 150
HILLS_PAD = 0.6  # hills continue down to the line in their bottom colour, so gaps never show sky
FG_K, FG_BACK_K, BANK_K = 0.42, 0.36, 0.3
RAILGRASS_H, FGTREES_H = 30, 440
THICKET_H, UNDERGROWTH_H = 165, 70  # optional mid-distance layers (see display.js)
RAIL_Y = 560  # design y of the rail top (src/config/display.js)


def S(name, haze=None):
    img = sheet(str(SHEETS / name))
    if haze:  # some sheets have a faint painted haze instead of transparency
        a = np.asarray(img).copy()
        a[..., 3] = np.where(a[..., 3] < haze, 0, a[..., 3])
        img = Image.fromarray(a)
    return img


def save(img, rel):
    path = OUT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, optimize=True)
    return rel


def fit(img, height):
    """Downscale so the image is at most HI x its drawn height (keeps files small)."""
    k = min(1, height * HI / img.height)
    return scale(img, k) if k < 1 else img


def bottom_colour(img):
    rgb = np.asarray(img.convert('RGBA'))
    rows = rgb[-12:].reshape(-1, 4)
    rows = rows[rows[:, 3] > 200]
    return tuple(int(c) for c in np.median(rows[:, :3], axis=0)) + (255,)


def strip(img, box, blend=140):
    """A full-width row of scenery, made to tile."""
    return crossfade_tile(img.crop(tight(img, box, alpha=100)), blend)


def scatter(img, boxes, width, spacing, *, overlap=0, grounded=None, min_w=40, seed=1, keep=None):
    pieces = []
    for box in boxes:
        pieces += objects_in(img, box, min_w=min_w, grow=3, grounded=grounded)
    if keep:
        pieces = [p for p in pieces if keep(p)]
    return compose(pieces, width, max(p.height for p in pieces), spacing=spacing, overlap=overlap, seed=seed)


def clear_fringe(img, haze=200):
    """Pale, washed-out pixels (left from a painted white backdrop) that touch the transparent
    background are made transparent too, spreading inwards while they stay pale."""
    a = np.asarray(img.convert('RGBA')).copy()
    rgb = a[..., :3].astype(int)
    pale = (rgb.mean(axis=2) > 150) & ((rgb.max(axis=2) - rgb.min(axis=2)) < 60)
    bg = a[..., 3] < haze
    while True:
        g = bg.copy()
        g[1:] |= bg[:-1]
        g[:-1] |= bg[1:]
        g[:, 1:] |= bg[:, :-1]
        g[:, :-1] |= bg[:, 1:]
        g = bg | (g & pale)
        if (g == bg).all():
            break
        bg = g
    a[..., 3] = np.where(bg, 0, a[..., 3])
    return Image.fromarray(a)


def fog(width, height, *, seed, wisps, opacity, colour=(206, 218, 210)):
    """A soft band of mist that tiles left to right: blurred noise, thickest in the middle."""
    rng = np.random.default_rng(seed)
    w, h = width // 8, height // 8
    n = rng.random((h, w))
    n[:, :] *= rng.random((1, w)) ** 0.5  # some columns thinner than others
    # Blur, wrapping round horizontally so the band tiles.
    for _ in range(wisps):
        n = (np.roll(n, 1, 1) + n + np.roll(n, -1, 1)) / 3
        n[1:-1] = (n[:-2] + n[1:-1] + n[2:]) / 3
    n = (n - n.min()) / (n.max() - n.min())
    env = np.sin(np.linspace(0, np.pi, h)) ** 1.5
    a = np.clip(n * 1.6 - 0.15, 0, 1) * env[:, None]
    small = Image.fromarray((a * 255).astype(np.uint8))
    # Stretch with the left column repeated at the right, so the bilinear edge wraps too.
    wrapped = Image.fromarray(np.concatenate([np.asarray(small), np.asarray(small)[:, :1]], axis=1))
    big = wrapped.resize((width + width // w, height), Image.BILINEAR).crop((0, 0, width, height))
    # One colour at 256 strengths: a palette image whose entries differ only in transparency,
    # so it stays smooth and small (compress-images.py leaves palette images alone).
    out = Image.fromarray((np.asarray(big) * opacity).astype(np.uint8), 'P')
    out.putpalette(list(colour) * 256)
    out.info['transparency'] = bytes(range(256))
    return out


def solid(img, cut=150):
    """Hard edges: each pixel fully opaque or gone (drops painted mist round sprites)."""
    a = np.asarray(img).copy()
    a[..., 3] = np.where(a[..., 3] >= cut, 255, 0)
    return Image.fromarray(a)


def jungle_village():
    kit = S('jungle-kit.png')
    huts = objects_in(kit, (0, 485, 1774, 608), min_w=60, grow=3)
    trees = [p for p in objects_in(kit, (0, 290, 1774, 464), min_w=60, grow=3) if p.height > 120]
    plants = [p for p in objects_in(kit, (0, 290, 1774, 464), min_w=50, grow=3) if p.height <= 120]
    rng = __import__('random').Random(11)
    seq = []
    for hut in huts:  # each hut, then two or three trees and a bush
        seq.append(hut)
        seq += rng.sample(trees, 2 + rng.randint(0, 1))
        if plants:
            seq.append(rng.choice(plants))
    height = max(p.height for p in seq)
    tile = Image.new('RGBA', (8192, height), (0, 0, 0, 0))
    x = 0
    for p in seq:
        if x >= tile.width:
            break
        paste_wrap(tile, p, x, height - p.height)
        x += p.width - rng.randint(25, 60)
    return tile


def _flood(ok):
    from collections import deque
    h, w = ok.shape
    seen = np.zeros_like(ok)
    q = deque((0, x) for x in range(w) if ok[0, x])
    for y, x in q:
        seen[y, x] = True
    while q:
        y, x = q.popleft()
        for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
            if 0 <= ny < h and 0 <= nx < w and not seen[ny, nx] and ok[ny, nx]:
                seen[ny, nx] = True
                q.append((ny, nx))
    return seen


def key_sky(img):
    """Cuts the painted sky out of an opaque scene panel (flooding down from the top through
    bluish, cloud-white and pink-lit pixels), leaving the land and what stands on it."""
    a = np.asarray(img.convert('RGBA')).astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx, mn = np.maximum(np.maximum(r, g), b), np.minimum(np.minimum(r, g), b)
    ok = (b > r + 4) | ((mn > 150) & (mx - mn < 70)) | ((r > 150) & (b > 120) & (g < r) & (b > g))
    a[..., 3] = np.where(_flood(ok), 0, 255)
    return Image.fromarray(a.astype(np.uint8))


def key_flat(img):
    """Cuts a flat, pale lavender painted backdrop out of a panel (flooding down from the top)."""
    a = np.asarray(img.convert('RGBA')).astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx, mn = np.maximum(np.maximum(r, g), b), np.minimum(np.minimum(r, g), b)
    ok = (b >= g) & (mn > 110) & (mx - mn < 50)
    a[..., 3] = np.where(_flood(ok), 0, 255)
    return Image.fromarray(a.astype(np.uint8))


def side_by_side(*imgs):
    h = max(i.height for i in imgs)
    out = Image.new('RGBA', (sum(i.width for i in imgs), h), (0, 0, 0, 0))
    x = 0
    for i in imgs:
        out.alpha_composite(i, (x, h - i.height))
        x += i.width
    return out


def pad_top(img, px):
    """Continues an opaque backdrop upwards in its top row's colours (for tall screens)."""
    a = np.asarray(img.convert('RGBA'))
    colour = np.median(a[:6].reshape(-1, 4), axis=0).astype(np.uint8)
    top = np.broadcast_to(colour, (px, a.shape[1], 4))
    # Blend the first rows of the art into the flat colour so there's no hard line.
    out = np.concatenate([top, a], axis=0).astype(float)
    n = 40
    t = np.linspace(0, 1, n)[:, None, None]
    out[px:px + n] = colour * (1 - t) + out[px:px + n] * t
    return Image.fromarray(out.astype(np.uint8))


def badlands_trees():
    """Closer industrial skyline along the bottom, with a big factory every so often."""
    sky = strip(S('badlands-silhouettes-a.png'), (0, 307, 2172, 426))
    factories = [solid(tight_piece(S(f'badlands-factory-{c}.png'))) for c in 'abc']
    h = 520
    tile = Image.new('RGBA', (6144, h), (0, 0, 0, 0))
    sk = sky.resize((round(sky.width * h * 0.4 / sky.height), round(h * 0.4)), Image.LANCZOS)
    for x in range(0, tile.width, sk.width):
        paste_wrap(tile, sk, x, h - sk.height)
    rng = __import__('random').Random(4)
    x = 300
    for i in range(3):
        f = factories[i % 3]
        f = f.resize((round(f.width * h / f.height), h), Image.LANCZOS)
        paste_wrap(tile, f, x, 0)
        x += f.width + rng.randint(900, 1400)
    return tile


def tight_piece(img):
    return img.crop(img.getchannel('A').point(lambda v: 255 if v > 100 else 0).getbbox())


def drop_columns(img, ranges, blend=40):
    """Cuts out x ranges (e.g. fence posts), blending each join so it doesn't show."""
    keep, x = [], 0
    for x0, x1 in sorted(ranges):
        keep.append((x, x0))
        x = x1
    keep.append((x, img.width))
    out = img.crop((keep[0][0], 0, keep[0][1], img.height))
    for x0, x1 in keep[1:]:
        nxt = img.crop((x0, 0, x1, img.height))
        b = min(blend, out.width, nxt.width)
        a1 = np.asarray(out).astype(float)
        a2 = np.asarray(nxt).astype(float)
        a1[..., :3] *= a1[..., 3:4] / 255
        a2[..., :3] *= a2[..., 3:4] / 255
        t = np.linspace(0, 1, b)[None, :, None]
        mid = a1[:, -b:] * (1 - t) + a2[:, :b] * t
        m = np.concatenate([a1[:, :-b], mid, a2[:, b:]], axis=1)
        al = m[..., 3:4]
        m[..., :3] = np.where(al > 0, m[..., :3] * 255 / np.maximum(al, 1e-6), 0)
        out = Image.fromarray(np.clip(m, 0, 255).astype(np.uint8))
    return out


def middle_colour(img):
    """A darkened median of the image's middle rows (for padding below misty strips)."""
    a = np.asarray(img.convert('RGBA'))
    h = a.shape[0]
    rows = a[int(h * 0.45):int(h * 0.8)].reshape(-1, 4)
    rows = rows[rows[:, 3] > 200]
    return tuple(int(c * 0.8) for c in np.median(rows[:, :3], axis=0)) + (255,)


def pad_bottom(img, frac, colour=None):
    out = Image.new('RGBA', (img.width, int(img.height * (1 + frac))), colour or bottom_colour(img))
    out.paste(Image.new('RGBA', img.size, (0, 0, 0, 0)), (0, 0))
    out.alpha_composite(img, (0, 0))
    return out


def bank(img, box, solid=True):
    """The bank under the rails: cut below its sleeper tops, padded below, made to tile."""
    x0, y0, x1, y1 = box
    if solid:
        cov = (np.asarray(img.crop(box).getchannel('A')) > 128).mean(axis=1)
        y0 += int(np.argmax(cov > 0.97)) + 2
    b = img.crop((x0, y0, x1, y1))
    # Below the art, more of the same ground (not a flat colour band behind the foreground).
    solid_bg = Image.new('RGBA', b.size, bottom_colour(b))
    solid_bg.alpha_composite(b)
    filled = continue_down(solid_bg, 200)
    top = b.height // 3  # keep the original (transparent) top edge where the plants poke up
    g = filled.copy()
    g.paste(Image.new('RGBA', (b.width, top), (0, 0, 0, 0)), (0, 0))
    g.alpha_composite(b.crop((0, 0, b.width, top)), (0, 0))
    return crossfade_tile(g, 120)


def piece(img, box, index, *, grow=3, label=False):
    p = objects_in(img, box, min_w=50, grow=grow)[index]
    if label:
        # Drop a caption under the building: the last block of rows after a transparent gap.
        rows = (np.asarray(p.getchannel('A')) > 40).any(axis=1)
        gaps = np.where(~rows)[0]
        if len(gaps):
            p = p.crop((0, 0, p.width, gaps.max()))
            p = p.crop(p.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox())
    return p


BAD = 'badlands-layers-a.png'
SNOW, JUNGLE, MARSH, COAST, TOWN = (
    'snow-kit.png', 'jungle-layers.png', 'marsh-kit.png', 'coast-kit.png', 'town-layers.png')

# Each area: how to build each layer, the bank, the foreground rows, and its stops.
AREAS = {
    'badlands': {
        'name': 'The Iron Badlands',
        # Backdrop: the painted panorama (dusky sky, snowy peaks, mesas, plains), as one layer.
        'mountains': lambda: pad_top(crossfade_tile(S('badlands-panorama.png').crop((0, 0, 2172, 360)), 240), 160),
        'mountains_height': 640,
        'mountains_bottom': 500,
        'hills': lambda: Image.new('RGBA', (64, 8), (0, 0, 0, 0)),
        'hills_height': 8,
        # Middle distance: the preview panels' golden hills with ruined arches, windmills,
        # banner poles and the old water tower (their painted sky cut out).
        'thicket': lambda: crossfade_tile(side_by_side(
            key_sky(S('badlands-preview-a.png').crop((0, 247, 2172, 512))),
            key_sky(S('badlands-preview-b.png').crop((0, 247, 2172, 512)))), 160),
        'thicket_height': 215,
        'trees': lambda: Image.new('RGBA', (64, 8), (0, 0, 0, 0)),
        'trees_height': 8,
        # The odd tank, gantry or water tower nearer the line, well spread out.
        'village': lambda: scatter(S('badlands-kit.png'), [(0, 255, 2172, 394)], 6144, (1200, 2200), min_w=60),
        # Rocks, fences, lamps, cartwheels and a skull in dry grass along the line.
        'undergrowth': lambda: crossfade_tile(side_by_side(
            key_flat(S('badlands-preview-a.png').crop((0, 523, 2172, 724))),
            key_flat(S('badlands-preview-b.png').crop((0, 523, 2172, 724)))), 120),
        'undergrowth_height': 62,
        'bank_reuse': ('desert-ground', 158.1),  # dry grass and sand, like the previews
        'fg': ('badlands-layers-a.png', None, (602, 722), None),
        'stops': [
            ('badlands-stops.png', (0, 4, 2172, 304), {'town': 0, 'workshop': 1, 'mine': 2, 'coalDepot': 3}),
            ('badlands-stops.png', (0, 320, 2172, 542), {'waterTower': 0}),
        ],
        'platform': ('badlands-stops.png', (0, 320, 2172, 542), 3, 110),
    },
    'snow': {
        'name': 'The Frozen Peaks',
        'mountains': lambda: scatter(S(SNOW), [(0, 12, 1774, 251)], 2048, (0, 0), overlap=20, grounded=14),
        'hills': lambda: strip(S(SNOW), (0, 258, 1774, 344)),
        'trees': lambda: scatter(S(SNOW), [(0, 351, 1774, 470)], 2048, (-10, 30), overlap=10),
        'village': lambda: scatter(S('snow-village-strip.png'), [(0, 225, 2172, 472)], 4096, (90, 380)),
        'bank': lambda: bank(S('snow-embankment.png'), (0, 345, 2170, 720)),
        # Snowy bushes, rocks and little pines along the line (no gaps down to it).
        'undergrowth': lambda: scatter(S('snow-props.png'), [(0, 162, 2172, 305)], 4096, (-30, 10), min_w=40, seed=6),
        'fg': ('snow-foreground-rows.png', None, (10, 193), (208, 387)),
        'stops': [('snow-stops.png', (0, 0, 2172, 390), {'coalDepot': 0, 'town': 1, 'mine': 2, 'workshop': 3, 'waterTower': 4})],
        'platform': ('snow-stops.png', (0, 395, 2172, 700), 4, 110),
    },
    'jungle': {
        'name': 'The Emerald Jungle',
        'mountains': lambda: strip(S(JUNGLE), (0, 5, 2172, 183)),
        # Misty distant canopy (the jungle-layers panel has a giant tree cut flat at the top).
        'hills': lambda: strip(S('jungle-kit.png'), (0, 212, 1774, 289)),
        'mountains_pad': 0.4,  # the canopy's misty top is see-through; keep sky from showing behind it
        'hills_pad': 'middle',  # its bottom rows are pale mist; fill below with canopy green
        # Free-standing banyans, palms and bamboo (the close-up panel on jungle-layers is cut flat on top).
        'trees': lambda: scatter(S('jungle-kit.png'), [(0, 290, 1774, 464)], 2048, (-30, 10), overlap=10, min_w=60),
        # Huts with jungle trees crowded between them (trees are taller, so the layer is too).
        'village': lambda: jungle_village(),
        'village_height': 205,
        'bank': lambda: bank(S('jungle-embankment.png'), (0, 225, 2172, 724), solid=False),
        'fg': ('jungle-foreground-rows.png', 200, (8, 199), (208, 370)),
        'fg_clear': True,  # the sheet's white backdrop clings round the leaves
        'fg_drop': {'front': [(775, 862)], 'back': [(1495, 1995)]},  # wooden posts and fences
        # Dense jungle: tree-line clumps packed edge to edge behind the trees, and ferns,
        # bushes and flowers crowding the line.
        'thicket': lambda: scatter(S('jungle-kit-d.png'), [(0, 305, 1774, 439)], 3072, (-90, -40), grounded=14, min_w=80),
        'undergrowth': lambda: scatter(S('jungle-trees.png'), [(0, 494, 2172, 701)], 4096, (-40, 10), min_w=60, seed=3),
        # Big trees that sweep past in front of the train.
        'bank_over_rails': 8,  # the jungle bank's plants grow up in front of the track
        'fgtrees': lambda: solid(scatter(S('jungle-kit.png'), [(0, 290, 1774, 464)], 6144, (700, 1600), min_w=120,
                                         keep=lambda p: p.height > 120, seed=4)),
        'stops': [
            ('jungle-stops.png', (0, 0, 2172, 268), {'waterTower': 0, 'workshop': 3}),
            ('jungle-stops.png', (0, 268, 2172, 500), {'town': 0, 'coalDepot': 6}),
            ('jungle-stops.png', (0, 500, 2172, 700), {'mine': (7, 0.44)}),  # the cave, not its crates
        ],
    },
    'marsh': {
        'name': 'The Mistbound Marshes',
        'fog': True,
        'mountains': lambda: scatter(S(MARSH, 150), [(0, 6, 1774, 267)], 2048, (0, 40), grounded=14, min_w=200),
        'hills': lambda: strip(S(MARSH, 150), (0, 274, 1774, 369)),
        'hills_pad': 'middle',  # fill below the tree line with its own green, not the pale water edge
        'trees': lambda: scatter(S(MARSH, 150), [(0, 371, 1774, 507)], 2048, (-20, 20)),
        'village': lambda: scatter(S(MARSH, 150), [(0, 512, 1774, 659)], 4096, (160, 520)),
        'bank': lambda: bank(S('marsh-embankment.png'), (0, 165, 2172, 706)),
        # A second, denser row of willows behind the first, and reeds along the line.
        'thicket': lambda: scatter(S('marsh-kit-b.png', 150), [(0, 345, 1774, 452)], 3072, (-70, -30), min_w=60, seed=2),
        'undergrowth': lambda: scatter(S('marsh-kit-b.png', 150), [(0, 630, 1060, 701)], 4096, (-10, 40), min_w=40, seed=5),
        'fg': ('marsh-foreground-rows.png', None, (6, 169), (184, 308)),
        'stops': [('marsh-train-kit.png', (270, 367, 1536, 853),
                   {'coalDepot': 3, 'mine': 4, 'workshop': 8, 'town': 9, 'waterTower': 16}, 'label')],
    },
    'coast': {
        'name': 'The Saltwind Coast',
        'mountains': lambda: scatter(S(COAST), [(0, 157, 2172, 251)], 2048, (0, 120)),
        # The open sea, running down to the line.
        'hills': lambda: crossfade_tile(S('coast-sea.png').crop((0, 300, 2172, 724)), 200),
        'trees': lambda: scatter(S(COAST), [(0, 268, 2172, 408)], 4096, (300, 900)),
        'village': lambda: scatter(S(COAST), [(0, 543, 2172, 693)], 4096, (200, 600)),
        'bank': lambda: bank(S('coast-embankment.png'), (0, 334, 2172, 709)),
        'fg': ('coast-foreground-rows.png', None, (18, 183), (208, 370)),
        'stops': [
            ('coast-stops.png', (0, 9, 2172, 276), {'coalDepot': 0, 'town': 2}),
            ('coast-stops.png', (0, 280, 2172, 512), {'workshop': 2, 'waterTower': 3}),
            ('coast-stops.png', (0, 520, 2172, 705), {'mine': 0}),
        ],
        'hills_height': 200,  # the sea, already full height
    },
    'town': {
        'name': 'Brasswick',
        'mountains_pad': 0.6,  # continue the skyline down so no sky shows through arches and gaps
        'mountains': lambda: strip(S(TOWN), (0, 123, 2172, 231)),
        'hills': lambda: scatter(S(TOWN), [(0, 250, 2172, 326)], 2048, (-30, 0), overlap=10),
        'trees': lambda: strip(S(TOWN), (0, 331, 2172, 503)),
        'village': lambda: scatter(S('town-kit.png'), [(0, 327, 2172, 464)], 4096, (160, 520)),
        'bank': lambda: bank(S('town-embankment.png'), (0, 354, 2172, 715)),
        # Hedges, planters and bushes along the line.
        'undergrowth': lambda: scatter(S('town-kit.png'), [(0, 591, 2172, 706)], 4096, (-20, 15), min_w=40, seed=8),
        'fg': ('town-foreground-rows.png', None, (4, 196), None),  # the bank is already a wall
        'stops': [
            ('town-kit.png', (0, 159, 2172, 322), {'town': 0, 'workshop': 5, 'coalDepot': 8, 'waterTower': 9}),
            ('victorian-station-props.png', (0, 452, 1774, 660), {'mine': 6}),
        ],
        'platform': ('victorian-station-props.png', (0, 240, 1774, 452), 0, 125),
    },
}


def main():
    out = {'images': {}, 'areas': []}

    def layer(key, img, height, rel_dir='backgrounds'):
        rel = save(fit(img, height), f'{rel_dir}/{key}.png')
        out['images'][key] = rel
        return {'key': key, 'height': round(height, 1)}

    # Extra layers for areas built by slice-art.py (merged in display.js).
    out['extraLayers'] = {
        'desert': {
            'undergrowth': layer('desert-undergrowth', scatter(S('desert-props.png'), [(0, 523, 1225, 676), (1580, 523, 2172, 676)], 4096, (-25, 15), min_w=40, seed=7), UNDERGROWTH_H),
        },
    }

    for area, a in AREAS.items():
        layers = {}
        mpad = a.get('mountains_pad', 0)  # continue the mountains down in their bottom colour
        layers['mountains'] = layer(f'{area}-mountains', pad_bottom(a['mountains'](), mpad) if mpad else a['mountains'](), a.get('mountains_height', H_MOUNTAINS * (1 + mpad)))
        if mpad:
            layers['mountains']['bottom'] = round(441 + H_MOUNTAINS * mpad)
        if 'mountains_bottom' in a:
            layers['mountains']['bottom'] = a['mountains_bottom']
        hills = a['hills']()
        if 'hills_height' in a:
            layers['hills'] = {**layer(f'{area}-hills', hills, a['hills_height']), 'bottom': 590}
        else:
            colour = middle_colour(hills) if a.get('hills_pad') == 'middle' else None
            layers['hills'] = {**layer(f'{area}-hills', pad_bottom(hills, HILLS_PAD, colour), H_HILLS * (1 + HILLS_PAD)), 'bottom': 590}
        layers['trees'] = layer(f'{area}-trees', a['trees'](), a.get('trees_height', H_TREES))
        layers['village'] = layer(f'{area}-village', a['village'](), a.get('village_height', H_VILLAGE))

        if 'bank_reuse' in a:  # another area's bank (already loaded by the game)
            key, th = a['bank_reuse']
            layers['ground'] = {'key': key, 'height': 1500, 'tileHeight': th}
        else:
            b = a['bank']()
            bh = b.height * BANK_K
            rel = save(scale(b, BANK_K * HI), f'backgrounds/{area}-ground.png')
            out['images'][f'{area}-ground'] = rel
            layers['ground'] = {'key': f'{area}-ground', 'height': 1500, 'tileHeight': round(bh, 1)}
        if a.get('bank_over_rails'):
            # The bank's plant tops rise this many px above its usual top (just under the
            # sleepers) and it is drawn in front of the track (still behind the train).
            layers['ground'].update(bottom=RAIL_Y + 6 + 1500 - a['bank_over_rails'], depth=6.4)

        fg_sheet, haze, front, back = a['fg']
        fs = clear_fringe(S(fg_sheet), haze) if a.get('fg_clear') else S(fg_sheet, haze)
        drops = a.get('fg_drop', {})
        for name, rows, k in ((f'{area}-foreground', front, FG_K), (f'{area}-foreground-back', back, FG_BACK_K)):
            if rows is None:  # no row here: an empty strip, so the meadow's doesn't show
                out['images'][name] = save(Image.new('RGBA', (64, 8), (0, 0, 0, 0)), f'backgrounds/{name}.png')
                layers['foreground-back'] = {'key': name, 'height': 8}
                continue
            y0, y1 = rows
            row = fs.crop((40, y0, fs.width - 42, y1))
            ranges = drops.get('front' if name.endswith('foreground') else 'back')
            if ranges:
                row = drop_columns(row, [(x0 - 40, x1 - 40) for x0, x1 in ranges])
            row = crossfade_tile(row, 160)
            h = row.height * k
            rel = save(scale(row, k * HI), f'backgrounds/{name}.png')
            out['images'][name] = rel
            layers['foreground' if name.endswith('foreground') else 'foreground-back'] = {'key': name, 'height': round(h, 1)}

        if 'railgrass' in a:
            layers['railgrass'] = layer(f'{area}-railgrass', a['railgrass'](), RAILGRASS_H)
        # Dense mid-distance layers: a thicket behind the trees (no gaps down to the line) and
        # undergrowth along the line in front of the village.
        if 'thicket' in a:
            layers['thicket'] = layer(f'{area}-thicket', a['thicket'](), a.get('thicket_height', THICKET_H))
        if 'undergrowth' in a:
            layers['undergrowth'] = layer(f'{area}-undergrowth', a['undergrowth'](), a.get('undergrowth_height', UNDERGROWTH_H))
        if 'fgtrees' in a:
            layers['foreground-trees'] = layer(f'{area}-fgtrees', a['fgtrees'](), FGTREES_H)
        if a.get('fog'):
            # Drifting mist: a band among the trees behind the line, and a thinner one low
            # over the track, in front of the train.
            layers['fog-back'] = layer(f'{area}-fog-back', fog(2048, 256, seed=1, wisps=40, opacity=0.95), 230)
            layers['fog-front'] = layer(f'{area}-fog-front', fog(2048, 192, seed=2, wisps=30, opacity=0.7), 150)

        buildings = {}
        for stop in a['stops']:
            name, box, picks = stop[:3]
            label = len(stop) > 3
            img = S(name)
            for poi_type, index in picks.items():
                key = f'{area}-{poi_type}'
                index, keep_from = index if isinstance(index, tuple) else (index, 0)
                b = piece(img, box, index, label=label)
                if keep_from:  # drop clutter on the left of the building
                    b = b.crop((int(b.width * keep_from), 0, b.width, b.height))
                    b = b.crop(b.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox())
                out['images'][key] = save(fit(b, 235), f'pois/{key}.png')
                buildings[poi_type] = [key]

        entry = {'id': area, 'name': a['name'], 'layers': layers, 'buildings': buildings}
        if 'platform' in a:
            name, box, index, height = a['platform']
            key = f'{area}-platform'
            out['images'][key] = save(fit(piece(S(name), box, index), height), f'sprites/{key}.png')
            entry['platform'] = key
            entry['platformHeight'] = height
        out['areas'].append(entry)
        print('built', area, {k: v.get('height') for k, v in layers.items()})

    (ROOT / 'src' / 'config' / 'new-areas.json').write_text(json.dumps(out, indent=2) + '\n')


if __name__ == '__main__':
    main()
