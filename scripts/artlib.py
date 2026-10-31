"""Helpers for cutting sprites out of the AI-generated sheets in art/sheets.

Pieces are found automatically: inside a rectangle of a sheet, opaque pixels are grouped into
connected blobs (after a small dilation so a lamp post next to a building counts as one blob).
"""
from collections import deque

import numpy as np
from PIL import Image

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
