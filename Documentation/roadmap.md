# Roadmap

Estimates assume one developer and a modest implementation. Art creation may dominate the schedule.

## Phase 0 — Setup
- Initialize Vite/React/TypeScript.
- Establish CSS tokens and folder structure.
- Add test runner.
**Exit:** app builds and runs.

## Phase 1 — Coloring vertical slice
- Load one artwork.
- Render grid.
- Select palette color.
- Tap cells.
- Keep initial art touch-first at 16×16, or implement pan/zoom before adding denser grids.
- Undo/redo and erase.
**Exit:** coloring behavior is correct and responsive.

## Phase 2 — Persistence
- Add IndexedDB repository.
- Autosave and restore.
- Add save status.
**Exit:** refresh restores the same session.

## Phase 3 — Product UI
- Home, gallery, coloring studio.
- Progress state and reset confirmation.
- Responsive desktop/mobile layout.
**Exit:** user can navigate without losing work.

## Phase 4 — Cozy atmosphere
- Final visual identity.
- Music and optional ambience.
- Gentle animations and completion state.
**Exit:** complete sensory experience without distracting from coloring.

## Phase 5 — Content
- Produce 12–20 coherent artworks.
- Validate every asset.
- Test cell sizes on touch screens.
**Exit:** curated gallery feels complete.

## Phase 6 — Quality and deployment
- Unit/integration/browser tests.
- Optimize assets.
- Deploy static app.
- Verify real-device behavior.
**Exit:** stable, shareable gift.

## Later
- PWA/offline caching.
- Cloud saves and API.
- PostgreSQL and accounts only if required.
