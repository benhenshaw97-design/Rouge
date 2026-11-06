"""Package approved event sources without repainting or flattening their alpha.

Run: python3 scripts/prepare-event-art.py
The manifest is intentionally explicit: generated drafts must pass visual review before entry.
"""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
MAX_W, MAX_H = 660, 350  # 2x the largest drawn event prop


def prepare():
    manifest = json.loads((ROOT / 'art/event-art.json').read_text())
    for entry in manifest['approved']:
        source = ROOT / entry['source']
        image = Image.open(source).convert('RGBA')
        alpha = image.getchannel('A')
        if alpha.getextrema()[0] != 0:
            raise ValueError(f'{source}: no fully transparent pixels')
        # Ignore near-invisible generation noise when finding the crop, while preserving alpha.
        bounds = alpha.point(lambda a: 255 if a >= 128 else 0).getbbox()
        if not bounds:
            raise ValueError(f'{source}: empty sprite')
        x0, y0, x1, y1 = bounds
        if x0 == 0 or y0 == 0 or x1 == image.width or y1 == image.height:
            raise ValueError(f'{source}: solid artwork touches the canvas edge; review clipping')
        pad = 8
        crop = image.crop((max(0, x0-pad), max(0, y0-pad), min(image.width, x1+pad), min(image.height, y1+pad)))
        # Shrink to twice the largest size the game draws event props at (330 x 175), so it
        # stays sharp on high-density screens without shipping megabyte files to phones.
        k = min(1, MAX_W / crop.width, MAX_H / crop.height)
        if k < 1:
            crop = crop.resize((round(crop.width * k), round(crop.height * k)), Image.LANCZOS)
        output = ROOT / entry['output']
        output.parent.mkdir(parents=True, exist_ok=True)
        crop.save(output, optimize=True)
        print(f'{output.relative_to(ROOT)}: {crop.width}x{crop.height}, alpha preserved')


if __name__ == '__main__':
    prepare()
