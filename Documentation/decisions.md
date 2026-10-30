# Architecture Decision Records

## ADR-001: React + TypeScript + Vite
**Status:** Accepted  
**Decision:** Use React + TypeScript + Vite for the browser-first UI.  
**Reason:** Familiar component model, TypeScript contracts, straightforward static deployment, and web-native integration.  
**Trade-off:** Requires a JS/TS frontend rather than reusing Flutter/Dart.

## ADR-002: Canvas 2D for the grid
**Status:** Accepted  
**Decision:** Render the coloring grid through HTML Canvas 2D.  
**Reason:** Direct control of cell rendering and pointer mapping without thousands of DOM elements.  
**Trade-off:** Canvas content is not inherently accessible; important controls must remain normal DOM elements.

## ADR-003: Local-first MVP
**Status:** Accepted  
**Decision:** Use IndexedDB for session persistence; no API/database in the first release.  
**Reason:** Single-recipient gift, fewer operational failure points, faster delivery.  
**Trade-off:** No automatic cloud sync or cross-device continuity.

## ADR-004: Redis excluded
**Status:** Accepted  
**Decision:** Do not include Redis in MVP.  
**Reason:** No demonstrated caching, queue, rate-limiting, or shared-session requirement.

## ADR-005: Grid-cell coloring
**Status:** Accepted  
**Decision:** Tap individual cells rather than region-fill or freehand.  
**Reason:** Clear scope and simple state model.  
**Trade-off:** High-resolution art may create cells too small for touch; test early.

## ADR-006: Original visual identity
**Status:** Accepted  
**Decision:** Use reference games for mood inspiration, not copied assets or exact UI.  
**Reason:** Originality, distinct identity, and respect for intellectual property.

## ADR-007: Static catalog and versioned artwork content
**Status:** Accepted  
**Decision:** Publish a `catalog.json` and give every artwork a schema version and content version. Saved sessions must match that content version.  
**Reason:** A static browser deployment cannot discover directories at runtime, and palette/mask changes can make old color indices mean something different.  
**Trade-off:** Artwork updates need an intentional migration or a compatibility break.

## Revisit triggers
- Add backend if cloud saves, multiple devices, or remote catalog management is required.
- Reconsider grid size/mechanic if mobile cells are too small.
- Revisit the 16×16 touch-first limit once pan/zoom behavior has passed real-device testing.
- Consider Phaser only if game-like scenes, animations, or mechanics become substantially more complex.
