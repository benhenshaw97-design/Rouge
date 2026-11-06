"""Makes the train's paint schemes (liveries) by recolouring the red trim and wheels of the
train sprites, like the green and blue engines on variants-sheet.png. Only strongly red pixels
change, so the black, brass and wood stay as they are, and the wheels keep turning in game.

    python3 scripts/make-liveries.py && python3 scripts/compress-images.py

Writes assets/sprites/<part>-<livery>.png for every livery below except red (the original).
The game's liveries are listed in src/config/balance.js (LIVERIES).
"""
import colorsys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SPRITES = ROOT / 'assets' / 'sprites'
PARTS = ['locomotive', 'tender', 'wagon', 'carriage', 'wheel']

# livery: (target hue 0..1, saturation scale, value scale)
LIVERIES = {
    'green': (0.33, 0.85, 0.85),
    'blue': (0.61, 0.95, 0.95),
    'royal': (0.78, 0.8, 0.9),  # plum
    'gold': (0.12, 0.95, 1.05),  # mustard
}


def recolour(img, hue, s_k, v_k):
    a = np.asarray(img.convert('RGBA')).astype(float) / 255
    rgb = a[..., :3]
    mx, mn = rgb.max(2), rgb.min(2)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    # Red trim: red is the strongest channel, clearly saturated, and well above green.
    red = (r >= mx - 1e-6) & (sat > 0.35) & (mx > 0.2) & (r > g * 1.35) & (a[..., 3] > 0)
    out = a.copy()
    ys, xs = np.nonzero(red)
    for y, x in zip(ys, xs):
        h, s, v = colorsys.rgb_to_hsv(*rgb[y, x])
        if 0.035 < h < 0.94:  # orange/brass: leave it
            continue
        out[y, x, :3] = colorsys.hsv_to_rgb(hue, min(1, s * s_k), min(1, v * v_k))
    return Image.fromarray((out * 255).round().astype(np.uint8))


def main():
    for part in PARTS:
        src = Image.open(SPRITES / f'{part}.png')
        for name, (hue, s_k, v_k) in LIVERIES.items():
            out = SPRITES / f'{part}-{name}.png'
            recolour(src, hue, s_k, v_k).save(out, optimize=True)
            print(out.relative_to(ROOT))


if __name__ == '__main__':
    main()
