# PixelHaven · Cozy Coloring

A cozy, **local-first** pixel-art coloring web app. Pick a picture, select a color,
tap the grid to fill it, listen to soft ambience, and come back later — your
progress is saved right in your browser.

Built as a calm alternative to noisy, ad-heavy coloring apps: no accounts, no
tracking, no timers — just coloring.

## Features

- 🎨 **Coloring Studio** — paint by numbers with two mechanics: the classic
  drag-to-paint brush **and a flood-fill bucket** that colors a whole
  contiguous area in one tap (with a live region preview while you hover).
  Pinch/wheel zoom, move tool, right-drag pan, paint-by-numbers digits,
  undo/redo, eraser, reset-with-confirmation
- 📸 **Turn your photo into a coloring page** — pick any picture and the app
  converts it in the browser with the same HD pipeline used for the built-in
  set (256×256, up to 200 colors, painterly region borders), shows a
  side-by-side preview before saving, and drops it straight into your gallery
  (YOURS badge, deletable). Nothing is uploaded — everything stays on-device
- 🖼️ **Curated gallery — all HD** — **12 scenes at 256×256 with 100-200
  colors each** (127-168 in practice): the floating tree hero, turquoise
  cove, sakura temple and aurora fjord joined the round-6 high-fidelity set
  (sunset sail, mountain dawn, aurora night, rose glow, city lights, forest
  light, desert dusk, lily pond). Every board is procedurally generated with
  painterly gradients and noise-textured regions; per-artwork progress
- 🔢 **Reference-aware coloring** — a floating finished-picture card over the
  canvas, paint-by-numbers digits on every cell, and live per-color percentage
  captions under each palette swatch (compact scrollable grid for the
  200-color HD sets)
- 💾 **Local-first persistence** — sessions autosave to IndexedDB with
  revision-based stale-write protection; export/import save files
- 🎧 **Lofi ambience player** — six real lofi/chill tracks by Alex Morgan
  (Free Music Archive, CC BY 4.0) as seamless loops; playback survives route
  changes; starts only after you click play; attribution shown in the dock
- ⌨️ **Accessible** — keyboard canvas navigation (arrows/Enter/Backspace/±/0),
  visible focus, reduced-motion support
- 📴 **Works offline** after first load (static assets, no backend required)

## Tech stack

React 18 + TypeScript (strict) + Vite. Canvas 2D rendering via a
framework-independent coloring engine. IndexedDB for sessions, localStorage for
small preferences. No backend — see [docs/architecture.md](docs/architecture.md).

## Getting started

```bash
npm install
npm run dev          # start dev server
```

### Scripts

| Command                  | Purpose                                    |
| ------------------------ | ------------------------------------------ |
| `npm run dev`            | Dev server with hot reload                 |
| `npm run build`          | Type-check + production build (`dist/`)    |
| `npm run preview`        | Serve the production build locally         |
| `npm test`               | Run the Vitest unit/integration suite      |
| `npm run test:watch`     | Watch mode                                 |
| `npm run lint`           | ESLint                                     |
| `npm run format`         | Prettier                                   |
| `npm run typecheck`      | `tsc --noEmit`                             |
| `npm run validate:assets`| Validate catalog/manifests/preview assets  |
| `npm run generate:artworks` | Regenerate artwork manifests + previews |
| `npm run prepare:audio`  | Process lofi tracks from `scripts/audio-src/` into looped OGGs (ffmpeg) |

## Documentation

All product and engineering docs live in [`docs/`](docs/):

- [PRD](docs/prd.md) — product requirements, MVP scope, acceptance criteria
- [Architecture](docs/architecture.md) — boundaries, data flow, state ownership
- [Full detail checklist](docs/checklist.md) — the working delivery checklist
- [Artwork pipeline](docs/artwork-pipeline.md) — grid/mask/palette conventions, manifest schema
- [Testing guide](docs/testing-guide.md) — automated tests + manual QA checklist
- [Assets & licenses](docs/assets-licenses.md) — provenance of every art/audio asset

## Deployment

Static hosting only. A GitHub Pages workflow is included
(`.github/workflows/deploy.yml`); enable Pages → "GitHub Actions" source and push
to `main`. Any HTTPS static host works (Netlify, Cloudflare Pages, nginx).

## License

Code and original assets: MIT — see [LICENSE](LICENSE) and
[docs/assets-licenses.md](docs/assets-licenses.md).
