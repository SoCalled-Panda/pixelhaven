# PixelHaven

A cozy, high-fidelity paint-by-numbers coloring web app. Color intricate pixel-art scenes with a studio-grade toolset — zoom, pan, flood fill, undo/redo, and a 100+ color palette. Built with React, TypeScript, and Vite.

**[Live Demo](https://socalled-panda.github.io/pixelhaven/)**

---

## Screenshots

<p align="center">
  <img src="https://github.com/user-attachments/assets/ec28ae6e-614d-4468-bf11-f3b0dedefabb" alt="PixelHaven File Explorer" width="60%" />
</p>
<p align="center">
  <img src="https://github.com/user-attachments/assets/8ab8cf5f-9afb-4249-8bf2-371f8e0b9ffd" alt="PixelHaven Settings" width="60%" />
</p>



---

## Features

- **Paint-by-numbers engine** — click or drag to color cells, with per-cell progress tracking and completion detection
- **Flood fill tool** — fill entire connected regions of the same color in one tap
- **Eraser** — return any cell to its uncolored state
- **Zoom & pan** — scroll/pinch to zoom, drag to pan, fit-to-view button
- **Undo / redo** — full history with keyboard shortcuts
- **100-200 color palettes** — high-fidelity HD artworks with median-cut quantization
- **Reference preview** — floating thumbnail of the finished artwork for guidance
- **Progress tracking** — per-color completion percentages and overall progress bar
- **Save / load** — export and import coloring progress as JSON
- **Auto-playing lofi soundtrack** — 6 cozy tracks that auto-advance and start on first interaction
- **Dark & light themes** — warm, cozy palette designed for long coloring sessions
- **Responsive** — works on desktop and tablet

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build | Vite 5 |
| Styling | CSS custom properties (design tokens) |
| State | React hooks + localStorage persistence |
| Audio | HTML5 Audio (singleton service, auto-advance playlist) |
| Testing | Vitest + Testing Library |
| Deployment | GitHub Pages (GitHub Actions CI/CD) |

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+

### Install & run
```bash
git clone https://github.com/SoCalled-Panda/pixelhaven.git
cd pixelhaven
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

### Build for production
```bash
npm run build
```
Output goes to `dist/`.

### Run tests
```bash
npm test
```

### Validate assets
```bash
npm run validate:assets
```

## Project Structure

```
src/
├── components/       # UI components (PalettePicker, ReferencePreview, icons, etc.)
├── data/             # Manifest validation, catalog loading, custom artworks
├── engine/           # Coloring engine, renderer, view transform, types
├── hooks/            # useColoringSession, usePersistentPreference
├── lib/              # Photo to paint-by-number pipeline
├── pages/            # HomePage, ColoringPage, NotFoundPage
└── styles/           # Global CSS, design tokens
scripts/
├── generate-artworks.mjs   # Classic artwork generator (256x256)
├── hifi-scenes.mjs         # HD scene definitions (256x256, 100-200 colors)
├── pbn-lib.mjs             # Photo to PBN rasterization library
├── validate-assets.mjs     # Asset validation (release gate)
└── art-lib.mjs             # Raster DSL for classic scenes
public/
├── artwork/          # Generated artwork manifests + preview SVGs
└── audio/            # Lofi music tracks
```

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `1`-`9` | Select color by number |
| `0` | Eraser |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Redo |
| `+` / `-` | Zoom in / out |
| `0` | Fit to view |
| `Space` (hold) | Pan mode |

## License

This project is open source. Music tracks are by their respective artists under CC BY-SA 3.0 / free-use licenses (see `public/audio/tracks.json` for attribution).

---

Built with care. Happy coloring!