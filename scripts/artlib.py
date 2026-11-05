"""Helpers for cutting sprites out of the AI-generated sheets in art/sheets.

Pieces are found automatically: inside a rectangle of a sheet, opaque pixels are grouped into
connected blobs (after a small dilation so a lamp post next to a building counts as one blob).
"""
from collections import deque

import numpy as np
from PIL import Image
import random

_cache = {}


def sheet(path):
    if path not in _cache:
        _cache[path] = Image.open(path).convert('RGBA')
    return _cache[path]


def find_pieces(img, box, *, alpha=24, step=2, grow=3, min_size=12):
    """Bounding boxes (in sheet pixels) of connected opaque blobs inside `box`, left to right."""
    x0, y0, x1, y1 = box
    a = np.asarray(img.crop(box).getchannel('A'))[::step, ::step] > alpha
    # Dilate so nearly-touching parts join up.
    m = a.copy()
    for _ in range(grow):
        d = m.copy()
        d[1:, :] |= m[:-1, :]
        d[:-1, :] |= m[1:, :]
        d[:, 1:] |= m[:, :-1]
        d[:, :-1] |= m[:, 1:]
        m = d
    h, w = m.shape
    seen = np.zeros_like(m)
    out = []
    for sy in range(h):
        for sx in range(w):
            if not m[sy, sx] or seen[sy, sx]:
                continue
            q = deque([(sy, sx)])
            seen[sy, sx] = True
            ys, xs = [], []
            while q:
                y, x = q.popleft()
                ys.append(y)
                xs.append(x)
                for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                    if 0 <= ny < h and 0 <= nx < w and m[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        q.append((ny, nx))
            bx0, bx1 = min(xs) * step + x0, (max(xs) + 1) * step + x0
            by0, by1 = min(ys) * step + y0, (max(ys) + 1) * step + y0
            if bx1 - bx0 >= min_size and by1 - by0 >= min_size:
                out.append(tight(img, (bx0, by0, bx1, by1), alpha))
    return sorted(out, key=lambda b: (b[0], b[1]))


def tight(img, box, alpha=24):
    """Shrink a box to the opaque pixels inside it."""
    crop = img.crop(box)
    bb = crop.getchannel('A').point(lambda v: 255 if v > alpha else 0).getbbox()
    if not bb:
        return box
    return (box[0] + bb[0], box[1] + bb[1], box[0] + bb[2], box[1] + bb[3])


def cut(img, box):
    return img.crop(box)


def fit_width(im, width, resample=Image.LANCZOS):
    h = round(im.height * width / im.width)
    return im.resize((width, h), resample)


def fit_height(im, height, resample=Image.LANCZOS):
    w = round(im.width * height / im.height)
    return im.resize((w, height), resample)


def scale(img, factor, resample=Image.LANCZOS):
    return img.resize((max(1, round(img.width * factor)), max(1, round(img.height * factor))), resample)


def crop(img, box):
    return img.crop(tight(img, box, alpha=100))


def pieces_in(img, box, min_w=30):
    return [img.crop(p) for p in find_pieces(img, box, alpha=100, grow=1, min_size=16) if p[2] - p[0] >= min_w]


def objects_in(img, box, min_w=30, grow=6, grounded=None, with_x=False):
    """Like pieces_in, but each piece is cut out by its own outline (not a rectangle), so parts
    of neighbouring objects never come with it. Bits within `grow` px (leaf tips, pebbles)
    stay attached to their object."""
    from collections import deque
    region = img.crop(box)
    alpha = np.asarray(region.getchannel('A')) > 20
    m = alpha.copy()
    for _ in range(grow):
        d = m.copy()
        d[1:] |= m[:-1]; d[:-1] |= m[1:]; d[:, 1:] |= m[:, :-1]; d[:, :-1] |= m[:, 1:]
        m = d
    h, w = m.shape
    label = np.zeros((h, w), dtype=np.int32)
    out, n = [], 0
    for sy, sx in zip(*np.nonzero(m)):
        if label[sy, sx]:
            continue
        n += 1
        q = deque([(sy, sx)])
        label[sy, sx] = n
        while q:
            y, x = q.popleft()
            for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= ny < h and 0 <= nx < w and m[ny, nx] and not label[ny, nx]:
                    label[ny, nx] = n
                    q.append((ny, nx))
    arr = np.asarray(region).copy()
    for i in range(1, n + 1):
        own = (label == i) & alpha
        ys, xs = np.nonzero(own)
        if len(xs) == 0 or xs.max() - xs.min() + 1 < min_w:
            continue
        # Only things standing on the band's ground line (drops clouds, stray strips).
        if grounded is not None and (ys.max() < h - grounded or ys.max() - ys.min() < 20):
            continue
        piece = arr.copy()
        piece[..., 3] = np.where(label == i, piece[..., 3], 0)
        out.append((xs.min(), Image.fromarray(piece).crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))))
    out.sort(key=lambda t: t[0])
    if with_x:
        return [(box[0] + x, p) for x, p in out]
    return [p for _, p in out]


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




def continue_down(img, extra, body=(0.3, 0.92), blend=24):
    """Extends a bank downwards by `extra` px with copies of its own middle rows (blended at
    each join), so what shows below the art is more of the same ground, not a flat colour."""
    import numpy as np
    a = np.asarray(img.convert('RGBA')).astype(float)
    a = a[:int(a.shape[0] * 0.9)]  # drop the art's own bottom edge (often a ledge or shadow)
    h = a.shape[0]
    extra += img.height - h  # (keep the same overall height)
    src = a[int(h * body[0]):int(h * body[1])]
    out = a.copy()
    while out.shape[0] < h + extra:
        n = min(blend, out.shape[0], src.shape[0])
        t = np.linspace(0, 1, n)[:, None, None]
        joined = out[-n:] * (1 - t) + src[:n] * t
        out = np.concatenate([out[:-n], joined, src[n:]], axis=0)
    out = out[:h + extra]
    out[..., 3] = np.where(np.arange(out.shape[0])[:, None] >= h, 255, out[..., 3])
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))
