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

from artlib import compose, crop, crossfade_tile, objects_in, scale, sheet, tight

ROOT = Path(__file__).resolve().parent.parent
SHEETS = ROOT / 'art' / 'sheets'
OUT = ROOT / 'assets'
HI = 2  # images are written at up to 2x their drawn size

# Drawn heights (design px), matching the meadow and desert.
H_MOUNTAINS, H_HILLS, H_TREES, H_VILLAGE = 185, 120, 190, 150
HILLS_PAD = 0.6  # hills continue down to the line in their bottom colour, so gaps never show sky
FG_K, FG_BACK_K, BANK_K = 0.42, 0.36, 0.3
RAILGRASS_H, FGTREES_H = 30, 440
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
    g = Image.new('RGBA', (b.width, b.height + 200), bottom_colour(b))
    g.paste(Image.new('RGBA', b.size, (0, 0, 0, 0)), (0, 0))
    g.alpha_composite(b, (0, 0))
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


SNOW, JUNGLE, MARSH, COAST, TOWN = (
    'snow-kit.png', 'jungle-layers.png', 'marsh-kit.png', 'coast-kit.png', 'town-layers.png')

# Each area: how to build each layer, the bank, the foreground rows, and its stops.
AREAS = {
    'snow': {
        'name': 'The Frozen Peaks',
        'mountains': lambda: scatter(S(SNOW), [(0, 12, 1774, 251)], 2048, (0, 0), overlap=20, grounded=14),
        'hills': lambda: strip(S(SNOW), (0, 258, 1774, 344)),
        'trees': lambda: scatter(S(SNOW), [(0, 351, 1774, 470)], 2048, (-10, 30), overlap=10),
        'village': lambda: scatter(S('snow-village-strip.png'), [(0, 225, 2172, 472)], 4096, (90, 380)),
        'bank': lambda: bank(S('snow-embankment.png'), (0, 345, 2170, 720)),
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
        'village': lambda: scatter(S('jungle-kit.png'), [(0, 485, 1774, 608)], 4096, (140, 420)),
        'bank': lambda: bank(S('jungle-embankment.png'), (0, 225, 2172, 724), solid=False),
        'fg': ('jungle-foreground-rows.png', 200, (8, 199), (208, 370)),
        'fg_clear': True,  # the sheet's white backdrop clings round the leaves
        'fg_drop': {'front': [(775, 862)], 'back': [(1495, 1995)]},  # wooden posts and fences
        # Big trees that sweep past in front of the train.
        'bank_over_rails': 8,  # the jungle bank's plants grow up in front of the track
        'fgtrees': lambda: scatter(S('jungle-kit.png'), [(0, 290, 1774, 464)], 6144, (700, 1600), min_w=120,
                                   keep=lambda p: p.height > 120, seed=4),
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
        'trees': lambda: scatter(S(MARSH, 150), [(0, 371, 1774, 507)], 2048, (-20, 20)),
        'village': lambda: scatter(S(MARSH, 150), [(0, 512, 1774, 659)], 4096, (160, 520)),
        'bank': lambda: bank(S('marsh-embankment.png'), (0, 165, 2172, 706)),
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
        'mountains': lambda: strip(S(TOWN), (0, 123, 2172, 231)),
        'hills': lambda: scatter(S(TOWN), [(0, 250, 2172, 326)], 2048, (-30, 0), overlap=10),
        'trees': lambda: strip(S(TOWN), (0, 331, 2172, 503)),
        'village': lambda: scatter(S('town-kit.png'), [(0, 327, 2172, 464)], 4096, (160, 520)),
        'bank': lambda: bank(S('town-embankment.png'), (0, 354, 2172, 715)),
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

    for area, a in AREAS.items():
        layers = {}
        mpad = a.get('mountains_pad', 0)  # continue the mountains down in their bottom colour
        layers['mountains'] = layer(f'{area}-mountains', pad_bottom(a['mountains'](), mpad) if mpad else a['mountains'](), H_MOUNTAINS * (1 + mpad))
        if mpad:
            layers['mountains']['bottom'] = round(441 + H_MOUNTAINS * mpad)
        hills = a['hills']()
        if 'hills_height' in a:
            layers['hills'] = {**layer(f'{area}-hills', hills, a['hills_height']), 'bottom': 590}
        else:
            colour = middle_colour(hills) if a.get('hills_pad') == 'middle' else None
            layers['hills'] = {**layer(f'{area}-hills', pad_bottom(hills, HILLS_PAD, colour), H_HILLS * (1 + HILLS_PAD)), 'bottom': 590}
        layers['trees'] = layer(f'{area}-trees', a['trees'](), H_TREES)
        layers['village'] = layer(f'{area}-village', a['village'](), H_VILLAGE)

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
