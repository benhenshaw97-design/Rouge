# Art production progress

Source queue: ASSETS-TODO.md on train-game. Updated 2026-11-06.

## Resume here

Next ungenerated section: **2. Route map screen**, beginning with parchment/painted map background, then stop badges, start-station badge and train marker, area emblems, and map-button icon. All 15 primary line-event entries in section 1 now have generated source art (17 selected PNGs total, including the three tree versions). Optional panel vignettes have not been produced. Do not regenerate these line-event designs unless a specific correction is requested.

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

## Batch 2: generated, not yet integrated

Nine additional selected PNGs generated on 2026-11-06, in todo order. All were verified to have genuine alpha transparency and composited over a coloured background for visual review. These PNGs are saved with the art-production conversation, **not uploaded to this repository**. Keep original todo checkboxes unticked until integration is complete.

| Todo entry | Selected generated source | Contents |
|---|---|---|
| Sandstorm | exec-46478493-5ba1-491b-8b10-59963e3777a8.png | Red-sand scrolling overlay strip |
| Oasis | exec-5200bea4-bf0b-4428-b274-80aca15ab860.png | Pool flanked by two palms |
| Monkeys | exec-5eb56ed9-5cc2-41c9-ac18-5a4209c020dc.png | Four isolated poses, 2 by 2 layout |
| Marsh lights | exec-9600cdb0-7129-4e6c-affe-b4d343cace19.png | Four wisp animation frames |
| Toll barrier/keeper | exec-2b845294-6a5b-4471-8496-32d66085e114.png | Separate barrier, keeper and booth |
| Mail sack | exec-6836e50d-60c4-4c92-9fc7-0fb4051eab34.png | Single dropped mail sack |
| Shipwreck | exec-0a25a22b-9960-4388-9259-43e5d8a4e074.png | Wreck on rocks, crates, rock/driftwood piece |
| Coal-thief urchins | exec-f195ebc8-d7c1-427e-9869-d3cff831f15a.png | Three distinct children |
| Relief engine | exec-415c12e4-7a92-463d-989f-e96e21197af0.png | Separate body, underframe, wheel and connecting rod |

The earlier monkey file exec-09055af6-ef61-42c4-b696-c533893df929.png is superseded by the selected version above; do not treat it as another required asset. Brown halos visible in raw image previews are hidden RGB under alpha zero; the actual composited sprites have clean backgrounds.

Batch 2 integration checks: validate sandstorm repeat seam in motion before calling it seamless; normalize wisp cell alignment and test loop; scale people and engine consistently with existing sprites; test relief-engine body/underframe/wheel alignment. No game code changed.

## References actually inspected

- art/sheets/master-sheet.png: train, tender, buildings and original palette/texture.
- art/sheets/jungle-trees.png: tropical tree shapes, bark and foliage.
- art/sheets/marsh-props.png: marsh palette, willow/moss and decayed wood.
- art/sheets/desert-props.png: desert ochre palette, palms/material style.
- art/sheets/coast-props.png: wrecked timber, crates and coastal rock style.

## Production constraints

Use image generation with actual transparent output. Inspect existing art before new asset categories/biomes. Match detailed 16-bit Victorian railway sprites, dark edges and clustered shading. Flat side elevation for line props, facing right where relevant. Loose modular pieces with clear gaps, no labels, no backgrounds. Source images are larger than runtime sprites; slice and scale consistently with the locomotive's roughly 250 by 130 px in-game dimensions. Keep generated work distinct from uploaded/integrated work.

## Integration review still needed

Check silhouettes and pixel density at runtime scale. Check the broken cart communicates its missing wheel. Check the coal load reads half-full and separate wagon components if required. Source-sheet presence alone is not completion. No game code changed in this batch.
