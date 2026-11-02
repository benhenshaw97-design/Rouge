"""Shrinks every PNG in assets/ to a 256-colour palette (pixel art survives this fine, and
files get ~4-5x smaller, which matters on phones). Run after slice-art.py / slice-areas.py:

    python3 scripts/compress-images.py
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent / 'assets'
before = after = 0
for path in sorted(ROOT.rglob('*.png')):
    im = Image.open(path)
    if im.mode == 'P':
        continue  # already done
    size = path.stat().st_size
    q = im.convert('RGBA').quantize(256, method=Image.Quantize.FASTOCTREE)
    q.save(path, optimize=True)
    before += size
    after += path.stat().st_size
print(f'{before / 1e6:.1f} MB -> {after / 1e6:.1f} MB')
