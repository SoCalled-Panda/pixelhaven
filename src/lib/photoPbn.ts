/**
 * Photo → paint-by-number pipeline (browser port of scripts/pbn-lib.mjs).
 *
 * A user photo is center-cropped and rasterized at 2× supersample (512² for a
 * 256² board), perturbed with a light value-noise pass so region borders read
 * as painterly rather than sterile, then median-cut quantized down to ~50 flat
 * colours and cleaned of tiny regions. Photos use a 256² board and their own
 * quantizer settings rather than the built-in scenes' 128² / 12-cell rules:
 * the smaller board averages a portrait's eyes and line art into slabs and the
 * result reads as a blur. The result is a schema-2 manifest (RLE rows, at most
 * 64 palette colors) that `validateManifest` accepts unchanged, so the
 * coloring engine, fill tool, saves and progress need zero artwork-specific
 * code paths.
 *
 * Everything below the DOM rasterization helpers is pure math on typed
 * arrays and fully deterministic for a given input + noise seed.
 */

import type { ArtworkManifest } from '../engine/types';
import { validateManifest } from '../data/manifest';

/* ------------------------------------------------------------ color utils */

export function rgbToHex([r, g, b]: readonly number[]): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Perceptual-ish RGB distance (higher weight on green, as in luminance). */
function colorDist(a: readonly number[], b: readonly number[]): number {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return 2 * dr * dr + 4 * dg * dg + 3 * db * db;
}

/* ------------------------------------------------------- float RGB canvas */

export interface FloatCanvas {
  w: number;
  h: number;
  data: Float32Array;
}

export function createCanvas(w: number, h: number): FloatCanvas {
  return { w, h, data: new Float32Array(w * h * 3) };
}

/**
 * Average factor×factor pixel blocks into one — the supersample reducer.
 * The browser port quantized the raw 2× raster before round 9, which made
 * imports silently 2× bigger than intended (512² boards!); this restores
 * parity with the Node pipeline (`scripts/pbn-lib.mjs boxDownsample`).
 */
export function boxDownsample(cv: FloatCanvas, factor: number): FloatCanvas {
  const w = Math.floor(cv.w / factor);
  const h = Math.floor(cv.h / factor);
  const out = createCanvas(w, h);
  const f2 = factor * factor;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let dy = 0; dy < factor; dy++) {
        for (let dx = 0; dx < factor; dx++) {
          const i = ((y * factor + dy) * cv.w + x * factor + dx) * 3;
          r += cv.data[i];
          g += cv.data[i + 1];
          b += cv.data[i + 2];
        }
      }
      const o = (y * w + x) * 3;
      out.data[o] = r / f2;
      out.data[o + 1] = g / f2;
      out.data[o + 2] = b / f2;
    }
  }
  return out;
}

/** Copy an RGBA ImageData buffer into a float RGB canvas (alpha dropped). */
export function canvasFromImageData(image: ImageData): FloatCanvas {
  const cv = createCanvas(image.width, image.height);
  const src = image.data;
  for (let i = 0, j = 0; j < cv.data.length; i += 4, j += 3) {
    cv.data[j] = src[i];
    cv.data[j + 1] = src[i + 1];
    cv.data[j + 2] = src[i + 2];
  }
  return cv;
}

/* ------------------------------------------------------------- value noise */

export function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic value noise (2 octaves) for organic region borders. */
export function makeNoise(seed: number): (x: number, y: number) => number {
  const PERM = 512;
  const rand = mulberry(seed);
  const table = new Float32Array(PERM);
  for (let i = 0; i < PERM; i++) table[i] = rand();
  const at = (x: number, y: number) => table[(((x * 73 + y * 149) % PERM) + PERM) % PERM];
  const smooth = (t: number) => t * t * (3 - 2 * t);
  const noise2 = (x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const tx = smooth(x - xi);
    const ty = smooth(y - yi);
    const a = at(xi, yi);
    const b = at(xi + 1, yi);
    const c = at(xi, yi + 1);
    const d = at(xi + 1, yi + 1);
    return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
  };
  return (x, y) => noise2(x, y) * 0.65 + noise2(x * 2.7 + 31, y * 2.7 + 17) * 0.35;
}

/**
 * Perturb every pixel by smooth noise so quantized regions get painterly,
 * organic borders instead of ruler-straight band edges. `amount` is in
 * RGB units (photos use a subtle 8; built-in scenes use 14).
 */
export function texturePass(cv: FloatCanvas, noise: (x: number, y: number) => number, amount: number, scale = 0.06): void {
  for (let y = 0; y < cv.h; y++) {
    for (let x = 0; x < cv.w; x++) {
      const n = noise(x * scale, y * scale) - 0.5;
      const i = (y * cv.w + x) * 3;
      const d = n * amount * 2;
      cv.data[i] += d;
      cv.data[i + 1] += d;
      cv.data[i + 2] += d;
    }
  }
}

/* --------------------------------------------------------------- quantizer */

/** Population-weighted spread of a box: total squared error about its mean. */
function boxError(box: number[][]): { mean: [number, number, number]; sse: number; variance: [number, number, number] } {
  const n = box.length;
  let r = 0;
  let g = 0;
  let b = 0;
  for (const p of box) {
    r += p[0];
    g += p[1];
    b += p[2];
  }
  r /= n;
  g /= n;
  b /= n;
  let vr = 0;
  let vg = 0;
  let vb = 0;
  for (const p of box) {
    const dr = p[0] - r;
    const dg = p[1] - g;
    const db = p[2] - b;
    vr += dr * dr;
    vg += dg * dg;
    vb += db * db;
  }
  return { mean: [r, g, b], sse: vr + vg + vb, variance: [vr, vg, vb] };
}

/**
 * Median-cut quantization of the canvas pixels into k boxes, splitting the box
 * with the largest *error* (population × variance) rather than the widest one.
 *
 * The classic "split the widest box" rule spends most of the palette on the
 * biggest area — on a portrait the large near-black background swallowed 12
 * near-identical entries, leaving the face starved of skin tones. Splitting by
 * error spends colours where variation actually is, so skin gradients and hair
 * shading get the entries they need while flat areas settle on one colour.
 */
function medianCut(pixels: number[][], k: number): number[][] {
  let boxes: number[][][] = [pixels];
  while (boxes.length < k) {
    let pick = -1;
    let pickError = 0;
    for (let i = 0; i < boxes.length; i++) {
      if (boxes[i].length < 2) continue;
      const { sse } = boxError(boxes[i]);
      if (sse > pickError) {
        pickError = sse;
        pick = i;
      }
    }
    // Every remaining box is a single colour: no further split can help.
    if (pick < 0 || pickError <= 0) break;
    const box = boxes[pick];
    const { variance } = boxError(box);
    const axis = variance[0] >= variance[1] && variance[0] >= variance[2] ? 0 : variance[1] >= variance[2] ? 1 : 2;
    box.sort((a, b) => a[axis] - b[axis]);
    const mid = box.length >> 1;
    boxes = [...boxes.slice(0, pick), box.slice(0, mid), box.slice(mid), ...boxes.slice(pick + 1)];
  }
  return boxes.filter((box) => box.length > 0).map((box) => boxError(box).mean);
}

/* -------------------------------------------------------- region utilities */

/** Label 4-connected regions of equal index. Returns label grid + sizes. */
function labelRegions(grid: Int32Array, w: number, h: number): { labels: Int32Array; sizes: number[] } {
  const labels = new Int32Array(w * h).fill(-1);
  const sizes: number[] = [];
  const queue = new Int32Array(w * h);
  for (let start = 0; start < w * h; start++) {
    if (labels[start] >= 0) continue;
    const id = sizes.length;
    const value = grid[start];
    let head = 0;
    let tail = 0;
    queue[tail++] = start;
    labels[start] = id;
    let size = 0;
    while (head < tail) {
      const cell = queue[head++];
      size++;
      const x = cell % w;
      const y = (cell - x) / w;
      const visit = (n: number) => {
        if (n < 0 || n >= w * h || labels[n] >= 0 || grid[n] !== value) return;
        labels[n] = id;
        queue[tail++] = n;
      };
      visit(y > 0 ? cell - w : -1);
      visit(y < h - 1 ? cell + w : -1);
      visit(x > 0 ? cell - 1 : -1);
      visit(x < w - 1 ? cell + 1 : -1);
    }
    sizes.push(size);
  }
  return { labels, sizes };
}

/** Number of 4-connected same-index regions (for the import review screen). */
export function countRegions(grid: Int32Array, w: number, h: number): number {
  return labelRegions(grid, w, h).sizes.length;
}

export interface MergeOptions {
  /** Palette centers (1-based aligned) used to measure border contrast. */
  centers?: readonly number[][];
  /**
   * RGB distance above which a small region is treated as *structure* (a line,
   * an iris, a shadow edge) and left alone. 0 merges purely by size.
   */
  minContrast?: number;
}

/**
 * Merge regions smaller than minSize into their dominant neighbour region.
 * Whole regions are reassigned (not individual cells) and processed smallest
 * first, repeating until every region meets the minimum. Each reassignment
 * removes a region, so the loop always converges — this is what keeps photo
 * imports from filling up with 1-cell speckle.
 *
 * With `minContrast`, a small region that differs strongly from its neighbour
 * is kept: that is exactly what stops a global minimum from eating eyes, brows
 * and line art, which are small *because* they are detail. Low-contrast
 * speckle (gradient dither, texture noise) still merges away.
 */
export function mergeSmallRegions(
  grid: Int32Array,
  w: number,
  h: number,
  minSize: number,
  options: MergeOptions = {},
): number {
  if (minSize <= 1) return 0;
  const centers = options.centers;
  const minContrast = options.minContrast ?? 0;
  let merged = 0;
  for (let pass = 0; pass < 64; pass++) {
    const { labels, sizes } = labelRegions(grid, w, h);
    const small: number[] = [];
    for (let id = 0; id < sizes.length; id++) if (sizes[id] < minSize) small.push(id);
    if (small.length === 0) break;

    const cellsOf = new Map<number, number[]>();
    for (const id of small) cellsOf.set(id, []);
    for (let cell = 0; cell < w * h; cell++) {
      const list = cellsOf.get(labels[cell]);
      if (list) list.push(cell);
    }

    const valueSize = new Map<number, number>();
    for (let cell = 0; cell < w * h; cell++) {
      const v = grid[cell];
      valueSize.set(v, (valueSize.get(v) ?? 0) + 1);
    }

    small.sort((a, b) => sizes[a] - sizes[b]);
    let changed = 0;
    for (const id of small) {
      const cells = cellsOf.get(id);
      if (!cells || cells.length === 0) continue;
      const value = grid[cells[0]];
      const counts = new Map<number, number>();
      for (const cell of cells) {
        const x = cell % w;
        const y = (cell - x) / w;
        const see = (n: number) => {
          if (n < 0 || n >= w * h) return;
          const other = grid[n];
          if (other === value) return;
          counts.set(other, (counts.get(other) ?? 0) + 1);
        };
        see(y > 0 ? cell - w : -1);
        see(y < h - 1 ? cell + w : -1);
        see(x > 0 ? cell - 1 : -1);
        see(x < w - 1 ? cell + 1 : -1);
      }
      let best = -1;
      let bestCount = 0;
      for (const [other, count] of counts) {
        if (
          count > bestCount ||
          (count === bestCount && (valueSize.get(other) ?? 0) > (valueSize.get(best) ?? 0))
        ) {
          best = other;
          bestCount = count;
        }
      }
      if (best < 0) continue;
      if (minContrast > 0 && centers) {
        const a = centers[value - 1];
        const b = centers[best - 1];
        if (a && b) {
          const dr = a[0] - b[0];
          const dg = a[1] - b[1];
          const db = a[2] - b[2];
          if (Math.sqrt(dr * dr + dg * dg + db * db) > minContrast) continue;
        }
      }
      for (const cell of cells) grid[cell] = best;
      valueSize.set(best, (valueSize.get(best) ?? 0) + cells.length);
      valueSize.set(value, Math.max(0, (valueSize.get(value) ?? 0) - cells.length));
      merged += cells.length;
      changed++;
    }
    if (changed === 0) break;
  }
  return merged;
}

/* -------------------------------------------------------- HD quantization */

export interface QuantizeResult {
  /** 1-based palette indices, w*h cells (0 is reserved for paper). */
  grid: Int32Array;
  /** RGB centers aligned so palette[i] ↔ grid value i+1. */
  palette: number[][];
  usedColors: number;
}

/**
 * Quantize a rasterized canvas into a paint-by-number grid: median-cut to
 * `colorTarget` boxes, nearest-center assignment, small-region cleanup,
 * compaction and a luminance sort so the palette bar reads as a smooth ramp.
 * The retry ladder may raise the box count when cleanup leaves too few
 * colours, but never past `maxColors`.
 */
export function quantizeCanvas(
  cv: FloatCanvas,
  {
    colorTarget = 170,
    minSize = 4,
    minColors = 100,
    maxColors = 256,
    minContrast = 0,
  }: { colorTarget?: number; minSize?: number; minColors?: number; maxColors?: number; minContrast?: number } = {},
): QuantizeResult {
  const { w, h } = cv;
  const pixels: number[][] = new Array(w * h);
  for (let i = 0; i < w * h; i++) {
    pixels[i] = [cv.data[i * 3], cv.data[i * 3 + 1], cv.data[i * 3 + 2]];
  }
  const maxK = Math.max(2, maxColors);
  let k = colorTarget;
  let grid = new Int32Array(w * h);
  let palette: number[][] = [];
  // Try increasing k until at least minColors survive region cleanup. Growth
  // is clamped to maxK: a palette ceiling is a promise, not a suggestion.
  for (let attempt = 0; attempt < 4; attempt++) {
    const centers = medianCut(pixels, k);
    grid = new Int32Array(w * h);
    for (let cell = 0; cell < w * h; cell++) {
      const p = [cv.data[cell * 3], cv.data[cell * 3 + 1], cv.data[cell * 3 + 2]];
      let best = 0;
      let bestDist = Infinity;
      for (let c = 0; c < centers.length; c++) {
        const d = colorDist(p, centers[c]);
        if (d < bestDist) {
          bestDist = d;
          best = c;
        }
      }
      grid[cell] = best + 1; // 1-based; 0 stays reserved for paper
    }
    mergeSmallRegions(grid, w, h, minSize, { centers, minContrast });
    // Compact: drop unused indices, re-index 1..N.
    const remap = new Int32Array(centers.length + 1).fill(-1);
    let next = 1;
    for (let cell = 0; cell < w * h; cell++) {
      if (remap[grid[cell]] < 0) remap[grid[cell]] = next++;
      grid[cell] = remap[grid[cell]];
    }
    const used = next - 1;
    const finalPalette: number[][] = new Array(used);
    for (let c = 0; c < centers.length; c++) {
      if (remap[c + 1] > 0) finalPalette[remap[c + 1] - 1] = centers[c];
    }
    palette = finalPalette;
    if (used >= minColors || k >= maxK) break;
    k = Math.min(maxK, Math.round(k * 1.5));
  }
  // Sort palette by luminance so the palette bar reads as a smooth ramp.
  const order = palette
    .map((rgb, i) => ({ rgb, i, lum: 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2] }))
    .sort((a, b) => a.lum - b.lum);
  const remap = new Int32Array(palette.length + 1);
  order.forEach((entry, rank) => {
    remap[entry.i + 1] = rank + 1;
  });
  for (let cell = 0; cell < w * h; cell++) grid[cell] = remap[grid[cell]];
  const sorted = order.map((entry) => entry.rgb);
  return { grid, palette: sorted, usedColors: sorted.length };
}

/* ------------------------------------------------------------- encoders */

/** RLE-encode rows (schema 2): 2 base-36 chars index + 2 base-36 chars run. */
export function rleEncodeRows(grid: Int32Array, w: number, h: number): string[] {
  const tok = (i: number, n: number) => i.toString(36).padStart(2, '0') + n.toString(36).padStart(2, '0');
  const rows: string[] = [];
  for (let y = 0; y < h; y++) {
    let row = '';
    let x = 0;
    while (x < w) {
      const index = grid[y * w + x];
      let end = x + 1;
      while (end < w && grid[y * w + end] === index) end++;
      row += tok(index, end - x);
      x = end;
    }
    rows.push(row);
  }
  return rows;
}

/* ---------------------------------------------------- photo-specific steps */

/**
 * Settings shared by the DOM wrapper and the pure pipeline.
 *
 * 256² is deliberately the photo size while built-in scenes stay at 128². The
 * point of an import is fidelity: a 293 px portrait on a 128² board averages
 * 2.3 × 2.3 source pixels per cell, which erases eyes, brows and line art
 * before quantization even runs. At 256² the same photo is ~1.15 px/cell —
 * effectively 1:1 — and the face survives. Going further (512²) would only
 * upsample the source, so this is the ceiling that matters.
 */
export const PHOTO_BOARD_SIZE = 256;
export const PHOTO_SUPERSAMPLE = 2;
export const PHOTO_PAPER = '#ffffff'; // board paper is always white (round 10)
export const PHOTO_OUTLINE = '#2b2620';

/**
 * Derive the board paper from the photo itself — the same trick every
 * built-in scene uses (each scene paints on a mood-matched base tone). The
 * average palette color is desaturated and pulled to a mid luminance so the
 * uncolored board always reads as a canvas against the page background, no
 * matter whether the photo is a bright sunset or a night shot.
 */
export function derivePaper(palette: readonly number[][]): string {
  let r = 0;
  let g = 0;
  let b = 0;
  for (const c of palette) {
    r += c[0];
    g += c[1];
    b += c[2];
  }
  const n = Math.max(1, palette.length);
  r /= n;
  g /= n;
  b /= n;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  // Desaturate 45% toward gray, then scale to a mid tone (≈ 118 luminance).
  const k = 0.45;
  const scale = Math.min(2.2, Math.max(0.55, 118 / Math.max(1, lum)));
  const ch = (c: number) => {
    const gray = lum * k + c * (1 - k);
    return Math.max(30, Math.min(225, Math.round(gray * scale)));
  };
  return rgbToHex([ch(r), ch(g), ch(b)]);
}

export interface PhotoPipelineResult {
  grid: Int32Array;
  hexPalette: string[];
  usedColors: number;
  regions: number;
  size: number;
}

/**
 * Pure core: value-noise pass + quantization + RLE on an already-rasterized
 * float canvas. Deterministic for a given (canvas, seed) pair.
 */
export function buildPhotoGrid(cv: FloatCanvas, seed: number): PhotoPipelineResult {
  // Photos keep their own settings and must NOT inherit the built-in scene
  // retune. The board is 256² (see PHOTO_BOARD_SIZE) and three things matter:
  //
  //  1. A 24-cell floor removes gradient dither, but a *contrast* guard (40 in
  //     RGB) refuses to merge small regions that sit on a real edge. Without
  //     it a global floor eats eyes, brows and line art first — they are small
  //     precisely because they are detail — and the face turns into a pale slab.
  //  2. Median cut splits by error, not by size, so the huge flat background
  //     stops consuming palette entries that skin and hair gradients need.
  //  3. A very light noise pass (2) keeps region borders organic; 4 and 8 both
  //     seeded visible streaks at this cell size without adding detail.
  //
  // Measured on a 293 px portrait:
  //   128², 130 boxes, 5-cell floor, size-only merge
  //     -> 94 colours, 356 regions, face unreadable (the reported blur)
  //   256², 48 boxes, 24-cell floor, size-only merge
  //     -> 44 colours, 339 regions, face still a slab
  //   256², 48 boxes, 24-cell floor, contrast guard (shipped)
  //     -> 47 colours, 1178 regions, eyes/brows/nose/hair all legible
  // The region count is the honest price of a legible photo: structure is made
  // of many small regions, and each one is a single tap with the fill tool. The
  // review screen shows the count so that trade stays visible.
  const noise = makeNoise(seed);
  texturePass(cv, noise, 2, 0.05);
  const { grid, palette, usedColors } = quantizeCanvas(cv, {
    colorTarget: 48,
    minSize: 24,
    minColors: 32,
    maxColors: 64,
    minContrast: 40,
  });
  const hexPalette = [derivePaper(palette), ...palette.map(rgbToHex)];
  return {
    grid,
    hexPalette,
    usedColors,
    regions: countRegions(grid, cv.w, cv.h),
    size: cv.w,
  };
}

/**
 * Cheap content hash over sampled pixels so the same photo always converts
 * to the same board (idempotent imports, stable previews).
 */
export function hashCanvas(cv: FloatCanvas): number {
  let h = 2166136261;
  const stride = Math.max(3, Math.floor((cv.w * cv.h) / 4096)) * 3;
  for (let i = 0; i < cv.data.length; i += stride) {
    const v = cv.data[i] * 3 + cv.data[i + 1] * 5 + cv.data[i + 2] * 7;
    h = Math.imul(h ^ (v | 0), 16777619);
  }
  return h >>> 0;
}

/* ------------------------------------------------------------- DOM helpers */

const yieldToUi = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** Center-crop a source image to a square and rasterize it at supersample. */
export function rasterizeToSquare(source: CanvasImageSource, size: number, supersample: number): FloatCanvas {
  const srcW = (source as HTMLImageElement).naturalWidth || (source as ImageBitmap).width || 0;
  const srcH = (source as HTMLImageElement).naturalHeight || (source as ImageBitmap).height || 0;
  if (!srcW || !srcH) throw new Error('The image has no pixels to read');
  const canvas = document.createElement('canvas');
  canvas.width = size * supersample;
  canvas.height = size * supersample;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D is unavailable in this browser');
  // Cover-fit center crop: fill the square with the image, clipping overflow.
  const side = Math.min(srcW, srcH);
  const sx = (srcW - side) / 2;
  const sy = (srcH - side) / 2;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, sx, sy, side, side, 0, 0, canvas.width, canvas.height);
  return canvasFromImageData(ctx.getImageData(0, 0, canvas.width, canvas.height));
}

/** Decode a user-selected file into a drawable source (EXIF-aware). */
export async function loadImageSource(file: File): Promise<CanvasImageSource> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      /* fall through to <img> decoding */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('This file could not be read as an image'));
      img.src = url;
    });
    return img;
  } finally {
    // The bitmap is fully decoded once loaded; revoke on the next tick.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

/** Small JPEG snapshot of the source photo (stored with the artwork record). */
export function sourceThumbnailDataUrl(source: CanvasImageSource, max = 256): string {
  const srcW = (source as HTMLImageElement).naturalWidth || (source as ImageBitmap).width || 0;
  const srcH = (source as HTMLImageElement).naturalHeight || (source as ImageBitmap).height || 0;
  if (!srcW || !srcH) return '';
  const scale = Math.min(1, max / Math.max(srcW, srcH));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(srcW * scale));
  canvas.height = Math.max(1, Math.round(srcH * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.72);
}

/** Render the finished paint-by-number target as a crisp PNG data URL. */
export function renderPreviewDataUrl(
  grid: Int32Array,
  hexPalette: string[],
  w: number,
  h: number,
  scale = 2,
): string {
  const canvas = document.createElement('canvas');
  canvas.width = w * scale;
  canvas.height = h * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.fillStyle = hexPalette[0];
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < h; y++) {
    let x = 0;
    while (x < w) {
      const index = grid[y * w + x];
      let end = x + 1;
      while (end < w && grid[y * w + end] === index) end++;
      ctx.fillStyle = hexPalette[index];
      ctx.fillRect(x * scale, y * scale, (end - x) * scale, scale);
      x = end;
    }
  }
  return canvas.toDataURL('image/png');
}

/* --------------------------------------------------------- full conversion */

export interface ConvertOptions {
  id: string;
  title: string;
}

export interface ConvertedArtwork {
  manifest: ArtworkManifest;
  previewDataUrl: string;
  sourceDataUrl: string;
  usedColors: number;
  regions: number;
}

/**
 * Full photo → artwork conversion. Yields to the UI between stages so the
 * processing spinner stays animated on the main thread. Throws with a
 * user-presentable message on failure. The manifest is always exactly
 * PHOTO_BOARD_SIZE² (256×256 since round 12; scenes stay at 128²).
 */
export async function convertPhotoToArtwork(source: CanvasImageSource, options: ConvertOptions): Promise<ConvertedArtwork> {
  await yieldToUi();
  const raster = rasterizeToSquare(source, PHOTO_BOARD_SIZE, PHOTO_SUPERSAMPLE);
  // Reduce the supersample so the board is exactly PHOTO_BOARD_SIZE² —
  // parity with the Node pipeline (this step was missing pre-round 9, which
  // made imports quantize the raw 2× raster and land 2× oversized).
  const cv = boxDownsample(raster, PHOTO_SUPERSAMPLE);
  await yieldToUi();
  const result = buildPhotoGrid(cv, hashCanvas(raster));
  if (result.usedColors < 2) {
    throw new Error('This photo is too flat to turn into a coloring page');
  }
  // Review round 10: the board's paper is always white, never a color sampled
  // from the photo — uncolored cells, previews and the manifest paper all stay
  // in sync through hexPalette[0].
  result.hexPalette[0] = PHOTO_PAPER;
  await yieldToUi();
  const manifest: ArtworkManifest = {
    id: options.id,
    title: options.title,
    schemaVersion: 2,
    contentVersion: 1,
    width: result.size,
    height: result.size,
    paperColor: PHOTO_PAPER,
    outlineColor: PHOTO_OUTLINE,
    palette: result.hexPalette,
    rle: rleEncodeRows(result.grid, result.size, result.size),
  };
  // Safety net: the stored record must always open in the coloring page.
  const validated = validateManifest(manifest);
  if (!validated.ok) {
    throw new Error(`The generated picture failed validation: ${validated.reason}`);
  }
  const previewDataUrl = renderPreviewDataUrl(result.grid, result.hexPalette, result.size, result.size, 2);
  if (!previewDataUrl) throw new Error('The preview could not be rendered in this browser');
  return {
    manifest,
    previewDataUrl,
    sourceDataUrl: sourceThumbnailDataUrl(source),
    usedColors: result.usedColors,
    regions: result.regions,
  };
}
