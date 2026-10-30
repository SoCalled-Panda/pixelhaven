import { describe, expect, it } from 'vitest';
import {
  buildPhotoGrid,
  countRegions,
  createCanvas,
  derivePaper,
  hashCanvas,
  mergeSmallRegions,
  PHOTO_OUTLINE,
  PHOTO_PAPER,
  PHOTO_SUPERSAMPLE,
  quantizeCanvas,
  rleEncodeRows,
  rgbToHex,
} from './photoPbn';
import { decodeRleRow } from '../engine/grid';
import { validateManifest } from '../data/manifest';

/** Paint a few soft color blobs + a gradient so median cut has real work. */
function makeTestCanvas(w: number, h: number) {
  const cv = createCanvas(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3;
      const blobA = Math.max(0, 1 - Math.hypot(x - w * 0.3, y - h * 0.3) / (w * 0.25));
      const blobB = Math.max(0, 1 - Math.hypot(x - w * 0.72, y - h * 0.65) / (w * 0.3));
      cv.data[i] = 40 + 160 * blobA + (x / w) * 40;
      cv.data[i + 1] = 60 + 150 * blobB + (y / h) * 30;
      cv.data[i + 2] = 120 + 90 * blobA * blobB + ((w - x) / w) * 50;
    }
  }
  return cv;
}

describe('quantizeCanvas (photo pipeline core)', () => {
  it('produces a compact 1-based grid aligned with its palette', () => {
    const cv = makeTestCanvas(64, 64);
    const { grid, palette, usedColors } = quantizeCanvas(cv, {
      colorTarget: 24,
      minSize: 2,
      minColors: 4,
      maxColors: 200,
    });
    expect(grid.length).toBe(64 * 64);
    expect(palette.length).toBe(usedColors);
    let min = Infinity;
    let max = -Infinity;
    const seen = new Set<number>();
    for (let i = 0; i < grid.length; i++) {
      min = Math.min(min, grid[i]);
      max = Math.max(max, grid[i]);
      seen.add(grid[i]);
    }
    expect(min).toBeGreaterThanOrEqual(1); // 0 is reserved for paper
    expect(max).toBeLessThanOrEqual(usedColors);
    expect(seen.size).toBe(usedColors); // compaction: no gaps
  });

  it('keeps every used palette color reachable from the grid', () => {
    const cv = makeTestCanvas(48, 48);
    const { grid, palette } = quantizeCanvas(cv, {
      colorTarget: 16,
      minSize: 2,
      minColors: 4,
      maxColors: 200,
    });
    const seen = new Set(grid);
    expect(seen.size).toBe(palette.length);
  });

  it('is deterministic for identical input', () => {
    const a = quantizeCanvas(makeTestCanvas(48, 48), { colorTarget: 20, minColors: 4 });
    const b = quantizeCanvas(makeTestCanvas(48, 48), { colorTarget: 20, minColors: 4 });
    expect(Array.from(a.grid)).toEqual(Array.from(b.grid));
    expect(a.palette).toEqual(b.palette);
  });

  it('never exceeds the color target (median cut yields ≤ k centers)', () => {
    const cv = makeTestCanvas(64, 64);
    const { usedColors } = quantizeCanvas(cv, { colorTarget: 24, minSize: 1, minColors: 4 });
    expect(usedColors).toBeLessThanOrEqual(24);
  });
});

describe('mergeSmallRegions / countRegions', () => {
  it('merges isolated single cells into their dominant neighbor', () => {
    const grid = new Int32Array(16 * 16).fill(1);
    grid[8 * 16 + 8] = 2; // lone cell of color 2 in a sea of color 1
    expect(countRegions(grid, 16, 16)).toBe(2);
    mergeSmallRegions(grid, 16, 16, 2);
    expect(countRegions(grid, 16, 16)).toBe(1);
    expect(grid[8 * 16 + 8]).toBe(1);
  });

  it('leaves healthy regions alone', () => {
    const grid = new Int32Array(16 * 16).fill(1);
    const before = Array.from(grid);
    expect(mergeSmallRegions(grid, 16, 16, 2)).toBe(0);
    expect(Array.from(grid)).toEqual(before);
  });
});

describe('rleEncodeRows (schema 2 wire format)', () => {
  it('emits 4-char base-36 tokens that decodeRleRow accepts', () => {
    const grid = new Int32Array(6 * 2);
    grid.fill(1, 0, 6);
    grid.fill(12, 6, 12);
    const rows = rleEncodeRows(grid, 6, 2);
    expect(rows).toEqual(['0106', '0c06']);
    const decoded = rows.map((row, y) => decodeRleRow(row, y));
    expect(decoded[0]).toEqual([{ index: 1, run: 6 }]);
    expect(decoded[1]).toEqual([{ index: 12, run: 6 }]);
  });

  it('encodes full runs across alternating cells', () => {
    const grid = Int32Array.from([1, 1, 2, 2, 2, 3]);
    const rows = rleEncodeRows(grid, 6, 1);
    expect(decodeRleRow(rows[0], 0)).toEqual([
      { index: 1, run: 2 },
      { index: 2, run: 3 },
      { index: 3, run: 1 },
    ]);
  });
});

describe('buildPhotoGrid (full photo core)', () => {
  it('returns a playable, validator-clean board', () => {
    const cv = makeTestCanvas(64, 64);
    const result = buildPhotoGrid(cv, 1234);
    expect(result.size).toBe(64);
    expect(result.usedColors).toBeGreaterThanOrEqual(2);
    expect(result.usedColors).toBeLessThanOrEqual(200);
    expect(result.hexPalette[0]).toMatch(/^#[0-9a-f]{6}$/);
    // The derived paper must differ from the page background, or the board
    // would be invisible (the exact bug derivePaper exists to prevent).
    expect(result.hexPalette[0].toUpperCase()).not.toBe('#F8F1E5');
    expect(result.hexPalette).toHaveLength(result.usedColors + 1);
    for (const hex of result.hexPalette) {
      expect(hex).toMatch(/^#[0-9a-f]{6}$/);
    }
    for (let i = 0; i < result.grid.length; i++) {
      expect(result.grid[i]).toBeGreaterThanOrEqual(1);
      expect(result.grid[i]).toBeLessThan(result.hexPalette.length);
    }

    // The same manifest assembly convertPhotoToArtwork performs must pass
    // the production validator unchanged.
    const manifest = {
      id: 'custom-test',
      title: 'Test photo',
      schemaVersion: 2,
      contentVersion: 1,
      width: result.size,
      height: result.size,
      paperColor: result.hexPalette[0],
      outlineColor: PHOTO_OUTLINE,
      palette: result.hexPalette,
      rle: rleEncodeRows(result.grid, result.size, result.size),
    };
    const validated = validateManifest(manifest);
    expect(validated.ok).toBe(true);
    if (validated.ok) {
      expect(validated.artwork.colorableCount).toBe(result.size * result.size);
    }
  });

  it('is deterministic for a given seed (same photo → same board)', () => {
    const a = buildPhotoGrid(makeTestCanvas(48, 48), 42);
    const b = buildPhotoGrid(makeTestCanvas(48, 48), 42);
    expect(Array.from(a.grid)).toEqual(Array.from(b.grid));
    expect(a.hexPalette).toEqual(b.hexPalette);
    // A different seed still yields a valid board, but perturbs the borders.
    const c = buildPhotoGrid(makeTestCanvas(48, 48), 43);
    expect(c.usedColors).toBeGreaterThanOrEqual(2);
  });
});

describe('hashCanvas', () => {
  it('is stable for identical canvases and differs across content', () => {
    const a = hashCanvas(makeTestCanvas(32, 32));
    const b = hashCanvas(makeTestCanvas(32, 32));
    const c = hashCanvas(createCanvas(32, 32)); // all zeros
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});

describe('derivePaper', () => {
  it('pulls bright photos to a mid tone that never equals the page cream', () => {
    const bright = derivePaper([
      [250, 240, 220],
      [255, 250, 235],
      [245, 235, 210],
    ]);
    const dark = derivePaper([
      [10, 12, 24],
      [14, 16, 30],
      [8, 9, 18],
    ]);
    for (const paper of [bright, dark]) {
      expect(paper).toMatch(/^#[0-9a-f]{6}$/);
      expect(paper.toUpperCase()).not.toBe('#F8F1E5');
    }
    // The design contract: the paper must contrast with the page background
    // (≈ #f8f1e5, luminance ≈ 240), or the uncolored board is invisible.
    // Dark photos may legitimately land near-charcoal (see aurora-night).
    const lum = (hex: string) => {
      const n = parseInt(hex.slice(1), 16);
      return 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
    };
    expect(lum(bright)).toBeLessThan(200);
    expect(lum(dark)).toBeLessThan(200);
    expect(Math.abs(lum(bright) - 240)).toBeGreaterThan(50);
    expect(Math.abs(lum(dark) - 240)).toBeGreaterThan(50);
  });

  it('is deterministic', () => {
    const palette = [
      [200, 120, 80],
      [90, 140, 60],
    ];
    expect(derivePaper(palette)).toBe(derivePaper(palette));
  });
});

describe('constants', () => {
  it('uses the app canvas paper and a 2× supersample', () => {
    expect(PHOTO_PAPER).toMatch(/^#[0-9a-f]{6}$/);
    expect(PHOTO_OUTLINE).toMatch(/^#[0-9a-f]{6}$/);
    expect(PHOTO_SUPERSAMPLE).toBe(2);
    expect(rgbToHex([255, 0, 16])).toBe('#ff0010');
  });
});
