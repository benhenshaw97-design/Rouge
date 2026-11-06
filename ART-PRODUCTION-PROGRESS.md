# Art production progress

Source queue: ASSETS-TODO.md on train-game. Updated 2026-11-06.

## Resume here

Next ungenerated artwork: **4. Story**, starting with the driver portrait (neutral, happy, worried), then fireman, station master, mysterious client and rival railway boss. Section 3's six objective icons, completion ribbon and four-frame steam leak, plus the missing section 2 Iron Badlands emblem, are uploaded on `codex/art-production-objectives-20261106`. Do not regenerate these. Section 3 sounds still need a separate audio workflow. Earlier sections 1 and 2 still have 24 generated PNGs awaiting upload; optional event-panel vignettes remain unmade. Earlier batches selected 26 sources; this run adds 9 selected sources and 13 prepared PNGs (22 committed PNG files).

## Batch 4: uploaded and verified, awaiting in-game integration

Repository: `benhenshaw97-design/Rouge`. Reviewed `train-game` at `c858e175e96cfbb3bb19d7b03e3f73d565318f50`, including the balance pass, liveries, route-map handoff and event-art integration commits. Compared the existing art-production branch, whose earlier family and pedlar assets were already merged. No game code or existing artwork was changed. All new files are on **`codex/art-production-objectives-20261106`**, not merged into Claude's branch.

| Asset | Source in `art/sheets/` | Prepared output | Verified asset commit |
|---|---|---|---|
| Iron Badlands emblem | `map-emblem-badlands-source.png` | `assets/ui/emblem-badlands.png`, 96×96 | `e193559c7f47efd2ca0272d078c053eac6792b23` |
| Passengers objective | `objective-passengers-source.png` | `assets/ui/objective-passengers.png`, 64×64 | `418810869c76c926d3470674a11e4187d2e19643` |
| Cargo objective | `objective-cargo-source.png` | `assets/ui/objective-cargo.png`, 64×64 | `418810869c76c926d3470674a11e4187d2e19643` |
| Distance objective | `objective-distance-source.png` | `assets/ui/objective-distance.png`, 64×64 | `418810869c76c926d3470674a11e4187d2e19643` |
| Money objective | `objective-money-source.png` | `assets/ui/objective-money.png`, 64×64 | `cf9f2505aa270833469f1ac57af0d73199086dd6` |
| Reach-area objective | `objective-reach-area-source.png` | `assets/ui/objective-reach-area.png`, 64×64 | `cf9f2505aa270833469f1ac57af0d73199086dd6` |
| Visit objective | `objective-visit-source.png` | `assets/ui/objective-visit.png`, 64×64 | `f53327c3eed835a56a343b3b2d8dcc9547214d3c` |
| Completion ribbon | `objective-complete-source.png` | `assets/ui/objective-complete.png`, 256×96 | `cf9f2505aa270833469f1ac57af0d73199086dd6` |
| Steam leak | `steam-leak-source.png` | `assets/fx/steam-leak.png`, 512×128; four separate 128×128 `steam-leak-0.png` through `steam-leak-3.png` | `cf9f2505aa270833469f1ac57af0d73199086dd6` |

Verification: fetched the uploaded branch and matched all 22 PNG blob hashes against local file bytes. Every PNG has genuine transparent pixels and visible artwork; the dissipating steam frame intentionally has no fully opaque pixels. Inspected six icons at 64×64 and 32×32 on a coloured background, the ribbon at 256×96, and all steam cells composited over dark green. Steam source uses a 2×2 layout; runtime sheet is left-to-right frames 0–3 with fixed 128×128 cells. Suggested starting timing: 120 ms/frame, one-shot puff; integration and motion timing still require game review. `npm run check:assets` passed. No `[x]` in-game completion claims were added.

Prompt set, references, dimensions and per-file blob hashes: `art/objectives-production-20261106.json`. Generation used the built-in image generator. Sources preserve original alpha; prepared files are scaled/sliced copies.

Upload/persistence failures and recovery:
- Initial shell push failed exactly: `fatal: could not read Username for 'https://github.com': No such device or address`. Local-only commit `c29c023` was not marked uploaded. Recovered using the connected GitHub Git-data uploader; verified replacement remote asset commit `e193559c7f47efd2ca0272d078c053eac6792b23`.
- First visit-icon attempt displayed artwork but produced no retrievable PNG or saved filename; it was not uploaded and is not counted. A single persistence-repair generation produced `exec-8be064b1-4b78-40c2-9308-576e94d5a4cc.png`, saved and verified in commit `f53327c3eed835a56a343b3b2d8dcc9547214d3c`. Use that committed source, not the unsaved display.

Remaining: integrate/review this batch without re-generation; recover/upload the earlier 24 generated files without marking them uploaded prematurely; produce section 3 audio through an audio workflow; continue section 4 story portraits. The historical "next" in `art/PRODUCTION.md` predates batches 1–3; use this file and ASSETS-TODO.md as the authoritative queue.

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

## Batch 3: route-map source artwork generated, not yet integrated

Nine additional PNGs on 2026-11-06 cover every entry in section 2. These remain source artwork saved with the ChatGPT conversation, **not uploaded to this repository**.

| Todo entry | Selected generated source | Contents |
|---|---|---|
| Map background | exec-3b973937-6faa-46a0-91e9-b1dbc3433335.png | 1672 by 941 parchment, blank centre, transparent outside edges |
| Coal depot badge | exec-3fd04af0-1ec4-41f9-9439-bcfa17410d27.png | Circular brass badge |
| Town badge | exec-50ec048f-2036-47ef-9db7-3ba2439efa0e.png | Circular station badge |
| Mine badge | exec-1e081edc-a21d-49f4-9bf4-f034d28de487.png | Circular mine entrance badge |
| Workshop badge | exec-652e3006-b158-45a7-9685-d2acbbd59c3c.png | Circular workshop/wrench badge |
| Water tower badge | exec-4416cd84-3a03-4927-ba1f-e3f01f9897bf.png | Circular tank/spout badge |
| Starting station and player marker | exec-75fe1a87-7d30-4887-a8e8-627746260607.png | Separate terminus badge and right-facing train marker |
| Seven area emblems | exec-919c3236-a583-4c85-8e7b-d892b70f4abd.png | 4 by 2 layout, last cell empty; top meadow/desert/snow/jungle, bottom marsh/coast/Brasswick |
| Map button | exec-29f68a23-96f4-4bf7-8598-b965a31bb3e2.png | Folded parchment map icon |

Verification: genuine alpha transparency confirmed in all nine. Five stop badges were composited over parchment colour and visually inspected at 96 and 32 px; silhouettes remain distinguishable, details are clearer at 96. Badge sizes/rims were matched by image reference. Source PNGs are not runtime-sized; crop/normalize to 96 by 96 during integration, retain clear margins. Area emblems and paired markers still need slicing and runtime scale review. Parchment is a single background, not a tile. No game code changed.

## References actually inspected

- art/sheets/master-sheet.png: train, tender, buildings and original palette/texture.
- art/sheets/jungle-trees.png: tropical tree shapes, bark and foliage.
- art/sheets/marsh-props.png: marsh palette, willow/moss and decayed wood.
- art/sheets/desert-props.png: desert ochre palette, palms/material style.
- art/sheets/coast-props.png: wrecked timber, crates and coastal rock style.
- art/sheets/snow-props.png: snow palette and icon motifs.
- art/sheets/town-kit.png: Brasswick brick, brass machinery and clock architecture.
- Batch 3 coal badge used as frame reference for the other round badges.

## Production constraints

Use image generation with actual transparent output. Inspect existing art before new asset categories/biomes. Match detailed 16-bit Victorian railway sprites, dark edges and clustered shading. Flat side elevation for line props, facing right where relevant. Loose modular pieces with clear gaps, no labels, no backgrounds. Source images are larger than runtime sprites; slice and scale consistently with the locomotive's roughly 250 by 130 px in-game dimensions. Keep generated work distinct from uploaded/integrated work.

## Integration review still needed

Check silhouettes and pixel density at runtime scale. Check the broken cart communicates its missing wheel. Check the coal load reads half-full and separate wagon components if required. Source-sheet presence alone is not completion. No game code changed in this batch.
