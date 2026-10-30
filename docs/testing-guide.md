# Testing Guide

PixelHaven is a **local-first SPA with zero API endpoints** — the entire product
runs in the browser and talks only to IndexedDB and static files. That shapes the
testing strategy:

> **Why there is no Swagger here:** Swagger/OpenAPI documents HTTP APIs. This MVP
> has no server and no endpoints, so there is nothing for Swagger to describe. If
> the future cloud-save API (checklist §K) is built, add OpenAPI then — the
> repository contract (`src/data/sessionRepo.ts`) is the seam it will slot into.
> The equivalent "API playground" for this codebase is **Vitest + fake-indexeddb**
> for data-layer behavior, and **browser DevTools** for interaction testing.

## 1. Automated tests (run in CI)

```bash
npm test
```

| Area                  | File(s)                                        | Tooling                    |
| --------------------- | ---------------------------------------------- | -------------------------- |
| Grid math & coords    | `src/engine/grid.test.ts`                      | Vitest (node)              |
| Engine commands/undo  | `src/engine/coloringEngine.test.ts`            | Vitest (node)              |
| Progress calculation  | `src/engine/coloringEngine.test.ts`            | Vitest (node)              |
| Pointer math & view transform | `src/engine/viewTransform.test.ts`               | Vitest (node)              |
| Manifest validation   | `src/data/manifest.test.ts`                    | Vitest (node)              |
| Save-file import      | `src/data/saveFile.test.ts`                    | Vitest (node)              |
| IndexedDB repository  | `src/data/sessionRepo.test.ts`                 | Vitest + fake-indexeddb    |
| Load→color→save→restore | `tests/sessionFlow.test.ts`                  | Vitest + fake-indexeddb    |
| Static asset integrity| `tests/assets.test.ts`                         | Vitest (node, fs)          |
| UI components         | `src/components/**/__tests__/*.test.tsx`       | Vitest + jsdom + RTL       |

`npm run lint`, `npm run typecheck`, and `npm run build` must also pass before a
release commit.

## 2. Manual QA script (browser)

Run through this after every release candidate, in **Chrome/Edge** and one more
browser (Firefox or Safari):

### Zoom & pan (128×128 scenes)
- [ ] Wheel over canvas zooms toward the cursor; pinch zooms on touch.
- [ ] Move tool (✥ icon) toggles pan mode: primary-drag pans while active,
      `M` toggles it, cursor shows grab/grabbing; right-drag always pans.
- [ ] Panning clamps so the board never leaves the view.
- [ ] Zoom buttons (+ / − / fit) work; keyboard +/−/0 work when canvas focused.
- [ ] Fit view shows the whole scene at 320 px width; zoomed cells stay crisp.
- [ ] Painting while zoomed lands colors on the exact intended cells.

### Paint-by-numbers
- [ ] Zoomed in, uncolored cells show their designated number; the number
      matches the badge printed on the palette swatch.
- [ ] Filling a cell with the WRONG color keeps its number visible on top;
      erasing brings the muted number back.
- [ ] Zoomed out, small target-color dots mark each cell; below ~10 px cells
      (fit view) the overlay disappears for a clean look.

### Coloring
- [ ] Tap a colorable cell → applies selected color instantly.
- [ ] Tap a fixed paper/outline cell → nothing happens.
- [ ] Drag across cells → paints a stroke, no scroll hijack on touch.
- [ ] Undo/redo buttons restore exact previous colors; disabled states correct.
- [ ] Eraser returns cells to uncolored; reset asks for confirmation first.

### Persistence (the PRD acceptance tests)
- [ ] Color some cells → hard-refresh page (`Ctrl+Shift+R`) → colors restored.
- [ ] Make 5+ rapid edits and immediately close the tab → reopen → progress present
      (verifies `pagehide` flush; nothing depends on writes during tab close).
- [ ] Open the same artwork in two tabs, edit in both → the older tab shows a
      conflict notice, newer progress is never overwritten.
- [ ] Import a tampered save file (edit JSON, wrong version/length) → rejected with
      a friendly message, existing progress untouched.

### Audio
- [ ] No sound before clicking play (cold load, navigation, refresh).
- [ ] Play/pause, track switch, volume, mute all work; volume/tracked remembered
      after refresh.
- [ ] Start a track → navigate Home → audio keeps playing (player is persistent).

### Responsive & input
- [ ] 320 px viewport (or DevTools iPhone SE): canvas fits, cells still tappable,
      controls wrapped below canvas and not covering it.
- [ ] Browser zoom 150%/200%: layout adapts, pointer coordinates stay correct.
- [ ] Keyboard only: Tab through controls; arrow keys move canvas cursor;
      Enter colors; Backspace erases; visible focus everywhere.

### Failure modes
- [ ] DevTools → Application → IndexedDB → delete the database while an artwork is
      open → next save recreates it or shows a non-blocking warning; no crash.
- [ ] Block `/artwork/catalog.json` (Network throttle/offline + cache disabled) →
      gallery shows a friendly error state, app does not white-screen.
- [ ] `prefers-reduced-motion: reduce` (OS setting) → celebration/animation is static.

### Second device
- [ ] After enabling GitHub Pages, open the deployed URL on a phone: verify touch
      painting, autosave, and audio.

## 3. Debugging tools that help

- **React DevTools** — inspect component state (save status, modal state).
- **DevTools → Application → IndexedDB → `pixelhaven`** — inspect raw sessions.
- **DevTools → Rendering → Emulate prefers-reduced-motion** — motion testing.
- **Lighthouse (Chrome)** — quick accessibility/best-practice sweep per release.
