/**
 * PixelHaven art library v7 — raster DSL for 128×128 paint-by-number scenes.
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
 * v7 quality rules:
 *   - Gradients render as SOLID tone bands with Floyd-Steinberg error
 *     diffusion dithering — much smoother than Bayer at 128×128.
 *   - radialGlow falls off quadratically with Floyd-Steinberg dither:
 *     no more halo rings.
 *   - cloudShape()  : flat-bottom cumulus with solid underside shade.
 *   - palmTree()    : curved tapered trunk, ring shading, 7 drooping fronds.
 */

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

export const SIZE = 128;
export const PAPER = 0;
export const OUTLINE = -1;

export function makeGrid() {
  return new Int16Array(SIZE * SIZE);
}

export function setPx(g, x, y, v) {
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
  g[y * SIZE + x] = v;
}

export function getPx(g, x, y) {
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return undefined;
  return g[y * SIZE + x];
}

/* ------------------------------------------------------------ dithering */

/**
 * Floyd-Steinberg error diffusion for a gradient region.
 * Paints cells between lo and hi palette indices with error diffused to
 * neighbors — much smoother than Bayer dithering at 128×128.
 * Paints only cells whose current value passes ok(v).
 */
export function ditherGradientV(g, x0, x1, y0, y1, idxs, ok) {
  const n = idxs.length - 1;
  const err = new Float64Array(x1 - x0 + 3); // +2 for border padding

  for (let y = y0; y <= y1; y++) {
    const t = ((y - y0) / Math.max(1, y1 - y0)) * n;
    const i = Math.min(n - 1, Math.max(0, Math.floor(t)));
    const f = Math.min(1, Math.max(0, t - i));
    const lo = idxs[i];
    const hi = idxs[i + 1];

    err.fill(0); // reset error per row

    for (let x = x0; x <= x1; x++) {
      const v = getPx(g, x, y);
      if (v === undefined || !ok(v)) continue;

      const target = lo + f * (hi - lo);
      const val = target + err[x - x0 + 1];
      const nearest = Math.round(val);
      const newVal = Math.min(n, Math.max(0, nearest));
      const error = val - newVal;

      setPx(g, x, y, newVal);

      // Floyd-Steinberg diffusion
      err[x - x0 + 2] += error * 7 / 16; // right
      if (y < y1) {
        err[x - x0] += error * 3 / 16;     // below-left
        err[x - x0 + 1] += error * 5 / 16; // below
        err[x - x0 + 2] += error * 1 / 16; // below-right
      }
    }
  }
}

/**
 * Horizontal gradient (sunrises over water, lit walls). Floyd-Steinberg
 * dithered, same contract as vGradientDither.
 */
export function hGradientDither(g, x0, x1, y0, y1, idxs, ok = (v) => v === 0) {
  const n = idxs.length - 1;
  const err = new Float64Array(y1 - y0 + 3);

  for (let x = x0; x <= x1; x++) {
    err.fill(0);
    const t = ((x - x0) / Math.max(1, x1 - x0)) * n;
    const i = Math.min(n - 1, Math.max(0, Math.floor(t)));
    const f = Math.min(1, Math.max(0, t - i));
    const lo = idxs[i];
    const hi = idxs[i + 1];

    for (let y = y0; y <= y1; y++) {
      const v = getPx(g, x, y);
      if (v === undefined || !ok(v)) continue;

      const target = lo + f * (hi - lo);
      const val = target + err[y - y0 + 1];
      const nearest = Math.round(val);
      const newVal = Math.min(n, Math.max(0, nearest));
      const error = val - newVal;

      setPx(g, x, y, newVal);

      err[y - y0 + 2] += error * 7 / 16; // below
      if (x < x1) {
        err[y - y0] += error * 3 / 16;     // right-up
        err[y - y0 + 1] += error * 5 / 16; // right
        err[y - y0 + 2] += error * 1 / 16; // right-down
      }
    }
  }
}

/**
 * Soft dithered cast shadow / shading blob with Floyd-Steinberg error
 * diffusion. Quadratic falloff so the core is dense and the edge feathers
 * away — gentle ambient occlusion under objects. Only recolors cells whose
 * value passes ok(v).
 */
export function ditherShadow(g, cx, cy, rx, ry, shadowIdx, ok) {
  const err = new Float64Array(Math.ceil(rx * 2) + 3);

  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    err.fill(0);
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const nx = (x - cx) / rx;
      const ny = (y - cy) / ry;
      const d = nx * nx + ny * ny;
      if (d > 1) continue;
      const v = getPx(g, x, y);
      if (v === undefined || !ok(v)) continue;

      const p = Math.pow(1 - d, 1.4) * 0.85;
      const val = p + err[x - Math.floor(cx - rx) + 1];
      const nearest = Math.round(val);
      const newVal = Math.min(1, Math.max(0, nearest));
      const error = val - newVal;

      setPx(g, x, y, nearest > 0.5 ? shadowIdx : v);

      err[x - Math.floor(cx - rx) + 2] += error * 7 / 16;
      if (y < Math.ceil(cy + ry)) {
        err[y - Math.floor(cy - ry)]     += error * 3 / 16;
        err[y - Math.floor(cy - ry) + 1] += error * 5 / 16;
        err[y - Math.floor(cy - ry) + 2] += error * 1 / 16;
      }
    }
  }
}

/**
 * Rim light: cells of `from` whose neighbor on `dir` side is a DIFFERENT
 * value get dithered `to` highlights — cheap but effective top-lighting.
 * dir: 'up' | 'down' | 'left' | 'right' (side the light comes FROM).
 */
export function rimLight(g, x0, y0, x1, y1, from, to, dir = 'up', strength = 0.8) {
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

/** Horizontal dithered strip between two colors (foam, sand grain). */
export function ditherStrip(g, x0, x1, y, a, b, p = 0.5) {
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