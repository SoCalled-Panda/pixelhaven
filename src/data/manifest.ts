import { cellCount, decodeRleRow, indexOf } from '../engine/grid';
import type { ArtworkManifest, ValidatedArtwork } from '../engine/types';

export type ManifestValidation =
  | { ok: true; artwork: ValidatedArtwork }
  | { ok: false; reason: string };

const HEX = /^#[0-9a-f]{6}$/;
const MASK_CHARS = /^[.\-0-9a-z]$/;

interface SchemaLimits {
  maxDim: number;
  maxPalette: number;
}

const LIMITS: Record<1 | 2, SchemaLimits> = {
  // Schema 1: classic 128×128 hand-drawn set, palette capped by base-36 chars.
  1: { maxDim: 128, maxPalette: 37 },
  // Schema 2: high-fidelity sets — bigger boards, up to 256 palette entries
  // (cell values are stored in Uint8Array, so indices must stay ≤ 255).
  2: { maxDim: 512, maxPalette: 256 },
};

/**
 * Validate an untrusted manifest and precompute the colorable-cell maps plus
 * the designated (paint-by-numbers) palette index per grid cell.
 * The width×height cap guards against allocating absurd arrays from bad data
 * (architecture §7). Fixed cells ('.'/'-', schema 1) never enter session data.
 */
export function validateManifest(raw: unknown): ManifestValidation {
  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, reason: 'Manifest is not an object' };
  }
  const m = raw as Record<string, unknown>;

  if (m.schemaVersion !== 1 && m.schemaVersion !== 2) {
    return { ok: false, reason: `Unsupported manifest schemaVersion: ${String(m.schemaVersion)}` };
  }
  const schema = m.schemaVersion as 1 | 2;
  const limits = LIMITS[schema];

  if (typeof m.id !== 'string' || !/^[a-z0-9-]+$/.test(m.id)) {
    return { ok: false, reason: 'Manifest id is missing or malformed' };
  }
  if (typeof m.title !== 'string' || m.title.length === 0 || m.title.length > 60) {
    return { ok: false, reason: 'Manifest title is missing or too long' };
  }
  if (!Number.isInteger(m.contentVersion) || (m.contentVersion as number) < 1) {
    return { ok: false, reason: 'Manifest contentVersion must be a positive integer' };
  }
  if (!Number.isInteger(m.width) || !Number.isInteger(m.height)) {
    return { ok: false, reason: 'Manifest width/height must be integers' };
  }
  const width = m.width as number;
  const height = m.height as number;
  if (width < 4 || width > limits.maxDim || height < 4 || height > limits.maxDim) {
    return {
      ok: false,
      reason: `Manifest dimensions out of range (4..${limits.maxDim}): ${width}x${height}`,
    };
  }
  if (typeof m.paperColor !== 'string' || !HEX.test(m.paperColor)) {
    return { ok: false, reason: 'Manifest paperColor invalid' };
  }
  if (typeof m.outlineColor !== 'string' || !HEX.test(m.outlineColor)) {
    return { ok: false, reason: 'Manifest outlineColor invalid' };
  }
  const palette = m.palette;
  if (!Array.isArray(palette) || palette.length < 2 || palette.length > limits.maxPalette) {
    return { ok: false, reason: `Manifest palette must contain 2..${limits.maxPalette} colors` };
  }
  if (!palette.every((c) => typeof c === 'string' && HEX.test(c))) {
    return { ok: false, reason: 'Manifest palette contains invalid hex colors' };
  }

  const total = cellCount({ width, height });
  const cellToOrdinal = new Int32Array(total).fill(-1);
  const designatedByCell = new Int16Array(total).fill(-1);
  const ordinalCells: number[] = [];

  if (schema === 1) {
    const mask = m.mask;
    if (!Array.isArray(mask) || mask.length !== height) {
      return { ok: false, reason: `Manifest mask must have exactly ${height} rows` };
    }
    for (let y = 0; y < height; y++) {
      const row = mask[y];
      if (typeof row !== 'string' || row.length !== width) {
        return { ok: false, reason: `Manifest mask row ${y} must be exactly ${width} chars` };
      }
      for (let x = 0; x < width; x++) {
        const ch = row[x];
        if (!MASK_CHARS.test(ch)) {
          return { ok: false, reason: `Mask cell (${x},${y}) has invalid character '${ch}'` };
        }
        if (ch !== '.' && ch !== '-') {
          const paletteIndex = parseInt(ch, 36);
          if (paletteIndex < 1 || paletteIndex >= palette.length) {
            return {
              ok: false,
              reason: `Mask cell (${x},${y}) references palette index ${paletteIndex}, which does not exist`,
            };
          }
          const cell = indexOf({ width, height }, x, y);
          cellToOrdinal[cell] = ordinalCells.length;
          designatedByCell[cell] = paletteIndex;
          ordinalCells.push(cell);
        }
      }
    }
  } else {
    const rle = m.rle;
    if (!Array.isArray(rle) || rle.length !== height) {
      return { ok: false, reason: `Manifest rle must have exactly ${height} rows` };
    }
    for (let y = 0; y < height; y++) {
      const row = rle[y];
      if (typeof row !== 'string') {
        return { ok: false, reason: `Manifest rle row ${y} must be a string` };
      }
      let runs;
      try {
        runs = decodeRleRow(row, y);
      } catch (error) {
        return { ok: false, reason: (error as Error).message };
      }
      let x = 0;
      for (const { index, run } of runs) {
        if (index < 1 || index >= palette.length) {
          return {
            ok: false,
            reason: `RLE row ${y} references palette index ${index}, which does not exist (0 is not addressable)`,
          };
        }
        if (x + run > width) {
          return { ok: false, reason: `RLE row ${y} runs exceed the grid width` };
        }
        for (let i = 0; i < run; i++) {
          const cell = indexOf({ width, height }, x + i, y);
          cellToOrdinal[cell] = ordinalCells.length;
          designatedByCell[cell] = index;
          ordinalCells.push(cell);
        }
        x += run;
      }
      if (x !== width) {
        return { ok: false, reason: `RLE row ${y} covers ${x} of ${width} cells` };
      }
    }
  }

  if (ordinalCells.length === 0) {
    return { ok: false, reason: 'Manifest has no colorable cells' };
  }

  const artwork: ValidatedArtwork = {
    id: m.id,
    title: m.title,
    contentVersion: m.contentVersion as number,
    width,
    height,
    paperColor: m.paperColor,
    outlineColor: m.outlineColor,
    palette,
    cellToOrdinal,
    ordinalToCell: Int32Array.from(ordinalCells),
    colorableCount: ordinalCells.length,
    designatedByCell,
  };
  if (schema === 1) artwork.mask = m.mask as string[];
  else artwork.rle = m.rle as string[];
  return { ok: true, artwork };
}

export function isArtworkManifest(raw: unknown): raw is ArtworkManifest {
  // Narrow type for loaders; full validation happens in validateManifest.
  return (
    typeof raw === 'object' &&
    raw !== null &&
    typeof (raw as ArtworkManifest).id === 'string' &&
    (Array.isArray((raw as ArtworkManifest).mask) ||
      Array.isArray((raw as ArtworkManifest).rle))
  );
}
