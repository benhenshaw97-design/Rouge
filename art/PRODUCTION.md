# Asset production

## Style and scale
Use the actual `assets/sprites/locomotive.png` and `assets/pois/town.png` as visual references.
Detailed earthy pixel art, dark outlines, textured wood and metal, muted charcoal/brown,
restrained warm brass highlights. Side elevation for line-side objects; face right where relevant.
No scenery behind isolated props. Real alpha, no painted checkerboard, floor shadows or haze.
Leave generous outer margins and at least 20 pixels between separate sheet pieces.

The locomotive displays at approximately 250 by 130 pixels. Event props currently fit within
330 by 175 pixels; flat obstacles fit within 230 by 62; props with people in them (pedlar,
stranded family, urchins, toll-keeper) stand on the near bank at about 125 px tall, so a person
is roughly half the engine's height. Check readability at these sizes, not just at generation
resolution. `prepare-event-art.py` shrinks runtime files to at most 660 × 350 (2x the largest
drawn size) and `compress-images.py` palettes them: always run both before committing, as raw
generator output is 1–2 MB per prop.

**Uploading is the step that makes art count.** Images that exist only in the ChatGPT
conversation can't be used. Put each approved source PNG in `art/sheets/`, add its manifest entry,
and push; Claude checks new branches, integrates what fits and updates ASSETS-TODO.md.

## Repeatable process
1. Select an unchecked item from ASSETS-TODO.md. Check existing sheets and stand-ins first.
2. Generate with the built-in image generator using the actual reference images, the item's
   brief, side-view constraint and real transparency. One prop per file where practical.
3. Inspect silhouette, scale, material colours, transparency, unwanted glow and clipped edges.
   Failed generations remain drafts and must not be marked complete.
4. Save a passing original in art/sheets with a descriptive `event-…-source.png` name.
5. Add its source and exact runtime output to art/event-art.json.
6. Run `python3 scripts/prepare-event-art.py`. This crops empty padding, preserves alpha and
   rejects missing transparency or solid artwork touching the source edge. It does not replace
   visual inspection or check style automatically.
7. Run `npm run check:assets` and inspect at the runtime size before ticking the to-do item.

`scripts/slice-events.py` skips stand-ins for approved entries and rebuilds those entries from
these sources. Re-slicing therefore preserves the replacements.

## Batch 1
- Stranded family: original plus runtime prop prepared.
- Pedlar: original plus runtime prop prepared; rejected lantern versions had unwanted haze.
- Fallen trees: first three-version sheet rejected for edge clipping; still unchecked.

Next: regenerate the meadow/jungle/marsh fallen trees separately with ample margins; then
abandoned coal wagon. Continue through section 1 before optional panel vignettes.

Generation used the built-in image tool. Briefs are recorded with each approved manifest entry.
