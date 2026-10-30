# Full Detail Checklist

Use this as a working checklist. Items are grouped by delivery phase; not every P1/P2 item is required for the initial gift.

## A. Product and setup
- [ ] Confirm working product name and favicon.
- [ ] Create repository and initial README.
- [ ] Create React + TypeScript + Vite app.
- [ ] Configure TypeScript strict mode.
- [ ] Configure formatting/linting.
- [ ] Add environment-independent build.
- [ ] Add basic error boundary and not-found state.
- [ ] Add documentation folder and link docs from README.

## B. Design foundation
- [ ] Define design tokens for colors, spacing, radii, typography, shadows.
- [ ] Choose readable UI font and pixel font for accents only.
- [ ] Define responsive breakpoints.
- [ ] Define button, card, icon-button, modal, progress, and toast patterns.
- [ ] Establish focus, hover, active, disabled, and loading states.
- [ ] Verify text contrast and focus visibility.
- [ ] Ensure UI remains calm and not visually crowded.
- [ ] Create original logo/mascot assets or use licensed alternatives.

## C. Artwork pipeline
- [ ] Define target grid sizes (start at 16×16 for tap-first art; require pan/zoom for denser grids).
- [ ] Define palette-index convention and reserved uncolored index.
- [ ] Define colorable mask convention.
- [ ] Create artwork manifest schema.
- [ ] Create and validate the static artwork catalog; do not rely on runtime directory discovery.
- [ ] Add schema and content versions to each artwork manifest.
- [ ] Create first test artwork.
- [ ] Validate width × height against mask/color array lengths.
- [ ] Validate palette indices.
- [ ] Create gallery preview images.
- [ ] Check artwork remains legible when displayed at intended size.
- [ ] Check minimum tappable cell size on mobile.
- [ ] Keep MVP art touch-first at 16×16, or implement and test pan/zoom before publishing denser grids.
- [ ] Check all art is original or appropriately licensed.
- [ ] Create 12–20 cohesive starter artworks.
- [ ] Add an asset validation script before release.

## D. Coloring engine
- [ ] Implement flat grid indexing.
- [ ] Implement bounds checking.
- [ ] Implement mask validation.
- [ ] Implement color-cell command.
- [ ] Implement eraser/uncolor command.
- [ ] Implement undo stack.
- [ ] Implement redo stack.
- [ ] Clear redo stack after a new edit.
- [ ] Ignore no-op edits.
- [ ] Implement cell-level rendering.
- [ ] Implement full render after resize/context restore.
- [ ] Implement pointer-to-grid conversion.
- [ ] Support mouse and touch through Pointer Events.
- [ ] Handle pointer cancellation.
- [ ] Prevent unwanted page gestures over canvas where appropriate.
- [ ] Add optional grid lines or hover highlight.
- [ ] Calculate completion based only on colorable cells.
- [ ] Add tests for boundary coordinates and resizing.

## E. Coloring UI
- [ ] Build artwork header and exit/back action.
- [ ] Build canvas container with stable aspect ratio.
- [ ] Build palette selection component.
- [ ] Show selected color clearly.
- [ ] Add undo and redo buttons.
- [ ] Add eraser.
- [ ] Add reset with confirmation.
- [ ] Add save-status indicator.
- [ ] Add progress percentage.
- [ ] Add completion state/animation.
- [ ] Make controls usable on narrow screens.
- [ ] Ensure controls do not cover important parts of the canvas.
- [ ] Provide labels/tooltips for icon-only controls.

## F. Gallery and navigation
- [ ] Build cozy home screen.
- [ ] Build artwork gallery cards.
- [ ] Show artwork title and thumbnail.
- [ ] Show not-started/in-progress/completed status.
- [ ] Add Continue Coloring action.
- [ ] Add recently opened sorting if useful.
- [ ] Preserve audio playback across route changes.
- [ ] Handle missing or invalid artwork assets gracefully.

## G. Persistence
- [ ] Add IndexedDB wrapper/repository.
- [ ] Define schema version and upgrade strategy.
- [ ] Save session color data and timestamps.
- [ ] Debounce or batch writes.
- [ ] Serialize writes or version them to prevent stale overwrites.
- [ ] Use the stored revision as an optimistic-concurrency token when the same artwork is open in more than one tab.
- [ ] Snapshot the color buffer before each asynchronous write.
- [ ] Reject loaded/imported sessions with an incompatible artwork content version or altered fixed cells.
- [ ] Restore sessions on load.
- [ ] Handle IndexedDB unavailable/quota errors.
- [ ] Add migration/version compatibility check.
- [ ] Keep undo history in memory for MVP.
- [ ] Add export save file.
- [ ] Add import with schema validation.
- [ ] Test refresh and multiple quick edits; do not rely on a new IndexedDB write during tab close.

## H. Audio and atmosphere
- [ ] Choose original or properly licensed tracks.
- [ ] Track source and license in asset documentation.
- [ ] Build persistent audio player.
- [ ] Add play/pause.
- [ ] Add track selection.
- [ ] Add volume and mute.
- [ ] Persist volume and selected track.
- [ ] Start playback only after user gesture.
- [ ] Handle autoplay rejection and load errors.
- [ ] Avoid sudden volume changes.
- [ ] Keep ambience and music controls understandable.
- [ ] Respect reduced-motion preference for animations.

## I. Testing
- [ ] Unit tests for grid and coordinate functions.
- [ ] Unit tests for undo/redo.
- [ ] Unit tests for progress calculation.
- [ ] Unit tests for artwork validation.
- [ ] Integration test for load/color/save/restore.
- [ ] Browser test for canvas resize.
- [ ] Browser test for touch/pointer interaction.
- [ ] Browser test for audio controls.
- [ ] Test at narrow mobile width.
- [ ] Test keyboard navigation and focus.
- [ ] Test with browser zoom.
- [ ] Test missing/corrupt artwork data.
- [ ] Test storage errors.

## J. Release
- [ ] Run production build.
- [ ] Run all tests.
- [ ] Verify no console errors.
- [ ] Optimize image/audio sizes.
- [ ] Add title, description, favicon, and social preview if needed.
- [ ] Deploy over HTTPS.
- [ ] Test the deployed URL on a second device.
- [ ] Verify refresh works on app routes.
- [ ] Verify saved state persists on the same device/browser.
- [ ] Make a backup/export of the intended recipient's progress if needed.
- [ ] Add a small personal surprise after the first completed artwork.

## K. Future features — do not block MVP
- [ ] PWA install and offline cache.
- [ ] Cloud save API.
- [ ] PostgreSQL schema and migrations.
- [ ] Account/authentication.
- [ ] Multi-device sync/conflict resolution.
- [ ] Remote catalog and content management.
- [ ] Public sharing/export gallery.
