# Architecture

## 1. Overview
The MVP is a static, local-first single-page application. React renders the interface; a framework-independent coloring engine owns the grid and canvas operations; IndexedDB stores sessions. Artwork and audio are static assets.

```text
Browser
├── React UI
│   ├── Home / Gallery
│   ├── Coloring Studio
│   └── Persistent Audio Player
├── Coloring Engine (TypeScript)
│   ├── Grid model
│   ├── Pointer coordinate mapper
│   ├── Canvas renderer
│   ├── Command history
│   └── Progress calculator
├── Repositories
│   ├── Artwork manifest loader
│   └── IndexedDB session repository
└── Static assets
    ├── Artwork manifests / masks / previews
    └── Audio tracks

Future:
Browser → ASP.NET Core API → PostgreSQL
                         └→ Object storage/CDN
```

## 2. Boundaries
- **React components:** UI and user-facing state; do not implement grid math in JSX.
- **Engine:** pure state transitions and rendering helpers; should not depend on React.
- **Artwork loader:** fetches `catalog.json`, then validates immutable asset definitions named by the catalog.
- **Repository:** stores and retrieves session data; UI does not directly use IndexedDB.
- **Audio service/hook:** owns audio element lifecycle so route changes do not restart playback.
- **Future API:** cloud persistence only; it should not be in the critical path for each coloring tap.

## 3. Core data flow
1. Gallery loads the static artwork catalog.
2. User selects a published artwork from that catalog.
3. App loads and validates its manifest, mask, palette, and initial state.
4. Repository loads a compatible saved session, or engine initializes a new one.
5. User selects palette color.
6. Pointer coordinate maps to grid cell.
7. Engine validates cell and commits a command.
8. Renderer updates the affected cell.
9. Session is marked dirty and a revisioned snapshot is queued for persistence.
10. Gallery progress is derived from saved session state.

## 4. State ownership
- Engine state: grid colors, selected color/tool, undo/redo history, and a monotonic in-memory revision.
- React state: screen, modal state, visible controls, save status.
- IndexedDB: durable coloring sessions and optional preferences.
- localStorage: small preferences only, such as volume and selected track.
- Static assets: artwork definitions, palette definitions, audio files.

Avoid duplicating the full cell grid in React state on every pointer event. Keep the mutable engine instance stable and expose only UI values that React needs. The engine reports a state change; application code, not the engine, schedules persistence.

## 5. Rendering
Use Canvas 2D. Render the base artwork/grid at a known logical resolution, then scale to the display size. Account for device pixel ratio for sharp rendering, while keeping logical cell coordinates independent of CSS dimensions. Disable image smoothing for pixel-art scaling when appropriate.

Use partial redraws for individual cell changes and full redraw on resize, asset load, palette change affecting many cells, or context restoration.

## 6. Error handling
- Invalid manifest: show an artwork-unavailable state and log a useful development error.
- Failed save: retain in-memory state and show a non-intrusive warning.
- Audio failure: keep controls usable and explain that playback could not start.
- Invalid import: reject without modifying existing progress.
- Missing artwork asset: do not crash the entire gallery.
- Incompatible artwork content version: preserve the old local record, do not apply it, and offer a clear restart/remove option.

## 7. Security and privacy
The MVP has no server-side user data. Avoid collecting personal information. Validate imported save files and cap their dimensions/size before allocating arrays. If a backend is introduced, validate all payloads server-side and use HTTPS.

## 8. Future cloud architecture
Add API persistence behind the same repository contract. The client should queue or retry save requests and resolve conflicts deliberately. Do not introduce Redis unless measured needs such as shared cache, rate limiting, queues, or session workloads justify it.
