# PixelHaven

A cozy, high-fidelity paint-by-numbers coloring web app. Color intricate pixel-art scenes with a studio-grade toolset â€” zoom, pan, flood fill, undo/redo, and a 100+ color palette. Built with React, TypeScript, and Vite.

**[Live Demo](https://socalled-panda.github.io/pixelhaven/)**

---

## Screenshots

<p align="center">
  <img src="https://github.com/user-attachments/assets/8ab8cf5f-9afb-4249-8bf2-371f8e0b9ffd" alt="PixelHaven Settings" width="48%" />
  <img src="https://github.com/user-attachments/assets/ec28ae6e-614d-4468-bf11-f3b0dedefabb" alt="PixelHaven File Explorer" width="48%" />
</p>

---

## Features

- **Paint-by-numbers engine** â€” click or drag to color cells, with per-cell progress tracking and completion detection
- **Flood fill tool** â€” fill entire connected regions of the same color in one tap
- **Eraser** â€” return any cell to its uncolored state
- **Zoom & pan** â€” scroll/pinch to zoom, drag to pan, fit-to-view button
- **Undo / redo** â€” full history with keyboard shortcuts
- **100â€“200 color palettes** â€” high-fidelity HD artworks with median-cut quantization
- **Reference preview** â€” floating thumbnail of the finished artwork for guidance
- **Progress tracking** â€” per-color completion percentages and overall progress bar
- **Save / load** â€” export and import coloring progress as JSON
- **Auto-playing lofi soundtrack** â€” 6 cozy tracks that auto-advance and start on first interaction
- **Dark & light themes** â€” warm, cozy palette designed for long coloring sessions
- **Responsive** â€” works on desktop and tablet

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
â”œâ”€â”€ components/       # UI components (PalettePicker, ReferencePreview, icons, etc.)
â”œâ”€â”€ data/             # Manifest validation, catalog loading, custom artworks
â”œâ”€â”€ engine/           # Coloring engine, renderer, view transform, types
â”œâ”€â”€ hooks/            # useColoringSession, usePersistentPreference
â”œâ”€â”€ lib/              # Photo â†’ paint-by-number pipeline
â”œâ”€â”€ pages/            # HomePage, ColoringPage, NotFoundPage
â””â”€â”€ styles/           # Global CSS, design tokens
scripts/
â”œâ”€â”€ generate-artworks.mjs   # Classic artwork generator (256Ã—256)
â”œâ”€â”€ hifi-scenes.mjs         # HD scene definitions (256Ã—256, 100-200 colors)
â”œâ”€â”€ pbn-lib.mjs             # Photo â†’ PBN rasterization library
â”œâ”€â”€ validate-assets.mjs     # Asset validation (release gate)
â””â”€â”€ art-lib.mjs             # Raster DSL for classic scenes
public/
â”œâ”€â”€ artwork/          # Generated artwork manifests + preview SVGs
â””â”€â”€ audio/            # Lofi music tracks
```

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `1`â€“`9` | Select color by number |
| `0` | Eraser |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Redo |
| `+` / `-` | Zoom in / out |
| `0` | Fit to view |
| `Space` (hold) | Pan mode |

## License

This project is open source. Music tracks are by their respective artists under CC BY-SA 3.0 / free-use licenses (see `public/audio/tracks.json` for attribution).

---

Built with care. Happy coloring! ðŸŽ¨
