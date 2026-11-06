# Art production progress

Source queue: ASSETS-TODO.md on train-game. Updated 2026-11-06.

## Resume here

Next ungenerated item: **Sandstorm strip**, followed by oasis, monkeys, marsh lights, toll barrier/keeper, mail sack, shipwreck, urchins and relief engine. Continue in ASSETS-TODO.md order. Do not generate more family/cart/tree variants unless a specific correction is requested.

## Batch 1: generated, not yet integrated

Eight transparent PNG source images were generated in the ChatGPT art-production conversation on 2026-11-06. All eight were verified as RGBA with genuine transparent pixels. They are displayed and saved with that conversation. **The PNGs have not been uploaded to this repository.** Do not mark the ASSETS-TODO.md checkboxes complete until the corresponding art is uploaded, sliced, scaled and reviewed in game.

| Todo entry | Generated source | Contents |
|---|---|---|
| Stranded family | exec-3619fd9b-756f-42ef-b265-cb48882d0a69.png | Family group, broken cart, luggage, detached wheel |
| Fallen tree: meadow | exec-6850715c-a9b3-4748-ab45-6e044e3f6ca6.png | Fallen oak |
| Fallen tree: jungle | exec-da680814-3bd3-43e4-aef7-f0d33478aeab.png | Rooted tropical trunk, vines, broad leaves |
| Fallen tree: marsh | exec-60347cc3-9cb2-4a56-a5a2-bd491a206350.png | Hollow willow, moss, fungi |
| Abandoned coal wagon | exec-c7906b71-4732-497a-aee4-bebb7798be4e.png | Wagon, separate siding/buffer, coal spill |
| Pedlar | exec-cdf0fa30-710c-40c5-8572-1195f59c001a.png | Cart, pedlar, separate sack and barrel |
| Snowdrift | exec-c0fdc89a-58dc-4fbb-9b9d-46253517153b.png | Low snowbank overlay |
| Hot spring | exec-d27d828f-2bd7-4672-b01d-07b383f5a623.png | Biome-neutral pool and two separate steam wisps |

## References actually inspected

- art/sheets/master-sheet.png: train, tender, buildings and original palette/texture.
- art/sheets/jungle-trees.png: tropical tree shapes, bark and foliage.
- art/sheets/marsh-props.png: marsh palette, willow/moss and decayed wood.

## Production constraints

Use image generation with actual transparent output. Inspect existing art before new asset categories/biomes. Match detailed 16-bit Victorian railway sprites, dark edges and clustered shading. Flat side elevation for line props, facing right where relevant. Loose modular pieces with clear gaps, no labels, no backgrounds. Source images are larger than runtime sprites; slice and scale consistently with the locomotive's roughly 250 by 130 px in-game dimensions. Keep generated work distinct from uploaded/integrated work.

## Integration review still needed

Check silhouettes and pixel density at runtime scale. Check the broken cart communicates its missing wheel. Check the coal load reads half-full and separate wagon components if required. Source-sheet presence alone is not completion. No game code changed in this batch.
