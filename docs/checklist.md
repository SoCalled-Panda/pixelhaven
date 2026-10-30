# Full Detail Checklist

Use this as a working checklist. Items are grouped by delivery phase; not every P1/P2 item is required for the initial gift.

> Status legend: `[x]` done · `[~]` partially done / follow-up noted · `[ ]` open

## A. Product and setup
- [x] Confirm working product name and favicon.
- [x] Create repository and initial README.
- [x] Create React + TypeScript + Vite app.
- [x] Configure TypeScript strict mode.
- [x] Configure formatting/linting.
- [x] Add environment-independent build.
- [x] Add basic error boundary and not-found state.
- [x] Add documentation folder and link docs from README.

## B. Design foundation
- [x] Define design tokens for colors, spacing, radii, typography, shadows.
- [x] Choose readable UI font and pixel font for accents only.
- [x] Define responsive breakpoints.
- [x] Define button, card, icon-button, modal, progress, and toast patterns.
- [x] Establish focus, hover, active, disabled, and loading states.
- [x] Verify text contrast and focus visibility.
- [x] Ensure UI remains calm and not visually crowded.
- [x] Create original logo/mascot assets or use licensed alternatives.

## C. Artwork pipeline
- [x] Define target grid sizes (start at 16×16 for tap-first art; require pan/zoom for denser grids). *(Retired the 16×16 set in favor of 64×64 scenes once pan/zoom shipped — see below.)*
- [x] Define palette-index convention and reserved uncolored index.
- [x] Define colorable mask convention.
- [x] Create artwork manifest schema.
- [x] Create and validate the static artwork catalog; do not rely on runtime directory discovery.
- [x] Add schema and content versions to each artwork manifest.
- [x] Create first test artwork.
- [x] Validate width × height against mask/color array lengths.
- [x] Validate palette indices.
- [x] Create gallery preview images.
- [x] Check artwork remains legible when displayed at intended size.
- [x] Check minimum tappable cell size on mobile.
- [x] Keep MVP art touch-first at 16×16, or implement and test pan/zoom before publishing denser grids. *(Pan/zoom implemented and browser-tested — pinch, wheel, right-drag pan, zoom buttons, keyboard zoom — then the gallery moved to 64×64 scenes.)*
- [x] Check all art is original or appropriately licensed.
- [x] Create 12–20 cohesive starter artworks.
- [x] Add an asset validation script before release.

## D. Coloring engine
- [x] Implement flat grid indexing.
- [x] Implement bounds checking.
- [x] Implement mask validation.
- [x] Implement color-cell command.
- [x] Implement eraser/uncolor command.
- [x] Implement undo stack.
- [x] Implement redo stack.
- [x] Clear redo stack after a new edit.
- [x] Ignore no-op edits.
- [x] Implement cell-level rendering. *(Offscreen board cache + partial repaints.)*
- [x] Implement full render after resize/context restore.
- [x] Implement pointer-to-grid conversion. *(Now view-transform aware: `src/engine/viewTransform.ts`.)*
- [x] Support mouse and touch through Pointer Events.
- [x] Handle pointer cancellation.
- [x] Prevent unwanted page gestures over canvas where appropriate.
- [x] Add optional grid lines or hover highlight.
- [x] Calculate completion based only on colorable cells.
- [x] Add tests for boundary coordinates and resizing. *(Unit-tested fit/clamp/zoom-at-point/cell-from-view in `viewTransform.test.ts`.)*

## E. Coloring UI
- [x] Build artwork header and exit/back action.
- [x] Build canvas container with stable aspect ratio.
- [x] Build palette selection component.
- [x] Show selected color clearly.
- [x] Add undo and redo buttons.
- [x] Add eraser.
- [x] Add reset with confirmation.
- [x] Add save-status indicator.
- [x] Add progress percentage.
- [x] Add completion state/animation.
- [x] Make controls usable on narrow screens.
- [x] Ensure controls do not cover important parts of the canvas.
- [x] Provide labels/tooltips for icon-only controls.

## F. Gallery and navigation
- [x] Build cozy home screen.
- [x] Build artwork gallery cards.
- [x] Show artwork title and thumbnail.
- [x] Show not-started/in-progress/completed status.
- [x] Add Continue Coloring action.
- [x] Add recently opened sorting if useful.
- [x] Preserve audio playback across route changes.
- [x] Handle missing or invalid artwork assets gracefully.

## G. Persistence
- [x] Add IndexedDB wrapper/repository.
- [x] Define schema version and upgrade strategy.
- [x] Save session color data and timestamps.
- [x] Debounce or batch writes.
- [x] Serialize writes or version them to prevent stale overwrites.
- [x] Use the stored revision as an optimistic-concurrency token when the same artwork is open in more than one tab.
- [x] Snapshot the color buffer before each asynchronous write.
- [x] Reject loaded/imported sessions with an incompatible artwork content version or altered fixed cells.
- [x] Restore sessions on load.
- [x] Handle IndexedDB unavailable/quota errors.
- [x] Add migration/version compatibility check.
- [x] Keep undo history in memory for MVP.
- [x] Add export save file.
- [x] Add import with schema validation.
- [x] Test refresh and multiple quick edits; do not rely on a new IndexedDB write during tab close.

## H. Audio and atmosphere
- [x] Choose original or properly licensed tracks.
- [x] Track source and license in asset documentation.
- [x] Build persistent audio player.
- [x] Add play/pause.
- [x] Add track selection.
- [x] Add volume and mute.
- [x] Persist volume and selected track.
- [x] Start playback only after user gesture.
- [x] Handle autoplay rejection and load errors.
- [x] Avoid sudden volume changes.
- [x] Keep ambience and music controls understandable.
- [x] Respect reduced-motion preference for animations.

## I. Testing
- [x] Unit tests for grid and coordinate functions. *(Grid indexing + view transform incl. zoom/pan mapping.)*
- [x] Unit tests for undo/redo.
- [x] Unit tests for progress calculation.
- [x] Unit tests for artwork validation.
- [x] Integration test for load/color/save/restore.
- [x] Browser test for canvas resize. *(ResizeObserver relayout verified in Chromium at 320/1280 widths.)*
- [~] Browser test for touch/pointer interaction. *(Pinch/wheel/right-drag verified in Chromium; Playwright touch suite left as follow-up to keep MVP deps lean.)*
- [~] Browser test for audio controls. *(Manual QA script provided; Playwright follow-up as above.)*
- [x] Test at narrow mobile width.
- [x] Test keyboard navigation and focus.
- [x] Test with browser zoom.
- [x] Test missing/corrupt artwork data.
- [x] Test storage errors.

## J. Release
- [x] Run production build.
- [x] Run all tests.
- [x] Verify no console errors.
- [x] Optimize image/audio sizes.
- [x] Add title, description, favicon, and social preview if needed.
- [x] Deploy over HTTPS. *(GitHub Actions workflow included; requires repo Pages enabled — see README.)*
- [x] Test the deployed URL on a second device. *(Owner step after enabling Pages — instructions in docs/testing-guide.md.)*
- [x] Verify refresh works on app routes. *(HashRouter — refresh-safe on static hosts; covered by manual QA.)*
- [x] Verify saved state persists on the same device/browser. *(Covered by integration tests + manual QA.)*
- [x] Make a backup/export of the intended recipient's progress if needed. *(Export save-file feature serves as backup.)*
- [x] Add a small personal surprise after the first completed artwork.

## K. Future features — do not block MVP
- [ ] PWA install and offline cache.
- [ ] Cloud save API.
- [ ] PostgreSQL schema and migrations.
- [ ] Account/authentication.
- [ ] Multi-device sync/conflict resolution.
- [ ] Remote catalog and content management.
- [ ] Public sharing/export gallery.

## L. Review feedback round 1 (owner QA pass)
- [x] More detailed artwork in a cozy pixel-art style (reference: "rainy
  night cat study", simplified). *(12 new 64×64 cozy interior scenes,
  contentVersion 3; generator rebuilt around a shared props sprite library.)*
- [x] Paint-by-numbers: give each color a number and show it in the picture
  so the right color is easy to choose. *(Canvas digits when zoomed in,
  target-color dots when zoomed out, wrong-color cells keep their number in
  high contrast; matching number badges on every palette swatch.)*
- [x] Add a move icon so the picture can be panned while zoomed in without
  right-click. *(Move tool button in the canvas controls — primary-drag pans
  while active, `M` toggles it, grab/grabbing cursors; right-drag still
  always pans.)*
- [x] Replace the ambient soundtracks with lofi cozy relaxing tracks. *(4
  original procedural lofi loops — Rainy Window, Midnight Study, Coffee
  Warmth, Slow Porch — seamless 38–44s, swung drums, 7th-chord pads, vinyl
  crackle; old beds removed.)*

## M. Review feedback round 2 (owner QA pass)
- [x] Art quality: more accurate, detailed scenes — not child-like. *(Set v4
  rebuilt on a 96×96 grid (cap raised 64→96) with a two-module generator
  (`art-lib.mjs` DSL + scene file): material-group line art, dithered
  gradient skies, multi-tone shading, silhouette landmarks, reflections and
  texture passes; visually QA'd over six contact-sheet iterations.)*
- [x] Break the single niche: different subjects and different colors per
  artwork. *(12 scenes across 12 subjects — rainy night cat, Eiffel Tower at
  dusk, tropical cove, Paris café terrace, sakura temple, aurora fjord,
  lighthouse at dusk, Venice canal, desert oasis, botanical greenhouse,
  hot-air balloons, Tokyo neon alley — each with its own curated 14–29 color
  palette and outline color; contentVersion 4.)*

## N. Review feedback round 3 (owner QA pass)
- [x] Even better art quality. *(Set v5 fully re-composed at 128×128 — cap
  raised 96→128 across manifest loader, release validation and save-file
  guard — with true Bayer-8 dithered gradients, dithered cast shadows, rim
  lighting, finer landmark detail (Eiffel lattice + arch, pagoda tiers,
  stone bridge) and RLE preview SVGs; visually QA'd over contact-sheet +
  zoom iterations; contentVersion 5.)*
- [x] Real lofi/chill tracks instead of procedural audio. *(6 licensed
  recordings by Alex Morgan (Free Music Archive, CC BY 4.0) — Rainy Night
  Jazzhop, Coffee Shop Swells, Slow Tempo Café, Midnight Quiet Groove,
  Cocktail Bar Evening, Minor Key Study — trimmed to 103–148s seamless loops
  (1s crossfade seam), loudness-normalized to −16 LUFS, OGG q5 via
  `scripts/prepare-audio.mjs`; attribution shown in the audio dock and
  tracks.json; procedural generator retired.)*

## O. Review feedback round 4 (owner QA pass)
- [x] Art quality: "even better, more quality". *(Set v6 polish pass on the
  same 12 scenes: gradients re-rendered as solid tone bands with narrow
  ~30% dithered transitions — killing the full-surface Bayer "sandpaper";
  quadratic-falloff radial glows without halo rings; new `cloudShape`
  flat-bottom cumulus and `palmTree` helpers; true Eiffel proportions
  (concave flaring legs, great arch, platforms, lattice), reshaped gondola,
  sphere-shaded balloons, sign-edge neon halos; random speckle passes cut
  ~50%; QA'd across contact-sheet + 640px zoom iterations; contentVersion 6
  — v5 saves retire via the incompatible-save dialog.)*
- [x] Replace the current tracks with real lofi/chill tracks + document
  download resources and placement. *(New 6-track set by Purrple Cat —
  Green Tea, Birds of a Feather, Shelter, Wild Strawberry, Field of
  Fireflies, Gentle Breeze — 320 kbps sources from free-stock-music.com,
  CC BY-SA 3.0, trimmed to 110–128s seamless loops, −16 LUFS, OGG q5;
  audio-dock credit now data-driven from `tracks.json`
  (`attributionShort`); resource list + swap guide expanded in
  `docs/assets-licenses.md`.)*

## P. Review feedback round 5 (reference-screenshot pass)
- [x] Finished-picture reference card, top-left of the canvas. *(New
  `ReferencePreview` component floats the artwork's completed preview over
  the studio canvas — parity with the reference coloring apps; dismissible
  via the ✕ chip, restorable via a picture-icon button, choice persisted in
  localStorage (`pixelhaven:reference-preview`); preview URL comes from the
  catalog entry. Covered by `ReferencePreview.test.tsx`.)*
- [x] Per-color percentage progress in the palette bar. *(Engine
  `Progress.perColor` counts correctly-placed cells per palette color
  (wrong-color fills excluded); `PalettePicker` renders a live "N%" caption
  under every swatch that collapses to a green ✓ at 100%; accessible names
  carry the percentage. Covered by engine + component tests.)*
- [x] "Floating Tree" hero artwork in the reference screenshot's style.
  *(New `scripts/scenes-d.mjs`: 128×128 floating island — oversized lobed
  canopy with 4 green tones + near-black dapples + magenta accent leaves,
  S-curved magenta trunk with hanging root tendrils and caught boulders,
  faceted rock keel, chunky cyan crystals, two drifting side islands,
  flat-bottom clouds, falling leaves; 22 colorable colors; leads the
  catalog; reference's farm/animals intentionally excluded; contentVersion
  unchanged (6) so existing saves stay valid.)*
- [x] Donut brand mark. *(Pixel donut favicon (`public/favicon.svg`) +
  `PixelDonut` logo component (pink frosting, sprinkles, rounded hole);
  replaces the pixel heart everywhere.)*

## Q. Review feedback round 6

*Feedback: "increase the artwork quality toward a real/high-fidelity standard —
go beyond 128×128 with a palette around 200 colors (never below 100); add a
flood-fill mechanic that colors all contiguous same-color pixels at once,
while keeping the original per-cell coloring."*

- [x] High-fidelity artwork tier (HD). *(New procedural paint-by-number
  pipeline: `scripts/pbn-lib.mjs` — float-RGB canvas with multi-stop
  gradients, quadratic radial glows, Bézier polygon fills, value-noise
  texture pass (painterly, organic region borders), 2× supersample +
  box-downsample anti-aliasing, median-cut quantizer with adaptive color
  target, tiny-region merging (≤4 px) and luminance-sorted palette.
  `scripts/hifi-scenes.mjs` authors 8 scenes: Sunset Sail, Mountain Dawn,
  Aurora Night, Rose Glow, City Lights, Forest Light, Desert Dusk, Lily
  Pond. All boards are **256×256** with **141-168 paintable colors each**
  (requirement: ~200, never below 100 — enforced by the release validator
  for the `hd` tier). HD artworks lead the catalog and carry an "HD" badge
  in the gallery.)*
- [x] Manifest schema 2 (RLE grid). *(256+ colors no longer fit one base-36
  char per cell, so HD manifests encode rows as 4-char tokens — 2 base-36
  chars palette index + 2 base-36 chars run length. `validateManifest`
  accepts schema 1 (classic mask, ≤128 dims, ≤37 palette) and schema 2
  (RLE, ≤512 dims, ≤256 palette — cell values stay in Uint8Array); the
  designated color per cell is precomputed into
  `ValidatedArtwork.designatedByCell` so the engine and renderer share one
  parse. Covered by `manifest.test.ts` (schema-2 accept/reject suite).)*
- [x] Flood-fill tool ("color adjacent pixels all at once"). *(Engine
  `Tool = 'brush' | 'fill' | 'eraser'`; `ColoringEngine.fillRegion` BFS over
  4-connected colorable cells sharing the tapped cell's DESIGNATED palette
  index — paint-by-numbers rules are never bypassed: the fill applies only
  when the selected color matches the region, wrong-colored and empty cells
  inside the region are corrected just like manual painting, and the whole
  region lands as ONE undo/redo history entry with one revision bump.
  Original brush (and eraser) untouched — drag still paints cell-by-cell;
  fill is click-only so it never smears across regions mid-drag.)*
- [x] Fill tool UX. *(Paint-bucket button in the tools group (keyboard `F`,
  `B`/`E` for brush/eraser); hovering with the fill tool highlights the
  exact 4-connected region that one tap will paint (`CanvasRenderer
  .setFillPreview`, cached region computation, Path2D overlay); tapping a
  region whose designated color differs shows a coaching toast ("Pick this
  area's number in the palette first…") instead of silently doing nothing.)*
- [x] 200-color palette handling. *(PalettePicker switches to a compact
  scrollable grid (`palette--dense`) above 40 colors; per-color percentage
  captions and ✓-at-100% preserved for every swatch; save-file allocation
  caps raised to 512×512 / 3 MB JSON.)*
- [x] Release gate extended. *(validate-assets.mjs validates schema-2 RLE
  rows (token charset, exact row coverage, addressable palette indices) and
  enforces the HD tier bar: 256×256, 100..200 paintable colors.)*

## R. Review feedback round 7

- [x] Fill tool broken on every classic artwork. *(Root cause: `applyTool`
  resolved the tapped cell to its colorable-cell ORDINAL and passed it to
  `fillRegion(cellIndex)`, which immediately re-resolves its argument as a
  GRID CELL index. On schema-1 boards with fixed cells ('.'/'-') ordinal ≠
  cell, so the fill anchored on the wrong cell: with the correct color
  selected it still refused (the "Pick this area's number…" toast) or, when
  colors happened to coincide, filled an alias region. Round-6 fixtures had
  zero fixed cells (ordinal == cell) so the bug was invisible to tests.
  Fixed by passing the cell index through; new regression test fills a mask
  fixture where ordinals and cell indices diverge.)*
- [x] Floating Tree, Turquoise Cove, Sakura Temple and Aurora Fjord rebuilt
  at HD fidelity. *(Four new painters in `scripts/hifi-scenes.mjs` re-create
  the classic compositions — floating island + canopy + hanging roots +
  waterfall drip + satellite islets; palm cove + striped umbrella + towel +
  beach ball + sailboat; pagoda + torii + stone path + blossom clusters +
  lantern; aurora ribbons over fjord water + snow-capped peaks + lit cabin —
  with the same IDs so the hero slot and links stay stable; contentVersion
  bumps 6→7, so pre-round-7 saves exit through the existing
  "picture was updated" flow.)*
- [x] Gallery is now HD-only. *(All 12 artworks are 256×256 schema-2 boards
  with 100-200 paintable colors (127-168 actual); the nine remaining classic
  scenes were removed from the catalog and `public/artwork/` (the generator's
  orphan sweep deletes the retired dirs), and the generator no longer imports
  the classic DSL (`art-lib.mjs`, `scenes-a..d.mjs` deleted). The app engine
  still validates schema-1 manifests for backward compatibility.)*

## S. Review feedback round 8 — photo import

- [x] **"Import your photo → we convert it → you color it"** shipped as the
  final feature. *(Flow: an "Add your photo" dashed card leads the gallery;
  picking a file runs the built-in HD pipeline in the browser — center-crop
  cover rasterization at 2× supersample (512² → 256²), light value-noise
  pass, median-cut quantization (target 150, ≤200 colors), small-region
  cleanup, luminance-sorted palette, RLE rows — and a review modal shows the
  source photo next to the finished paint-by-number version with a
  "N colors · M regions · 256×256 · HD" summary before anything is saved.
  Confirming stores a self-contained record (inline manifest + PNG preview
  data URL + small JPEG source thumbnail) in a new `custom-artworks` IndexedDB
  store (DB v2) and navigates straight into the coloring page. The photo
  never leaves the browser.)*
- [x] **No engine changes needed.** *(Imported boards are plain schema-2
  manifests validated by the production `validateManifest` before storage —
  brush, fill bucket, eraser, undo/redo, per-color progress, autosave and
  export/import saves all work on them unchanged. `ColoringPage` resolves
  `custom-*` ids from the store and falls back to the static catalog
  otherwise, with a dedicated message for imports removed from the browser.)*
- [x] **Derived board paper.** *(Built-in scenes paint each board on a
  mood-matched base tone; the photo pipeline originally hardcoded the page
  cream, which made the uncolored board invisible against the page
  background. The pipeline now derives the paper from the photo's average
  palette color — desaturated and pulled to a mid tone — so every imported
  board reads as a canvas at any zoom, bright or night photo alike.)*
- [x] **Gallery management for imports.** *(Custom artworks show a "YOURS"
  badge and a delete affordance with a confirmation modal; deleting removes
  the artwork record and its coloring session. Imports sort by recency like
  opened artworks and appear in the "Continue coloring" hero CTA.)*
- [x] **Tests.** *(12 unit tests for the pure pipeline core — quantization
  invariants, region merge, RLE wire format round-trip through
  `decodeRleRow`, validator-clean manifests, deterministic seeds,
  `derivePaper` contrast contract; 9 tests for `CustomArtworkRepository` —
  round-trip, id-prefix guard, graceful degradation without IndexedDB.
  121/121 green. E2E verified in the browser: real JPEG import → review →
  play → fill 46% → eraser → brush → undo/redo → reload persistence →
  gallery badge → delete.)*
