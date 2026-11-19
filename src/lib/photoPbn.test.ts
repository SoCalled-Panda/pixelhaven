import { describe, expect, it } from 'vitest';
import {
  boxDownsample,
  buildPhotoGrid,
  countRegions,
  createCanvas,
  derivePaper,
  hashCanvas,
  mergeSmallRegions,
  PHOTO_BOARD_SIZE,
  PHOTO_OUTLINE,
  PHOTO_PAPER,
  PHOTO_SUPERSAMPLE,
  quantizeCanvas,
  rleEncodeRows,
  rgbToHex,
} from './photoPbn';
import { decodeRleRow } from '../engine/grid';
import { validateManifest } from '../data/manifest';

/** Smallest 4-connected region after cleanup — the merge guarantee. */
function minRegionSize(grid: Int32Array, w: number, h: number): number {
  const seen = new Uint8Array(w * h);
  let min = Number.POSITIVE_INFINITY;
  for (let start = 0; start < w * h; start++) {
    if (seen[start]) continue;
    const value = grid[start];
    const stack: number[] = [start];
    seen[start] = 1;
    let size = 0;
    while (stack.length > 0) {
      const cell = stack.pop() as number;
      size++;
      const x = cell % w;
      const y = (cell - x) / w;
      const neighbours = [
        x > 0 ? cell - 1 : -1,
        x < w - 1 ? cell + 1 : -1,
        y > 0 ? cell - w : -1,
        y < h - 1 ? cell + w : -1,
      ];
      for (const n of neighbours) {
        if (n >= 0 && !seen[n] && grid[n] === value) {
          seen[n] = 1;
          stack.push(n);
        }
      }
    }
    min = Math.min(min, size);
  }
  return min;
}

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

  it('merges regions smaller than the minimum as whole regions', () => {
    const grid = new Int32Array(16 * 16).fill(1);
    // A 3-cell streak of color 2 and a 2-cell streak of color 3: both are
    // below minSize 8 and must be absorbed completely.
    grid[4 * 16 + 2] = 2;
    grid[4 * 16 + 3] = 2;
    grid[4 * 16 + 4] = 2;
    grid[10 * 16 + 12] = 3;
    grid[10 * 16 + 13] = 3;
    mergeSmallRegions(grid, 16, 16, 8);
    expect(countRegions(grid, 16, 16)).toBe(1);
    expect(Array.from(grid).every((v) => v === 1)).toBe(true);
    expect(minRegionSize(grid, 16, 16)).toBe(16 * 16);
  });

  it('converges on dense speckle instead of ping-ponging forever', () => {
    // A checkerboard is the worst case: every cell is its own 1-cell region.
    // It settles into stripes rather than one colour, but it must terminate
    // and no region may stay below the minimum.
    const grid = new Int32Array(16 * 16);
    for (let i = 0; i < grid.length; i++) grid[i] = i % 2 === 0 ? 1 : 2;
    mergeSmallRegions(grid, 16, 16, 8);
    expect(minRegionSize(grid, 16, 16)).toBeGreaterThanOrEqual(8);
    expect(countRegions(grid, 16, 16)).toBeLessThan(256);
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

describe('boxDownsample (supersample reducer)', () => {
  it('averages factor×factor blocks exactly like the Node pipeline', () => {
    const cv = createCanvas(2, 2);
    // One 2×2 block: corner values 10/20/30/40 → mean 25 everywhere.
    cv.data.set([10, 10, 10, 20, 20, 20, 30, 30, 30, 40, 40, 40]);
    const down = boxDownsample(cv, 2);
    expect(down.w).toBe(1);
    expect(down.h).toBe(1);
    expect(down.data[0]).toBeCloseTo(25);
    expect(down.data[1]).toBeCloseTo(25);
    expect(down.data[2]).toBeCloseTo(25);
  });

  it('keeps the conversion core at PHOTO_BOARD_SIZE² (round-9 regression)', () => {
    // Regression: pre-round-9 the browser port quantized the raw 2× raster,
    // silently shipping 512² imports. The core must see the reduced board.
    const raster = makeTestCanvas(PHOTO_BOARD_SIZE * PHOTO_SUPERSAMPLE, PHOTO_BOARD_SIZE * PHOTO_SUPERSAMPLE);
    const result = buildPhotoGrid(boxDownsample(raster, PHOTO_SUPERSAMPLE), 99);
    expect(result.size).toBe(PHOTO_BOARD_SIZE);
  });
});

describe('constants', () => {
  it('uses white board paper, a 2× supersample and the round-9 128² board', () => {
    // Review round 10: imported boards always sit on white paper.
    expect(PHOTO_PAPER).toBe('#ffffff');
    expect(PHOTO_OUTLINE).toMatch(/^#[0-9a-f]{6}$/);
    expect(PHOTO_SUPERSAMPLE).toBe(2);
    // Round 9: imports share the built-in set's 128² sizing — 4× fewer
    // cells than the original 256² boards so sessions stay engaging.
    expect(PHOTO_BOARD_SIZE).toBe(128);
    expect(rgbToHex([255, 0, 16])).toBe('#ff0010');
  });

  it('buildPhotoGrid boards land in the retuned 24..128 color band', () => {
    const result = buildPhotoGrid(makeTestCanvas(128, 128), 777);
    expect(result.size).toBe(128);
    expect(result.usedColors).toBeGreaterThanOrEqual(2);
    expect(result.usedColors).toBeLessThanOrEqual(128);
  });
});
