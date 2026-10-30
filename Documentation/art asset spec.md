# Artwork and Asset Specification

## 1. Style
- Cozy pixel art, limited palettes, strong silhouettes.
- Warm amber light contrasted with plum/violet night shadows.
- Subjects: cats, rooms, plants, books, tea, rainy windows, tiny cafés, gardens.
- Original artwork or assets with a license compatible with intended use.
- Keep scene complexity appropriate to cell size; avoid detail that becomes indistinguishable on mobile.

## 2. Grid dimensions and touch policy
Grid size is an input-design decision, not only an art decision. A 32-column grid displayed in a 320 CSS-pixel-wide mobile viewport yields roughly 10 CSS-pixel cells; a 64-column grid yields roughly 5. Neither is a reliable tap target for independent cell coloring.

- For an MVP without a pan/zoom viewport, publish touch-first art at 16×16 and verify it at the narrowest supported viewport.
- Artwork with more than 16 columns may ship only when the coloring studio provides a tested pan/zoom viewport that lets a user enlarge cells before painting.
- Test the actual rendered cell size, canvas margins, browser zoom, and device pixel ratio. Do not infer tap comfort from the source-image resolution.

## 3. Asset bundle
Example:
```text
public/artworks/cozy-cat/
├── artwork.json
├── preview.png
├── mask.bin
└── initial-colors.bin
```

A static host cannot enumerate artwork directories at runtime. The gallery must load `catalog.json`, then load only entries whose `published` value is `true`.

Place that catalog at `public/artworks/catalog.json`, beside the artwork directories rather than inside any one artwork directory.

## 4. Manifest schema
```json
{
  "schemaVersion": 1,
  "contentVersion": 1,
  "id": "cozy-cat",
  "title": "Sleepy Cat",
  "description": "A little cat by a rainy window.",
  "width": 16,
  "height": 16,
  "paletteId": "rainy-evening",
  "maskFile": "mask.bin",
  "initialColorsFile": "initial-colors.bin",
  "previewFile": "preview.png",
  "category": "animals",
  "difficulty": "easy",
  "license": {
    "type": "original",
    "creator": "project creator",
    "attribution": ""
  }
}
```

`contentVersion` is a positive integer owned by the artwork. Increment it whenever a published change would alter the meaning of saved color indices (for example, dimensions, mask, palette ordering, or initial colors). Either provide an explicit migration or treat saves from an older content version as incompatible; never apply them silently.

Example catalog:
```json
{
  "schemaVersion": 1,
  "artworks": [
    { "id": "cozy-cat", "manifest": "cozy-cat/artwork.json", "published": true }
  ]
}
```

## 5. Binary conventions
For an initial implementation, JSON arrays are acceptable and easier to debug. If using binary:
- Mask: one byte per cell; `0` means fixed, `1` means colorable.
- Colors: one byte per cell; `0` means uncolored; `1..palette.length` means palette index.
- Because colors use one byte, a palette may contain at most 255 entries. The MVP should use far fewer.
- Byte order is irrelevant for single-byte values.
- Expected length is width × height.
- Document schema version if the format evolves.

## 6. Palette
Store palette colors as CSS hex strings in a separate palette manifest:
```json
{
  "id": "rainy-evening",
  "name": "Rainy Evening",
  "colors": ["#59465E", "#826A91", "#D69A62", "#F3D9A4", "#B6C8AE"]
}
```
Reserve index `0` for uncolored; palette entry mapping should be explicit so there is no off-by-one ambiguity.

## 7. Asset validation
Reject missing files, duplicate catalog IDs, missing manifests for published entries, unsupported dimensions, invalid palette indices, incorrect byte lengths, non-positive schema/content versions, and malformed metadata. Add source/license metadata to every third-party asset.
