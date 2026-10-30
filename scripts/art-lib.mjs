/**
 * PixelHaven art library v6 — raster DSL for 128×128 paint-by-number scenes.
 *
 * Pipeline per scene:
 *   1. scene()        paints SOLID regions (palette indices, 0 = paper)
 *   2. outlineSilhouette() + outlineRegions(groups)  — coloring-book line art
 *   3. decorate()     crisp/atmospheric touches AFTER line art so tiny
 *                     details (stars, rain, petals) are never outlined and
 *                     gradients stay smooth dither fields instead of lines.
 *
 * "Material groups": indices that belong to the same physical material
 * (e.g. 6 shades of one sky) never get outlines between them — only
 * boundaries between DIFFERENT materials do.
 *
 * v6 quality rules (review round 4):
 *   - Gradients render as SOLID tone bands with a narrow (~30%) dithered
 *     transition — full-surface Bayer noise is what made v5 read as sandpaper.
 *   - radialGlow falls off quadratically with an 8×8 matrix: no more halo rings.
 *   - cloudShape()  : flat-bottom cumulus with dithered underside shade.
 *   - palmTree()    : curved tapered trunk, ring shading, 7 drooping fronds.
 */

export const SIZE = 256;
export const SCALE = 2;
export const PAPER = 0;
export const OUTLINE = -1;

/* --------------------------------------------------------- color utils */

export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

export function rgbToHex([r, g, b]) {
  const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Linear mix of two hex colors, t in [0,1]. */
export function mix(a, b, t) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return rgbToHex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
}

/** Evenly spaced n-step ramp from a to b (inclusive). */
export function ramp(a, b, n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(mix(a, b, n === 1 ? 1 : i / (n - 1)));
  return out;
}

/** Lighten (f > 0) toward white or darken (f < 0) toward black. */
export function shade(hex, f) {
  const target = f >= 0 ? [255, 255, 255] : [0, 0, 0];
  return mix(hex, rgbToHex(target), Math.abs(f));
}

/* ------------------------------------------------------------ grid DSL */

export function makeGrid() {
  return new Int16Array(SIZE * SIZE);
}

export function setPx(g, x, y, v) {
  x *= SCALE; y *= SCALE;
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
  g[y * SIZE + x] = v;
}

export function getPx(g, x, y) {
  x *= SCALE; y *= SCALE;
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return undefined;
  return g[y * SIZE + x];
}

export function fillRect(g, x, y, w, h, v) {
  for (let row = y; row < y + h; row++) {
    for (let col = x; col < x + w; col++) setPx(g, col, row, v);
  }
}

export function hline(g, x0, x1, y, v) {
  for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) setPx(g, x, y, v);
}

export function vline(g, x, y0, y1, v) {
  for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) setPx(g, x, y, v);
}

/** Bresenham line. */
export function line(g, x0, y0, x1, y1, v) {
  let dx = Math.abs(x1 - x0);
  let dy = -Math.abs(y1 - y0);
  let sx = x0 < x1 ? 1 : -1;
  let sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    setPx(g, x0, y0, v);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
  }
}

export function fillCircle(g, cx, cy, r, v) {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r * r + r * 0.6) setPx(g, x, y, v);
    }
  }
}

export function fillEllipse(g, cx, cy, rx, ry, v) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const nx = (x - cx) / (rx + 0.4);
      const ny = (y - cy) / (ry + 0.4);
      if (nx * nx + ny * ny <= 1) setPx(g, x, y, v);
    }
  }
}

/** Triangle pointing up: apex (cx, ay), base half-width hw at y = by. */
export function fillTriangleUp(g, cx, ay, hw, by, v) {
  const h = by - ay;
  for (let i = 0; i <= h; i++) {
    const half = Math.round((hw * i) / h);
    const y = ay + i;
    hline(g, cx - half, cx + half, y, v);
  }
}

/** Even-odd scanline polygon fill. pts: [[x,y],...]. */
export function fillPolygon(g, pts, v) {
  const ys = pts.map((p) => p[1]);
  const y0 = Math.max(0, Math.floor(Math.min(...ys)));
  const y1 = Math.min(SIZE - 1, Math.ceil(Math.max(...ys)));
  for (let y = y0; y <= y1; y++) {
    const xs = [];
    for (let i = 0; i < pts.length; i++) {
      const [xa, ya] = pts[i];
      const [xb, yb] = pts[(i + 1) % pts.length];
      if (ya === yb) continue;
      if (y >= Math.min(ya, yb) && y < Math.max(ya, yb)) {
        xs.push(xa + ((y - ya) * (xb - xa)) / (yb - ya));
      }
    }
    xs.sort((p, q) => p - q);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      hline(g, Math.round(xs[i]), Math.round(xs[i + 1]), y, v);
    }
  }
}

/* ------------------------------------------------- outline (line art) */

/**
 * Coloring-book silhouette: any colorable cell touching paper gets fixed
 * dark outline. Out-of-bounds counts as "not paper" so full-bleed skies
 * don't grow a border frame.
 */
export function outlineSilhouette(g) {
  const edges = [];
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const v = getPx(g, x, y);
      if (v <= 0) continue;
      if (
        getPx(g, x - 1, y) === PAPER ||
        getPx(g, x + 1, y) === PAPER ||
        getPx(g, x, y - 1) === PAPER ||
        getPx(g, x, y + 1) === PAPER
      ) {
        edges.push([x, y]);
      }
    }
  }
  for (const [x, y] of edges) setPx(g, x, y, OUTLINE);
}

/**
 * Outline boundaries between DIFFERENT materials only. `groups` is an array
 * of arrays of palette indices that belong to one material (shades of the
 * same sky / same object never outline each other). Indices not listed form
 * their own singleton group — i.e. default = outline on every change (v3
 * behaviour).
 */
export function outlineRegions(g, groups = []) {
  const groupOf = new Map();
  groups.forEach((members, gi) => members.forEach((idx) => groupOf.set(idx, gi)));
  const marks = [];
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const v = getPx(g, x, y);
      if (v <= 0) continue;
      const r = getPx(g, x + 1, y);
      const d = getPx(g, x, y + 1);
      const same = (a, b) => a !== undefined && b !== undefined && a > 0 && b > 0 && groupOf.get(a) === groupOf.get(b);
      if ((r !== undefined && r > 0 && !same(v, r)) || (d !== undefined && d > 0 && !same(v, d))) {
        marks.push([x, y]);
      }
    }
  }
  for (const [x, y] of marks) setPx(g, x, y, OUTLINE);
}

/* ------------------------------------------------- dithering & texture */

/** Classic 4×4 Bayer threshold matrix scaled to 0..1 (coarse texture). */
export const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
].map((row) => row.map((v) => (v + 0.5) / 16));

const bayer = (x, y) => BAYER[y & 3][x & 3];

/** 8×8 Bayer matrix — much smoother gradients, ideal for skies/water. */
export const BAYER8 = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
].map((row) => row.map((v) => (v + 0.5) / 64));

const bayer8 = (x, y) => BAYER8[y & 7][x & 7];

/**
 * Softens the boundaries between vertical SOLID bands (painted in the scene
 * phase) with 2 graduated dither rows per side. Only cells currently holding
 * one of the two adjacent band colors are touched — anything painted over the
 * gradient (towers, clouds, suns, frames) and line art is preserved. Call in
 * the DECORATE phase.
 *
 * idxs: palette indices top→bottom. `fracs`: optional normalized heights.
 */
function ditherBandRow(g, x0, x1, y, a, b, p) {
  for (let x = x0; x <= x1; x++) {
    const v = getPx(g, x, y);
    if (v === a || v === b) setPx(g, x, y, bayer(x, y) < p ? b : a);
  }
}

export function gradBands(g, x0, x1, y0, y1, idxs, fracs = null) {
  const n = idxs.length;
  const H = y1 - y0;
  const w = fracs ?? Array.from({ length: n }, () => 1 / n);
  let y = y0;
  for (let i = 0; i < n; i++) {
    const bh = Math.max(1, Math.round(H * w[i]));
    if (i > 0) {
      ditherBandRow(g, x0, x1, y, idxs[i - 1], idxs[i], 0.3);
      ditherBandRow(g, x0, x1, Math.min(y + 1, y1 - 1), idxs[i - 1], idxs[i], 0.65);
    }
    if (i < n - 1) {
      ditherBandRow(g, x0, x1, y + bh - 2, idxs[i], idxs[i + 1], 0.35);
      ditherBandRow(g, x0, x1, y + bh - 1, idxs[i], idxs[i + 1], 0.7);
    }
    y += bh;
  }
}

/**
 * TRUE vertical gradient through `idxs` (top→bottom). v6 style: each pixel
 * picks the NEAREST stop color (solid bands) and only the middle 30% of each
 * transition band is dithered — smooth boundaries, zero full-surface noise.
 * Paints only cells whose current value passes `ok(v)`.
 * `phase` shifts sampling vertically for variety between scenes.
 */
export function vGradient(g, x0, x1, y0, y1, idxs, ok = (v) => v === 0, phase = 0) {
  x0 *= SCALE; x1 *= SCALE; y0 *= SCALE; y1 *= SCALE;
  const n = idxs.length - 1;
  if (n < 1) throw new Error('vGradient needs >= 2 indices');
  for (let y = y0; y <= y1; y++) {
    const t = ((y - y0) / (y1 - y0)) * n + phase;
    const i = Math.min(n - 1, Math.max(0, Math.floor(t)));
    const f = Math.min(1, Math.max(0, t - i));
    const lo = idxs[i];
    const hi = idxs[i + 1];
    // dither probability: 0 below 0.35, linear to 1 at 0.65, solid hi above
    const p = f < 0.35 ? 0 : f > 0.65 ? 1 : (f - 0.35) / 0.3;
    for (let x = x0; x <= x1; x++) {
      const v = getPx(g, x, y);
      if (v === undefined || !ok(v)) continue;
      setPx(g, x, y, bayer8(x, y) < p ? hi : lo);
    }
  }
}

/**
 * Horizontal gradient (sunrises over water, lit walls). Same contract and
 * v6 solid-band + narrow-dither behaviour as vGradient but sampling along x.
 */
export function hGradient(g, x0, x1, y0, y1, idxs, ok = (v) => v === 0) {
  x0 *= SCALE; x1 *= SCALE; y0 *= SCALE; y1 *= SCALE;
  const n = idxs.length - 1;
  if (n < 1) throw new Error('hGradient needs >= 2 indices');
  for (let x = x0; x <= x1; x++) {
    const t = ((x - x0) / (x1 - x0)) * n;
    const i = Math.min(n - 1, Math.max(0, Math.floor(t)));
    const f = Math.min(1, Math.max(0, t - i));
    const lo = idxs[i];
    const hi = idxs[i + 1];
    const p = f < 0.35 ? 0 : f > 0.65 ? 1 : (f - 0.35) / 0.3;
    for (let y = y0; y <= y1; y++) {
      const v = getPx(g, x, y);
      if (v === undefined || !ok(v)) continue;
      setPx(g, x, y, bayer8(x, y) < p ? hi : lo);
    }
  }
}

/**
 * Soft dithered cast shadow / shading blob. Quadratic falloff so the core is
 * dense and the edge feathers away — gentle ambient occlusion under objects.
 * Only recolors cells whose value passes `ok(v)`.
 */
export function ditherShadow(g, cx, cy, rx, ry, shadowIdx, ok) {
  cx *= SCALE; cy *= SCALE; rx *= SCALE; ry *= SCALE;
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const nx = (x - cx) / rx;
      const ny = (y - cy) / ry;
      const d = nx * nx + ny * ny;
      if (d > 1) continue;
      const v = getPx(g, x, y);
      if (v === undefined || !ok(v)) continue;
      const p = Math.pow(1 - d, 1.4) * 0.85;
      setPx(g, x, y, bayer8(x, y) < p ? shadowIdx : v);
    }
  }
}

/**
 * Rim light: cells of `from` whose neighbor on `dir` side is a DIFFERENT
 * value get dithered `to` highlights — cheap but effective top-lighting.
 * dir: 'up' | 'down' | 'left' | 'right' (side the light comes FROM).
 */
export function rimLight(g, x0, y0, x1, y1, from, to, dir = 'up', strength = 0.8) {
  x0 *= SCALE; y0 *= SCALE; x1 *= SCALE; y1 *= SCALE;
  const dx = dir === 'left' ? -1 : dir === 'right' ? 1 : 0;
  const dy = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (getPx(g, x, y) !== from) continue;
      const n = getPx(g, x + dx, y + dy);
      if (n !== undefined && n === from) continue;
      if (bayer8(x, y) < strength) setPx(g, x, y, to);
    }
  }
}

/** Plus-shaped glints (stars, sun sparkles on water). */
export function sparkle(g, rand, x0, y0, x1, y1, idxs, count) {
  x0 *= SCALE; y0 *= SCALE; x1 *= SCALE; y1 *= SCALE;
  for (let i = 0; i < count; i++) {
    const x = x0 + Math.floor(rand() * (x1 - x0 + 1));
    const y = y0 + Math.floor(rand() * (y1 - y0 + 1));
    const c = idxs[Math.floor(rand() * idxs.length)];
    setPx(g, x, y, c);
    setPx(g, x - 1, y, c);
    setPx(g, x + 1, y, c);
    setPx(g, x, y - 1, c);
    setPx(g, x, y + 1, c);
  }
}

/**
 * Soft radial glow (sun / lamp / moon halo): paints `inner` with a dithered
 * quadratic falloff (8×8 matrix, tighter core) — melts into the sky/wall
 * without eating silhouettes or line art. Only onto cells passing `ok(v)`.
 */
export function radialGlow(g, cx, cy, r, inner, ok) {
  cx *= SCALE; cy *= SCALE; r *= SCALE;
  const r2 = r * r;
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = x - cx;
      const dy = y - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 > r2) continue;
      const v = getPx(g, x, y);
      if (v === undefined || !ok(v)) continue;
      const t = Math.sqrt(d2 / r2);
      if (t < 0.32) {
        setPx(g, x, y, inner);
      } else {
        const q = Math.pow(Math.max(0, 1 - (t - 0.32) / 0.68), 1.8) * 0.9;
        setPx(g, x, y, bayer8(x, y) < q ? inner : v);
      }
    }
  }
}

/** Quadratic bezier curve — palm fronds, dune ridges, wires, waves. */
export function quadCurve(g, x0, y0, cx, cy, x1, y1, v, thickness = 1) {
  const steps = 30;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = (1 - t) * (1 - t);
    const b = 2 * (1 - t) * t;
    const c = t * t;
    const x = Math.round(a * x0 + b * cx + c * x1);
    const y = Math.round(a * y0 + b * cy + c * y1);
    if (thickness <= 1) setPx(g, x, y, v);
    else fillCircle(g, x, y, thickness / 2, v);
  }
}

/** Sparse 1px sprinkle (foam, petals, leaves, snow) within a rect. */
export function sprinkle(g, rand, x0, y0, x1, y1, idxs, count) {
  x0 *= SCALE; y0 *= SCALE; x1 *= SCALE; y1 *= SCALE;
  for (let i = 0; i < count; i++) {
    const x = x0 + Math.floor(rand() * (x1 - x0 + 1));
    const y = y0 + Math.floor(rand() * (y1 - y0 + 1));
    setPx(g, x, y, idxs[Math.floor(rand() * idxs.length)]);
  }
}

/** Horizontal dithered strip between two colors (foam, sand grain). */
export function ditherStrip(g, x0, x1, y, a, b, p = 0.5) {
  x0 *= SCALE; x1 *= SCALE; y *= SCALE;
  for (let x = x0; x <= x1; x++) setPx(g, x, y, bayer(x, y) < p ? a : b);
}

/**
 * Flat-bottom cumulus cloud (v6): light body clipped to a baseline, two side
 * puffs, and a dithered shade hugging the underside. Reads as a real cloud
 * instead of a stack of ellipses.
 */
export function cloudShape(g, cx, baseY, w, h, light, shade) {
  cx *= SCALE; baseY *= SCALE; w *= SCALE; h *= SCALE;
  const rx = Math.max(4, Math.round(w / 2));
  const ry = Math.max(2, Math.round(h));
  const inE = (x, y, ex, ey, erx, ery) => {
    const nx = (x - ex) / erx;
    const ny = (y - ey) / ery;
    return nx * nx + ny * ny <= 1;
  };
  for (let y = Math.max(0, baseY - ry * 2 - 2); y <= baseY; y++) {
    for (let x = cx - rx - 3; x <= cx + rx + 3; x++) {
      const inMain = inE(x, y, cx, baseY - ry, rx, ry);
      const inL = inE(x, y, cx - Math.round(rx * 0.62), baseY - 2, Math.round(rx * 0.55), Math.max(2, Math.round(ry * 0.8)));
      const inR = inE(x, y, cx + Math.round(rx * 0.62), baseY - 2, Math.round(rx * 0.55), Math.max(2, Math.round(ry * 0.8)));
      if (inMain || inL || inR) setPx(g, x, y, light);
    }
  }
  // underside shade, fading toward the center
  for (let x = cx - rx; x <= cx + rx; x++) {
    const t = Math.abs(x - cx) / rx; // 0 center → 1 edge
    if (getPx(g, x, baseY - 1) === light && bayer8(x, baseY - 1) < 0.75 - t * 0.45) {
      setPx(g, x, baseY - 1, shade);
    }
    if (getPx(g, x, baseY - 2) === light && bayer8(x, baseY - 2) < 0.3 - t * 0.26) {
      setPx(g, x, baseY - 2, shade);
    }
  }
}

/**
 * Pixel-art palm tree (v6): tapered curved trunk with ring shading and a
 * crown of 6 arcing fronds that reach out ~0.45× trunk height, arc upward,
 * and droop only slightly at the tips, plus coconuts. Stands on (x0,y0);
 * `lean` is the horizontal drift of the crown; h is trunk height.
 */
export function palmTree(g, x0, y0, h, lean, trunk, trunkDark, leaf, leafLight) {
  x0 *= SCALE; y0 *= SCALE; h *= SCALE; lean *= SCALE;
  const topx = x0 + lean;
  const topy = y0 - h;
  const cxp = x0 + lean * 0.2;
  const cyp = y0 - Math.round(h * 0.6);
  const steps = Math.max(6, h);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = Math.round((1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cxp + t * t * topx);
    const y = Math.round((1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cyp + t * t * topy);
    const half = Math.max(1, Math.round(2.4 - t * 1.6));
    hline(g, x - half, x + half, y, i % 5 < 3 ? trunk : trunkDark);
  }
  // crown center
  fillCircle(g, topx, topy, 2, trunkDark);
  // fronds: [dx, dy] direction pairs — arc out/up, tips droop gently
  const reach = h * 0.45;
  const fronds = [
    [1.0, 0.25], [0.62, -0.55], [0.25, -1.0],
    [-0.25, -1.0], [-0.66, -0.5], [-1.0, 0.2],
  ];
  for (const [fx, fy] of fronds) {
    const ex = topx + Math.round(fx * reach);
    const ey = topy + Math.round(fy * reach * 0.5) + Math.round(h * 0.08);
    const ctrlx = topx + Math.round(fx * reach * 0.45);
    const ctrly = topy + Math.round(fy * reach * 0.45) - Math.round(h * 0.16);
    quadCurve(g, topx, topy, ctrlx, ctrly, ex, ey, leaf, 2);
    // light top edge on upward fronds
    if (fy < 0) quadCurve(g, topx, topy - 1, ctrlx, ctrly - 1, ex, ey - 1, leafLight, 1);
    // leaflet notches along the frond
    for (let s = 0.35; s <= 0.85; s += 0.25) {
      const a = (1 - s) * (1 - s);
      const b = 2 * (1 - s) * s;
      const c = s * s;
      const lx = Math.round(a * topx + b * ctrlx + c * ex);
      const ly = Math.round(a * topy + b * ctrly + c * ey);
      setPx(g, lx + (fx > 0 ? 1 : -1), ly + 1, trunkDark);
    }
  }
  // coconuts
  fillCircle(g, topx - 2, topy + 2, 1, trunkDark);
  fillCircle(g, topx + 2, topy + 3, 1, trunkDark);
}

/** Brick / stone wall texture. */
export function brickWall(g, x0, y0, w, h, brick, mortar, bw = 9, bh = 4) {
  x0 *= SCALE; y0 *= SCALE; w *= SCALE; h *= SCALE; bw *= SCALE; bh *= SCALE;
  fillRect(g, x0, y0, w, h, mortar);
  for (let row = 0; row * bh < h; row++) {
    const offset = row % 2 === 0 ? 0 : Math.floor(bw / 2);
    for (let bx = -bw; bx < w + bw; bx += bw) {
      fillRect(
        g,
        x0 + bx + offset + 1,
        y0 + row * bh + 1,
        bw - 2,
        bh - 1,
        brick,
      );
    }
  }
}

/** Deterministic PRNG (mulberry32). */
export function prng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
