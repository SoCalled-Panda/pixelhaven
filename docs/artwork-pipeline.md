# Artwork Pipeline

This document defines the conventions every artwork asset follows, the manifest
schema, and how to author, generate and validate new artwork.

## 1. Grid sizes

- Current artwork is **128×128** — detailed, scene-based pixel art meant to be
  colored with the studio's pan/zoom (pinch, wheel zoom, move tool,
  right-drag pan, zoom buttons, keyboard zoom). The checklist required
  pan/zoom to be implemented and tested before publishing denser grids; it
  shipped with the 64×64 set (v2/v3), the cap was raised to 96 for the v4
  set (review round 2) and to **128 for the v5 set** (review round 3 asked
  for a further quality bump; see `src/engine/viewTransform.ts` + studio
  gestures).
- At a 320 CSS-pixel viewport the fit view clamps to the minimum cell size
  (8 px) and the move tool / pinch pan covers the rest, satisfying the PRD
  mobile rule.
- The allocation cap in manifest validation is now 128.
- **Set v6 (review feedback round 4):** quality polish pass on the same 12
  scenes. Gradients now render as **solid tone bands with a narrow (~30%)
  dithered transition** (`vGradient` / `hGradient` v6) instead of full-surface
  Bayer noise — the single biggest readability win. `radialGlow` falls off
  quadratically on an 8×8 matrix (no halo rings). New shared helpers:
  `cloudShape` (flat-bottom cumulus with dithered underside shade) and
  `palmTree` (curved tapered trunk, ring shading, six arcing fronds).
  Scene-level re-authoring: true Eiffel proportions (concave flaring legs,
  great arch, two platforms, slender spire, X-brace lattice), gondola hull
  with upturned prow/stern, balloon sphere shading (small specular + right
  shade band), structured neon halos that hug each sign edge, and all random
  speckle passes cut roughly in half. `contentVersion` bumped to **6** —
  v5 saves are retired via the incompatible-save dialog.
- **Set v6.5 "floating tree" (review feedback round 5):** new hero scene
  `floating-tree` in `scripts/scenes-d.mjs`, composed after the user's
  reference screenshot: oversized lobed canopy (4 green tones + near-black
  dapples + magenta accent leaves), S-curved magenta trunk with hanging root
  tendrils and caught boulders, faceted rock keel, chunky cyan crystals, two
  drifting side islands, flat-bottom clouds and falling leaves. The farm /
  animals from the reference are intentionally excluded. Registered first in
  the catalog; `contentVersion` unchanged so existing saves stay valid.
- **Set v5 (review feedback round 3):** same 12 world-tour subjects, fully
  re-composed at 128×128 with dithered gradients, soft dithered cast shadows,
  rim lighting, finer architectural detail
  (Eiffel lattice + arch, pagoda tiers, stone bridge), and richer decoration
  passes. The generator is now five modules:
  `scripts/art-lib.mjs` (raster DSL: shapes, Bresenham, quadratic curves,
  Bayer-4/8 dithering, gradients, radial glow, shadows, rim light, sparkles,
  seeded PRNG), `scripts/scenes-a.mjs` / `scenes-b.mjs` / `scenes-c.mjs` /
  `scenes-d.mjs` (scene batches with per-scene palettes, material groups and
  decorate passes) and `scripts/generate-artworks.mjs` (pipeline + emission).
- **Set v4 "world tour" (review round 2):** replaced the cozy-interior niche
  with 12 scenes across 12 subjects and 12 per-artwork palettes (rainy night
  cat, Eiffel dusk, tropical cove, Paris café, sakura temple, aurora fjord,
  lighthouse, Venice canal, desert oasis, greenhouse, hot-air balloons,
  Tokyo neon alley). Scenes paint SOLID material regions first, then two
  line-art passes (`outlineSilhouette`, `outlineRegions` with material
  groups) run, then a decorate pass adds dithered gradients, stars, rain,
  petals, glow and reflections that would otherwise get outlined into
  blobs. Material groups (e.g. the six shades of one sky) never outline
  against themselves, so gradients stay soft while objects keep crisp
  coloring-book contours.

## 2. Mask encoding

A mask is an array of `height` strings, each exactly `width` characters long.
Every character describes one grid cell:

| Char            | Meaning                                                        |
| --------------- | -------------------------------------------------------------- |
| `.`             | **Paper** — fixed cell painted with the artwork background     |
| `-`             | **Outline** — fixed cell painted with the outline color        |
| `1-9`, `a-z`    | **Colorable** — base-36 digit maps to palette index 1–35       |

Fixed cells (paper + outline) are pre-drawn and are never stored in sessions,
so saved/imported data structurally cannot alter them.

## 3. Palette-index convention

- `palette` is an array of `#rrggbb` strings (per-scene palettes, defined in
  the scene modules).
- **Index 0 is reserved and means "uncolored"** — the pale placeholder a
  colorable cell shows before it is painted. It must not be referenced by any
  mask digit (mask digit `1` → `palette[1]`, digit `v` → `palette[31]`).
- A palette may contain up to 37 entries (reserved index + 36 colorable
  colors); validation rejects masks referencing indices that don't exist.

## 4. Scene authoring

Scenes are **procedurally composed** in `scripts/scenes-{a,b,c,d}.mjs` with a
raster DSL over a 128×128 grid (`fillRect`, `fillCircle`, `fillEllipse`,
`fillTriangle`, `fillPolygon`, `quadCurve`, `vGradient`/`hGradient`,
`ditherShadow`, `rimLight`, `sparkle`, silhouette outlining, seeded scatter
for stars/petals/rain). This keeps every scene original, deterministic and
reviewable as code.

To add or change a scene:

1. Write/adjust a `sceneX(g)` function (see the thirteen existing ones) and,
   if needed, its `decorate(g, rand)` pass.
2. Register it in the batch's exported array with `id`, `title`, `palette`,
   `groups`, `paper`, `outline` and a `seed`.
3. Run `npm run generate:artworks` — masks, previews and the catalog are
   regenerated; orphan directories from removed artworks are deleted.
4. Run `npm run validate:assets` and `npm test`, then eyeball the scene in
   the gallery at card size and in the studio at fit/zoom (or render
   `scripts/preview-contact-sheet.py` for a single proof sheet).

## 5. Manifest schema

`public/artwork/<id>/manifest.json`:

```json
{
  "id": "rainy-night-cat",
  "title": "Rainy Night Cat",
  "schemaVersion": 1,
  "contentVersion": 6,
  "width": 128,
  "height": 128,
  "paperColor": "#f1ead8",
  "outlineColor": "#241f2e",
  "palette": ["#f1ead8", "#161d3a", "…"],
  "mask": [
    "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk",
    "…"
  ]
}
```

- `schemaVersion` — version of this manifest format. Bump when the loader logic
  changes in a breaking way.
- `contentVersion` — version of this artwork's *content*. Bump when the mask or
  palette changes; saved sessions whose `contentVersion` does not match are
  rejected (preserved, not applied) per the PRD data-safety rule.

## 6. Catalog

`public/artwork/catalog.json` is the single source of truth for the gallery.
There is **no runtime directory discovery** — the catalog is validated at build
time by `npm run validate:assets`.

```json
{
  "schemaVersion": 1,
  "artworks": [
    { "id": "rainy-night-cat", "title": "Rainy Night Cat", "manifest": "artwork/rainy-night-cat/manifest.json", "preview": "artwork/rainy-night-cat/preview.svg" }
  ]
}
```

## 7. Previews

Each artwork ships `preview.svg`, generated by `scripts/generate-artworks.mjs`
directly from the mask as **run-length encoded rects** (one rect per
horizontal run of identical cells — keeps the repo lean at 128×128). Gallery
cards render the SVG at card size; previews are guaranteed to stay in sync
with the masks.

## 8. Validation rules

`src/data/manifest.ts` (runtime) and `scripts/validate-assets.mjs` (release) enforce:

1. `schemaVersion === 1` and integer `contentVersion ≥ 1`.
2. `width`/`height` between 4 and 128 (allocation cap).
3. `mask` has exactly `height` rows, each exactly `width` chars.
4. Palette has 2–37 entries, every entry matches `#rrggbb`.
5. Every colorable mask digit resolves to a palette index that exists.
6. Every artwork has at least one colorable cell (the generator requires ≥ 16%
   of the grid so tiny/broken scenes can't ship).
7. `id` matches `[a-z0-9-]+`, and catalog entries point at existing files.
8. Preview files exist and reference the same artwork id folder.

## 9. Content versions & old saves

`contentVersion` currently sits at **5** for all artworks (v5 = the 128×128
dithered-gradient set). Saved sessions from the 96×96 v4 set, the v3/v2 sets
or the 16×16 v1 set fail the content-version / shape check and are *preserved,
not applied* — the studio offers a download of the old save plus an explicit
"start fresh" action (PRD data-safety rule; see `docs/architecture.md` §6).

## 10. Paint-by-numbers overlay

Every colorable cell carries a **designated palette index** (its mask digit).
The studio renderer paints a paint-by-numbers overlay on top of the board:

- Zoomed in (cell ≥ 18 CSS px): uncolored cells show their designated
  **number** in a muted ink; cells filled with the *wrong* color keep their
  number on top in high contrast so mistakes are easy to spot and fix.
- Zoomed out (cell ≥ 10 CSS px): numbers would be illegible, so a small
  **swatch dot** in the target color marks each cell instead.
- Palette swatches show the same numbers as badges, so canvas digits can be
  matched to a color at a glance (`src/components/PalettePicker.tsx`).

The overlay is derived from the mask at renderer construction
(`designatedByCell`) and never stored in sessions — restoring old saves
automatically shows numbers again.

## 12. Set v7 — the HD tier (review round 6)

Round 6 added a second, high-fidelity artwork tier alongside the classic set:

- **Board size: 256×256** (65,536 colorable cells; manifest allocation cap
  raised to 512×512 for headroom).
- **Palette: 100-200 paintable colors per artwork** (141-168 in the shipped
  set; the release validator enforces the range for `tier: 'hd'`).
- **Manifest schema 2 (`rle`)**: rows are run-length strings of 4-char
  tokens — 2 base-36 chars palette index + 2 base-36 chars run length
  (`01 04` = color 1 × 4 cells). Index 0 (paper) is not addressable, so
  every cell is colorable and there are no fixed `.`/`-` cells. The paper
  color is `palette[0]`, reserved for the uncolored appearance exactly like
  schema 1.

### Generation pipeline (`scripts/pbn-lib.mjs` + `scripts/hifi-scenes.mjs`)

1. **Rasterize** each scene into a 512×512 float-RGB canvas (2× supersample):
   multi-stop vertical gradients, quadratic radial glows, Bézier-derived
   polygon ridges/ribbons, layered silhouettes with atmospheric perspective.
2. **Downsample** 2×2 (box filter) — free edge anti-aliasing.
3. **Texture pass** — smooth value noise (2 octaves, deterministic seed)
   perturbs every pixel by ~±14 RGB units so quantized region borders come
   out organic/painterly instead of vector-straight.
4. **Median-cut quantization** to ~170 boxes (adaptive re-try at 1.5× k if
   region cleanup dropped below 100 used colors), nearest-color assignment
   with perceptual RGB weights (2/4/3).
5. **Region cleanup** — 4-connected regions smaller than 4 cells merge into
   their dominant neighbor; unused palette entries are compacted away.
6. **Palette ordering** — final colors sort by luminance so the palette bar
   reads as a smooth ramp.
7. **Encode** RLE rows + RLE-run preview SVG (3 px scale) + catalog entry
   (`tier: 'hd'`, listed first).

Classic scenes (schema 1, 128×128, ≤34 colors, contentVersion 6) are
untouched and stay valid; HD boards carry **contentVersion 7**. The
generator cleans orphan directories against the combined scene registry.

## 13. Set v8 — the HD-only gallery (review round 7)

Round 7 retired the classic tier entirely and rebuilt its four favorites at
HD fidelity:

- **Converted to HD (same IDs, contentVersion 6 → 7)**: `floating-tree`
  (the hero, still first in the gallery), `turquoise-cove`,
  `sakura-temple`, `aurora-fjord` — new painters in `scripts/hifi-scenes.mjs`
  re-create the classic compositions (floating island with hanging roots and
  a waterfall drip; palm cove with striped umbrella, towel and beach ball;
  pagoda with torii gate, stone path and blossom clusters; aurora ribbons
  over fjord water with snow-capped peaks and a lit cabin). Old 128² saves
  exit through the standard "picture was updated" incompatible-save flow.
- **Removed**: the nine remaining classic scenes and their generator DSL
  (`art-lib.mjs`, `scenes-a..d.mjs` deleted). The generator's orphan sweep
  deletes their artwork directories; the catalog ships 12 HD entries only.
- **Aurora ribbons, take two**: the fjord bands reuse the round-6
  solid-slice technique with a sine width envelope so the ribbons taper at
  both ends instead of stopping mid-sky.
- **Engine fix shipped with the set**: `ColoringEngine.applyTool` passed an
  ORDINAL into `fillRegion(cellIndex)`, which re-resolves its argument as a
  grid cell — invisible while every fixture was fully colorable
  (ordinal == cell) but breaking fills on any artwork with fixed cells.
  See checklist §R for the regression test.

## 14. User photo import — the pipeline comes to the browser (review round 8)

The generator pipeline no longer only runs offline in Node: `src/lib/photoPbn.ts`
is a browser port of the pure-math core of `scripts/pbn-lib.mjs` (median cut,
region labeling/cleanup, luminance sort, RLE encoding, value noise), so a user
photo can become a paint-by-number board on the spot:

1. **Rasterize** — the picked file is decoded EXIF-aware
   (`createImageBitmap … 'from-image'` with an `<img>` fallback), center-cropped
   to a square (cover fit) and drawn at 2× supersample: 512² for the 256² board.
2. **Texture** — a light value-noise pass (amount 8, vs 14 for scenes) gives
   region borders a painterly wobble. The noise seed is a content hash of the
   rasterized pixels, so the same photo always converts to the same board.
3. **Quantize** — median cut to 150 boxes (retry ladder raises k when region
   cleanup drops below 60 colors), nearest-center assignment, small-region
   merge (min 4 cells), compaction, luminance-sorted palette → ≤200 colors.
4. **Derive the paper** — palette index 0 is the uncolored-cell color, so it
   must contrast with the page background the way every built-in scene's paper
   does. The paper is the photo's average palette color, desaturated 45% and
   scaled to a mid tone — bright photos land on a muted taupe, night photos on
   a charcoal, both clearly visible.
5. **Encode & verify** — RLE rows (schema 2), then the manifest is run through
   the production `validateManifest` before anything is stored; a board that
   would not open in the coloring page can never be saved.
6. **Store** — `custom-artworks` IndexedDB store (DB v2, same database file as
   sessions; both repositories open their own connection). The record carries
   the inline manifest, a PNG data-URL preview of the finished target (rendered
   at 2 px/cell) and a ≤256 px JPEG thumbnail of the source photo — roughly
   150 KB per import.

The DOM-touching helpers (`rasterizeToSquare`, `loadImageSource`,
`renderPreviewDataUrl`, …) are thin wrappers; the pure core
(`buildPhotoGrid`, `quantizeCanvas`, `mergeSmallRegions`, `rleEncodeRows`,
`derivePaper`, `hashCanvas`) is unit-tested without a DOM. Conversion runs on
the main thread but yields to the UI between stages, so the wizard's spinner
stays live; a typical photo converts in well under a second.

`PhotoImport.tsx` owns the wizard (pick → convert → review with a side-by-side
compare and a name field → save → navigate), `HomePage` merges the store's
records into the gallery with a YOURS badge + confirm-before-delete (which also
removes the artwork's session), and `ColoringPage` resolves `custom-*` ids from
the store before touching the static catalog. Save files for custom boards
remain portable as snapshots; the manifest itself lives in the browser that
made it.
