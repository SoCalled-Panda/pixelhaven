/**
 * PixelHaven PBN library — procedural high-fidelity paint-by-number pipeline.
 *
 * Scenes are RASTERIZED into a floating-point RGB buffer at 2× supersample,
 * box-downsampled (free anti-aliasing), then quantized to a 100-200 color
 * palette with median-cut + nearest assignment. A light value-noise pass
 * before quantization gives region borders an organic, painterly wobble
 * instead of sterile vector edges. Regions smaller than a few pixels are
 * merged into their dominant neighbor so the board stays playable.
 *
 * Everything is pure math on typed arrays — no canvas, no dependencies.
 */

/* ------------------------------------------------------------ color utils */

export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

export function rgbToHex([r, g, b]) {
  const c = (v) => Math.max(0, Math.min(255, Math.round(v)))
    .toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Perceptual-ish RGB distance (higher weight on green, as in luminance). */
function colorDist(a, b) {
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return 2 * dr * dr + 4 * dg * dg + 3 * db * db;
}

export function mix(c0, c1, t) {
  return [
    c0[0] + (c1[0] - c0[0]) * t,
    c0[1] + (c1[1] - c0[1]) * t,
    c0[2] + (c1[2] - c0[2]) * t,
  ];
}

/* ------------------------------------------------------- float RGB canvas */

export function createCanvas(w, h) {
  return { w, h, data: new Float32Array(w * h * 3) };
}

export function setPx(cv, x, y, rgb) {
  if (x < 0 || y < 0 || x >= cv.w || y >= cv.h) return;
  const i = (y * cv.w + x) * 3;
  cv.data[i] = rgb[0];
  cv.data[i + 1] = rgb[1];
  cv.data[i + 2] = rgb[2];
}

export function getPx(cv, x, y) {
  const i = (y * cv.w + x) * 3;
  return [cv.data[i], cv.data[i + 1], cv.data[i + 2]];
}

/** Blend `rgb` over the pixel with alpha 0..1 (for glows and soft light). */
export function blendPx(cv, x, y, rgb, alpha) {
  if (x < 0 || y < 0 || x >= cv.w || y >= cv.h) return;
  const i = (y * cv.w + x) * 3;
  cv.data[i] += (rgb[0] - cv.data[i]) * alpha;
  cv.data[i + 1] += (rgb[1] - cv.data[i + 1]) * alpha;
  cv.data[i + 2] += (rgb[2] - cv.data[i + 2]) * alpha;
}

/** Multi-stop vertical gradient. stops: [[t, rgb], ...] with t in 0..1. */
export function vGradient(cv, y0, y1, stops) {
  for (let y = Math.max(0, Math.ceil(y0)); y < Math.min(cv.h, y1); y++) {
    const t = (y - y0) / Math.max(1, y1 - y0);
    let c = stops[stops.length - 1][1];
    for (let s = 0; s < stops.length - 1; s++) {
      if (t <= stops[s + 1][0]) {
        const local = (t - stops[s][0]) / Math.max(1e-6, stops[s + 1][0] - stops[s][0]);
        c = mix(stops[s][1], stops[s + 1][1], Math.max(0, Math.min(1, local)));
        break;
      }
    }
    for (let x = 0; x < cv.w; x++) setPx(cv, x, y, c);
  }
}

/** Soft radial glow with quadratic falloff (no visible rings). */
export function radialGlow(cv, cx, cy, radius, rgb, strength) {
  const x0 = Math.max(0, Math.floor(cx - radius));
  const x1 = Math.min(cv.w - 1, Math.ceil(cx + radius));
  const y0 = Math.max(0, Math.floor(cy - radius));
  const y1 = Math.min(cv.h - 1, Math.ceil(cy + radius));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const d = Math.hypot(x - cx, y - cy) / radius;
      if (d >= 1) continue;
      const falloff = (1 - d * d) * (1 - d * d);
      blendPx(cv, x, y, rgb, falloff * strength);
    }
  }
}

/** Full radial gradient: c0 at the center easing to c1 at `radius`. */
export function radialGradient(cv, cx, cy, radius, c0, c1) {
  for (let y = 0; y < cv.h; y++) {
    for (let x = 0; x < cv.w; x++) {
      const d = Math.min(1, Math.hypot(x - cx, y - cy) / radius);
      setPx(cv, x, y, mix(c0, c1, d));
    }
  }
}

export function fillEllipse(cv, cx, cy, rx, ry, rgb) {
  for (let y = Math.max(0, Math.ceil(cy - ry)); y <= Math.min(cv.h - 1, cy + ry); y++) {
    for (let x = Math.max(0, Math.ceil(cx - rx)); x <= Math.min(cv.w - 1, cx + rx); x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) setPx(cv, x, y, rgb);
    }
  }
}

export function fillRect(cv, x0, y0, w, h, rgb) {
  for (let y = Math.max(0, y0); y < Math.min(cv.h, y0 + h); y++) {
    for (let x = Math.max(0, x0); x < Math.min(cv.w, x0 + w); x++) {
      setPx(cv, x, y, rgb);
    }
  }
}

/** Even-odd scanline polygon fill. points: [[x,y], ...] */
export function fillPolygon(cv, points, rgb) {
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const [, py] of points) {
    y0 = Math.min(y0, py);
    y1 = Math.max(y1, py);
  }
  for (let y = Math.max(0, Math.ceil(y0)); y <= Math.min(cv.h - 1, y1); y++) {
    const xs = [];
    for (let i = 0; i < points.length; i++) {
      const [ax, ay] = points[i];
      const [bx, by] = points[(i + 1) % points.length];
      if ((ay <= y && by > y) || (by <= y && ay > y)) {
        xs.push(ax + ((y - ay) / (by - ay)) * (bx - ax));
      }
    }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      for (let x = Math.max(0, Math.ceil(xs[k])); x <= Math.min(cv.w - 1, xs[k + 1]); x++) {
        setPx(cv, x, y, rgb);
      }
    }
  }
}

/** Cubic Bézier sampled to a polygon (helper for ridges, ribbons, waves). */
export function quadPoints(p0, p1, p2, p3, steps = 24) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    pts.push([
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ]);
  }
  return pts;
}

/* ------------------------------------------------------------- value noise */

/** Deterministic value noise (2 octaves) for organic region borders. */
export function makeNoise(seed) {
  const PERM = 512;
  const rand = mulberry(seed);
  const table = new Float32Array(PERM);
  for (let i = 0; i < PERM; i++) table[i] = rand();
  const at = (x, y) => table[(((x * 73 + y * 149) % PERM) + PERM) % PERM];
  const smooth = (t) => t * t * (3 - 2 * t);
  const noise2 = (x, y) => {
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

export function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Perturb every pixel by smooth noise so quantized regions get painterly,
 * organic borders instead of ruler-straight band edges. `amount` is in
 * RGB units (e.g. 10 = subtle, 24 = strong brush feel).
 */
export function texturePass(cv, noise, amount, scale = 0.06) {
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

/* ------------------------------------------------------------ downsampling */

/** Integer box downsample — doubles as anti-aliasing for 2× supersampled art. */
export function boxDownsample(cv, factor) {
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

/* --------------------------------------------------------------- quantizer */

/** Median-cut quantization of the canvas pixels into k boxes. */
function medianCut(pixels, k) {
  let boxes = [pixels];
  while (boxes.length < k) {
    let widest = -1;
    let widen = -1;
    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i];
      if (box.length < 2) continue;
      const ranges = boxRange(box);
      const spread = Math.max(ranges[0], ranges[1], ranges[2]);
      if (spread > widen) {
        widen = spread;
        widest = i;
      }
    }
    if (widest < 0) break;
    const box = boxes[widest];
    const ranges = boxRange(box);
    const axis = ranges[0] >= ranges[1] && ranges[0] >= ranges[2] ? 0 : ranges[1] >= ranges[2] ? 1 : 2;
    box.sort((a, b) => a[axis] - b[axis]);
    const mid = box.length >> 1;
    boxes = [...boxes.slice(0, widest), box.slice(0, mid), box.slice(mid), ...boxes.slice(widest + 1)];
  }
  return boxes
    .filter((box) => box.length > 0)
    .map((box) => {
      let r = 0;
      let g = 0;
      let b = 0;
      for (const p of box) {
        r += p[0];
        g += p[1];
        b += p[2];
      }
      return [r / box.length, g / box.length, b / box.length];
    });
}

function boxRange(box) {
  let rmin = Infinity;
  let rmax = -Infinity;
  let gmin = Infinity;
  let gmax = -Infinity;
  let bmin = Infinity;
  let bmax = -Infinity;
  for (const p of box) {
    rmin = Math.min(rmin, p[0]);
    rmax = Math.max(rmax, p[0]);
    gmin = Math.min(gmin, p[1]);
    gmax = Math.max(gmax, p[1]);
    bmin = Math.min(bmin, p[2]);
    bmax = Math.max(bmax, p[2]);
  }
  return [rmax - rmin, gmax - gmin, bmax - bmin];
}

/* -------------------------------------------------------- region utilities */

/** Label 4-connected regions of equal index. Returns label grid + sizes. */
function labelRegions(grid, w, h) {
  const labels = new Int32Array(w * h).fill(-1);
  const sizes = [];
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
      const visit = (n) => {
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

/** Merge regions smaller than minSize into their dominant neighbor region. */
export function mergeSmallRegions(grid, w, h, minSize) {
  const { labels, sizes } = labelRegions(grid, w, h);
  // Value per region label (labels are static while we only rewrite grid).
  const labelValue = new Int32Array(sizes.length);
  for (let cell = 0; cell < w * h; cell++) labelValue[labels[cell]] = grid[cell];

  let merged = 0;
  for (let cell = 0; cell < w * h; cell++) {
    const label = labels[cell];
    if (sizes[label] >= minSize) continue;
    const x = cell % w;
    const y = (cell - x) / w;
    const counts = new Map();
    const see = (n) => {
      if (n < 0 || n >= w * h || labels[n] === label) return;
      counts.set(labels[n], (counts.get(labels[n]) ?? 0) + 1);
    };
    see(y > 0 ? cell - w : -1);
    see(y < h - 1 ? cell + w : -1);
    see(x > 0 ? cell - 1 : -1);
    see(x < w - 1 ? cell + 1 : -1);
    let best = -1;
    let bestCount = 0;
    for (const [labelId, count] of counts) {
      if (
        count > bestCount ||
        (count === bestCount && best >= 0 && labelValue[labelId] === labelValue[best] && sizes[labelId] > sizes[best])
      ) {
        best = labelId;
        bestCount = count;
      }
    }
    if (best >= 0) {
      grid[cell] = labelValue[best];
      merged++;
    }
  }
  return merged;
}

/* ------------------------------------------------------- full HD pipeline */

/**
 * Quantize a supersampled canvas into a paint-by-number grid.
 * Returns { grid: Int32Array (1-based indices, w*h), palette: [hex...1-based aligned], usedColors }.
 * palette[0] (paper) must be prepended by the caller.
 */
export function quantizeCanvas(cv, { colorTarget = 170, minSize = 4, minColors = 100, maxColors = 200 } = {}) {
  const { w, h } = cv;
  const pixels = [];
  for (let i = 0; i < w * h; i++) {
    pixels.push([cv.data[i * 3], cv.data[i * 3 + 1], cv.data[i * 3 + 2]]);
  }
  let k = colorTarget;
  let grid = null;
  let palette = null;
  // Try increasing k until at least minColors survive region cleanup.
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
    mergeSmallRegions(grid, w, h, minSize);
    // Compact: drop unused indices, re-index 1..N.
    const remap = new Int32Array(centers.length + 1).fill(-1);
    let next = 1;
    for (let cell = 0; cell < w * h; cell++) {
      if (remap[grid[cell]] < 0) remap[grid[cell]] = next++;
      grid[cell] = remap[grid[cell]];
    }
    const used = next - 1;
    const finalPalette = new Array(used);
    for (let c = 0; c < centers.length; c++) {
      if (remap[c + 1] > 0) finalPalette[remap[c + 1] - 1] = centers[c];
    }
    palette = finalPalette;
    if (used >= minColors || k > 400) break;
    k = Math.round(k * 1.5);
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
export function rleEncodeRows(grid, w, h) {
  const tok = (i, n) => i.toString(36).padStart(2, '0') + n.toString(36).padStart(2, '0');
  const rows = [];
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

/** RLE-run preview SVG (same style as the classic set, from the final grid). */
export function renderHdPreviewSvg(grid, palette, w, h, paperColor, scale = 3) {
  const rects = [];
  for (let y = 0; y < h; y++) {
    let x = 0;
    while (x < w) {
      const index = grid[y * w + x];
      let end = x + 1;
      while (end < w && grid[y * w + end] === index) end++;
      rects.push(
        `<rect x="${x * scale}" y="${y * scale}" width="${(end - x) * scale}" height="${scale}" fill="${palette[index]}"/>`,
      );
      x = end;
    }
  }
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w * scale} ${h * scale}" shape-rendering="crispEdges">`,
    `<rect width="${w * scale}" height="${h * scale}" fill="${paperColor}"/>`,
    ...rects,
    '</svg>',
    '',
  ].join('\n');
}
