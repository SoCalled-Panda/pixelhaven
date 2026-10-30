# Development and Content Pipeline

## 1. Development workflow
1. Create a branch for a focused feature.
2. Update relevant documentation when a contract changes.
3. Implement pure engine logic first where possible.
4. Add unit tests for state transitions.
5. Implement the UI around the tested logic.
6. Run lint, type-check, unit tests, and production build.
7. Test browser interaction manually or through Playwright.
8. Merge to main only when the feature is stable.

Suggested scripts:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  }
}
```
Adapt these to the generated Vite template and installed TypeScript configuration.

## 2. Artwork production pipeline
1. Define the scene concept and target grid dimensions.
2. Create pixel art in a suitable editor.
3. Ensure each logical cell maps to a single intended grid cell.
4. Export a preview image.
5. Export or generate a colorable mask.
6. Define palette and initial cell colors.
7. Validate dimensions and palette indices with a script.
8. Test the asset in the real canvas at desktop and mobile sizes.
9. Record creator/source, license, and any attribution.
10. Add the artwork to the static `catalog.json` manifest.

### Suggested asset conventions
- IDs: lowercase kebab-case, stable once published.
- Filenames: `preview.png`, `mask.bin`, `initial-colors.bin`, `artwork.json`.
- Keep original editable source files outside the public runtime assets if they are large.
- Use transparent PNG or another documented format for previews where appropriate.
- Prefer lossless formats for pixel art; avoid lossy compression that blurs edges.

## 3. Validation pipeline
For every artwork:
- `width` and `height` are positive and under an agreed maximum.
- Mask length equals width × height.
- Initial color array length equals width × height.
- Each color index is valid for the palette.
- The manifest has valid schema and content versions; its ID is unique in the catalog.
- Fixed cells are not accidentally editable.
- Preview dimensions and aspect ratio are correct.
- Asset URLs resolve.
- License/source metadata exists.

## 4. CI pipeline
On each pull request:
- Install dependencies from lockfile.
- Run formatting/lint checks if configured.
- Run TypeScript type check.
- Run unit tests.
- Validate artwork manifests and assets.
- Build production bundle.
- Optionally run Playwright smoke tests.

On release:
- Build static app.
- Publish build output to static host/CDN.
- Verify HTTPS and SPA route fallback.
- Run a smoke test against deployed URL.

## 5. Backend pipeline (future only)
If an API is introduced:
- Build and test ASP.NET Core API.
- Run database migrations in a controlled release step.
- Build Docker image.
- Deploy API and configure secrets outside the image.
- Run health checks and smoke tests.
- Back up PostgreSQL and test restore procedures.
