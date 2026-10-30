/**
 * PixelHaven HD scene painters (round 6 — high-fidelity set).
 *
 * Each painter rasterizes a 512×512 float-RGB painting (2× supersample for
 * the 256×256 board). The pbn pipeline then downsamples, adds painterly
 * noise, and quantizes to a 100-200 color paint-by-number palette.
 *
 * Composition notes: every scene is built from smooth multi-stop gradients,
 * soft radial glows, and layered silhouettes with atmospheric perspective —
 * the "closer to a real picture" look comes from tone ramps, not outlines.
 */
import * as L from './pbn-lib.mjs';

const S = 512;

function nx(v) {
  return Math.round(v * S);
}
function ny(v) {
  return Math.round(v * S);
}
function c(hex) {
  return L.hexToRgb(hex);
}

/* ---------------------------------------------------------------- scenes */

/** 1 · Sunset Sail — indigo-to-gold sky, glowing sun, shimmering sea. */
function sunsetSail(cv) {
  const seaY = ny(0.60);
  L.vGradient(cv, 0, seaY, [
    [0, c('#241a4f')],
    [0.3, c('#6d2d63')],
    [0.52, c('#b84458')],
    [0.72, c('#ef8a3c')],
    [0.9, c('#ffc76e')],
    [1, c('#ffe3a1')],
  ]);
  // Sun + layered glow.
  const sunX = nx(0.63);
  const sunY = ny(0.545);
  L.radialGlow(cv, sunX, sunY, S * 0.34, c('#ffb45e'), 0.55);
  L.radialGlow(cv, sunX, sunY, S * 0.16, c('#ffe9b0'), 0.8);
  L.fillEllipse(cv, sunX, sunY, S * 0.052, S * 0.052, c('#fff3cf'));
  // Distant cloud bands with warm rims.
  const cloud = c('#5e2b57');
  L.fillEllipse(cv, nx(0.22), ny(0.30), S * 0.16, S * 0.018, cloud);
  L.fillEllipse(cv, nx(0.30), ny(0.325), S * 0.10, S * 0.014, cloud);
  L.fillEllipse(cv, nx(0.78), ny(0.24), S * 0.13, S * 0.016, cloud);
  L.fillEllipse(cv, nx(0.70), ny(0.395), S * 0.09, S * 0.012, c('#7a3358'));
  L.fillEllipse(cv, nx(0.40), ny(0.47), S * 0.07, S * 0.01, c('#8f3c52'));
  // Sea: cool base + warm reflection column under the sun.
  L.vGradient(cv, seaY, S, [
    [0, c('#83374f')],
    [0.25, c('#5c2b57')],
    [0.7, c('#2c2050')],
    [1, c('#1d1a40')],
  ]);
  L.radialGlow(cv, sunX, seaY + 6, S * 0.30, c('#ff9d4d'), 0.34);
  L.radialGlow(cv, sunX, seaY + 60, S * 0.16, c('#ffc37a'), 0.3);
  // Shimmer dashes.
  let seedRow = 0;
  for (let y = seaY + 8; y < S - 6; y += 10) {
    seedRow++;
    const wob = Math.sin(seedRow * 1.7) * 26;
    const width = 60 + (seedRow % 4) * 34;
    L.fillRect(cv, Math.round(sunX - width / 2 + wob), y, width, 3, c('#ffcf8a'));
    L.fillRect(cv, Math.round(nx(0.2) + wob * 0.4), y + 4, 40 + (seedRow % 3) * 18, 2, c('#b0556b'));
  }
  // Sailboat silhouette gliding left of the reflection.
  const boatY = seaY + 58;
  const hull = c('#241a33');
  L.fillPolygon(
    cv,
    [
      [nx(0.30), boatY],
      [nx(0.42), boatY],
      [nx(0.395), boatY + 16],
      [nx(0.325), boatY + 16],
    ],
    hull,
  );
  L.fillPolygon(
    cv,
    [
      [nx(0.362), boatY - 58],
      [nx(0.362), boatY - 2],
      [nx(0.30), boatY - 2],
    ],
    hull,
  );
  L.fillPolygon(
    cv,
    [
      [nx(0.374), boatY - 52],
      [nx(0.374), boatY - 2],
      [nx(0.425), boatY - 2],
    ],
    hull,
  );
}

/** 2 · Mountain Dawn — layered ridges, alpenglow peaks, mirror lake. */
function mountainDawn(cv) {
  const lakeY = ny(0.72);
  L.vGradient(cv, 0, lakeY, [
    [0, c('#2c3e6b')],
    [0.35, c('#7e6a9e')],
    [0.6, c('#d98a8c')],
    [0.82, c('#ffcf9c')],
    [1, c('#ffe9c4')],
  ]);
  L.radialGlow(cv, nx(0.68), ny(0.66), S * 0.3, c('#ffd9a0'), 0.5);
  // Ridge builder: jagged polygon from a set of peaks.
  const ridge = (peaks, base, fill) => {
    const pts = [[0, ny(base)]];
    for (const [px, py] of peaks) pts.push([nx(px), ny(py)]);
    pts.push([S, ny(base)], [S, S], [0, S]);
    L.fillPolygon(cv, pts, fill);
  };
  ridge(
    [
      [0.16, 0.40],
      [0.34, 0.52],
      [0.52, 0.38],
      [0.74, 0.55],
      [0.9, 0.47],
    ],
    0.62,
    c('#9d90b8'),
  );
  ridge(
    [
      [0.1, 0.5],
      [0.3, 0.6],
      [0.48, 0.47],
      [0.66, 0.62],
      [0.86, 0.52],
      [1.0, 0.6],
    ],
    0.7,
    c('#6f5f8d'),
  );
  // Near ridge with snow caps (alpenglow pinks on the lit faces).
  ridge(
    [
      [0.02, 0.62],
      [0.22, 0.44],
      [0.4, 0.66],
      [0.62, 0.42],
      [0.82, 0.64],
      [1.0, 0.55],
    ],
    0.78,
    c('#413a63'),
  );
  const cap = (peakX, peakY, w) => {
    L.fillPolygon(
      cv,
      [
        [nx(peakX - w), ny(peakY + w * 0.5)],
        [nx(peakX), ny(peakY)],
        [nx(peakX + w), ny(peakY + w * 0.5)],
        [nx(peakX + w * 0.4), ny(peakY + w * 0.42)],
        [nx(peakX), ny(peakY + w * 0.62)],
        [nx(peakX - w * 0.45), ny(peakY + w * 0.4)],
      ],
      c('#f5e0ea'),
    );
  };
  cap(0.22, 0.44, 0.075);
  cap(0.62, 0.42, 0.085);
  // Mist band between ridge lines.
  L.radialGlow(cv, nx(0.5), lakeY - 10, S * 0.55, c('#ffe2c2'), 0.22);
  // Mirror lake with the warm sky echo.
  L.vGradient(cv, lakeY, S, [
    [0, c('#e8b394')],
    [0.3, c('#a06d92')],
    [0.75, c('#463a6b')],
    [1, c('#2c2a55')],
  ]);
  L.radialGlow(cv, nx(0.68), lakeY + 30, S * 0.2, c('#ffd9a0'), 0.35);
  for (let i = 0; i < 26; i++) {
    const y = lakeY + 12 + i * 7;
    const wob = Math.sin(i * 2.3) * 40;
    L.fillRect(cv, nx(0.5) + wob - 60, y, 120, 2, c('#c98f9b'));
  }
}

/** 3 · Aurora Night — solid glowing ribbons over snowy hills and pines. */
function auroraNight(cv) {
  L.vGradient(cv, 0, S, [
    [0, c('#070b21')],
    [0.45, c('#101a3d')],
    [0.75, c('#1b2b52')],
    [1, c('#27395f')],
  ]);
  // Stars.
  const rand = L.mulberry(20260601);
  for (let i = 0; i < 140; i++) {
    const x = rand() * S;
    const y = rand() * ny(0.62);
    const bright = 120 + rand() * 135;
    L.fillRect(cv, Math.round(x), Math.round(y), 2, 2, [bright, bright, Math.min(255, bright + 40)]);
  }
  // Moon.
  L.radialGlow(cv, nx(0.84), ny(0.14), S * 0.09, c('#dfe8ff'), 0.55);
  L.fillEllipse(cv, nx(0.84), ny(0.14), S * 0.035, S * 0.035, c('#f2f5ff'));
  L.fillEllipse(cv, nx(0.855), ny(0.125), S * 0.03, S * 0.03, c('#0d1531'));
  // Aurora ribbons: SOLID curved bands drawn in vertical slices so the
  // quantizer gets stable tone areas (green body, bright core, purple fringe).
  const band = (p0, p1, p2, p3, half, core, bright, fringe) => {
    const center = L.quadPoints(
      [p0[0] * S, p0[1] * S],
      [p1[0] * S, p1[1] * S],
      [p2[0] * S, p2[1] * S],
      [p3[0] * S, p3[1] * S],
      48,
    );
    const slice = (i, topOff, botOff, col) => {
      const [ax, ay] = center[i];
      const [bx, by] = center[i + 1];
      L.fillPolygon(
        cv,
        [
          [ax, ay + topOff],
          [bx, by + topOff],
          [bx, by + botOff],
          [ax, ay + botOff],
        ],
        col,
      );
    };
    for (let i = 0; i + 1 < center.length; i++) {
      const wobble = Math.sin(i * 0.45) * 10;
      slice(i, -half - 14 + wobble, half + 22 - wobble, c(fringe));
      slice(i, -half + wobble * 0.5, half + 6, c(core));
      slice(i, -half * 0.45, half * 0.35, c(bright));
    }
  };
  band([0.02, 0.5], [0.25, 0.3], [0.5, 0.52], [0.78, 0.18], 34, '#2fbf77', '#b8ffd9', '#1f6f8f');
  band([0.1, 0.34], [0.38, 0.16], [0.62, 0.36], [0.95, 0.12], 22, '#57d99a', '#d2ffe6', '#7b5fc0');
  band([0.0, 0.28], [0.3, 0.42], [0.6, 0.22], [0.9, 0.3], 14, '#8fe8bd', '#e2fff0', '#4f8fc9');
  // Snowy hills.
  L.fillPolygon(
    cv,
    [
      [0, ny(0.78)],
      [nx(0.3), ny(0.68)],
      [nx(0.62), ny(0.8)],
      [S, ny(0.72)],
      [S, S],
      [0, S],
    ],
    c('#cdd8ee'),
  );
  L.fillPolygon(
    cv,
    [
      [0, ny(0.88)],
      [nx(0.4), ny(0.8)],
      [nx(0.8), ny(0.92)],
      [S, ny(0.86)],
      [S, S],
      [0, S],
    ],
    c('#9fb2d8'),
  );
  // Pine silhouettes on the hills.
  const pine = (x, y, hgt, col) => {
    for (let i = 0; i < 3; i++) {
      const w = hgt * (0.42 - i * 0.1);
      const base = y - hgt * (0.28 * i);
      L.fillPolygon(
        cv,
        [
          [x - w, base],
          [x, base - hgt * 0.45],
          [x + w, base],
        ],
        col,
      );
    }
    L.fillRect(cv, Math.round(x - 2), Math.round(y - 2), 4, hgt * 0.16, col);
  };
  const dark = c('#1c2440');
  for (const [px, py, h] of [
    [0.08, 0.8, 0.16],
    [0.14, 0.77, 0.12],
    [0.2, 0.81, 0.18],
    [0.68, 0.84, 0.15],
    [0.74, 0.8, 0.11],
    [0.81, 0.85, 0.17],
    [0.9, 0.8, 0.13],
  ]) {
    pine(nx(px), ny(py), h * S, dark);
  }
}

/** 4 · Rose Glow — macro rose over a smooth studio backdrop. */
function roseGlow(cv) {
  // Smooth radial backdrop (cream core → dusty rose edge → soft vignette).
  L.radialGradient(cv, nx(0.5), ny(0.44), S * 0.78, c('#f9ede2'), c('#d9a3a6'));
  L.radialGlow(cv, nx(0.5), ny(0.44), S * 0.55, c('#fff4ea'), 0.35);
  const cx = nx(0.5);
  const cy = ny(0.46);
  // Leaves behind the bloom.
  const leaf = (ang, dist, len, col) => {
    const lx = cx + Math.cos(ang) * dist;
    const ly = cy + Math.sin(ang) * dist * 0.9;
    L.fillEllipse(cv, lx, ly, len, len * 0.42, col);
  };
  leaf(2.4, S * 0.31, S * 0.16, c('#3f6b40'));
  leaf(2.9, S * 0.28, S * 0.13, c('#4c7a48'));
  leaf(0.6, S * 0.33, S * 0.15, c('#356038'));
  leaf(-0.4, S * 0.31, S * 0.12, c('#436e42'));
  // Petal rings: outer pale pink → inner deep crimson. Two-tone petals with
  // a consistent light direction (up-left) model soft volume.
  const rings = [
    { n: 10, r: 0.3, rx: 0.125, ry: 0.08, outer: '#f9c6d0', inner: '#e07c9b' },
    { n: 9, r: 0.225, rx: 0.115, ry: 0.072, outer: '#f2a0b5', inner: '#d75f85' },
    { n: 8, r: 0.16, rx: 0.1, ry: 0.064, outer: '#e87f9d', inner: '#c24468' },
    { n: 7, r: 0.1, rx: 0.085, ry: 0.056, outer: '#d75b7c', inner: '#a92f50' },
    { n: 6, r: 0.052, rx: 0.066, ry: 0.046, outer: '#bb4060', inner: '#8c2340' },
  ];
  for (const ring of rings) {
    for (let i = 0; i < ring.n; i++) {
      const ang = (i / ring.n) * Math.PI * 2 + ring.r * 3;
      const px = cx + Math.cos(ang) * ring.r * S;
      const py = cy + Math.sin(ang) * ring.r * S * 0.92;
      const shade = (Math.cos(ang - 2.2) + 1) / 2;
      const col = L.mix(c(ring.inner), c(ring.outer), 0.3 + shade * 0.7);
      L.fillEllipse(cv, px, py, ring.rx * S, ring.ry * S, col);
    }
  }
  L.fillEllipse(cv, cx, cy, S * 0.045, S * 0.04, c('#6e1a34'));
  L.radialGlow(cv, cx - S * 0.13, cy - S * 0.15, S * 0.26, c('#fff0ee'), 0.2);
}

/** 5 · City Night — dusk skyline, lit windows, wet-street reflections. */
function cityNight(cv) {
  L.vGradient(cv, 0, ny(0.74), [
    [0, c('#0d1233')],
    [0.4, c('#28306b')],
    [0.68, c('#7a4a8c')],
    [0.88, c('#e0795e')],
    [1, c('#ffb56b')],
  ]);
  const rand = L.mulberry(70707);
  for (let i = 0; i < 90; i++) {
    const x = rand() * S;
    const y = rand() * ny(0.4);
    const bright = 110 + rand() * 130;
    L.fillRect(cv, Math.round(x), Math.round(y), 2, 2, [bright, bright, Math.min(255, bright + 30)]);
  }
  L.radialGlow(cv, nx(0.18), ny(0.16), S * 0.08, c('#e8ecff'), 0.5);
  L.fillEllipse(cv, nx(0.18), ny(0.16), S * 0.028, S * 0.028, c('#f4f6ff'));
  // Skyline layers, far → near.
  const skyline = (baseY, hMin, hMax, col, windows) => {
    let x = 0;
    while (x < S) {
      const bw = 26 + rand() * 52;
      const bh = hMin + rand() * (hMax - hMin);
      L.fillRect(cv, Math.round(x), Math.round(baseY - bh), Math.round(bw), Math.round(bh + 10), col);
      if (windows) {
        for (let wy = baseY - bh + 8; wy < baseY - 10; wy += 12) {
          for (let wx = x + 5; wx < x + bw - 6; wx += 10) {
            if (rand() < 0.62) {
              const warm = rand();
              const wc =
                warm < 0.7 ? c('#ffd98c') : warm < 0.9 ? c('#cfe4ff') : c('#ffb36b');
              L.fillRect(cv, Math.round(wx), Math.round(wy), 4, 5, wc);
            }
          }
        }
      }
      x += bw + 4 + rand() * 10;
    }
  };
  skyline(ny(0.7), S * 0.12, S * 0.24, c('#3a3f75'), false);
  skyline(ny(0.76), S * 0.18, S * 0.34, c('#272b58'), false);
  skyline(ny(0.84), S * 0.22, S * 0.4, c('#161936'), true);
  // Street with reflections.
  L.vGradient(cv, ny(0.84), S, [
    [0, c('#20243f')],
    [1, c('#101226')],
  ]);
  for (let i = 0; i < 42; i++) {
    const x = rand() * S;
    const wdt = 3 + rand() * 8;
    const hgt = S * 0.05 + rand() * S * 0.12;
    const warm = rand() < 0.6;
    L.fillRect(
      cv,
      Math.round(x),
      ny(0.85),
      Math.round(wdt),
      Math.round(hgt),
      warm ? c('#8c6a3f') : c('#3f5a7a'),
    );
  }
}

/** 6 · Forest Light — sunbeams through layered green depth. */
function forestLight(cv) {
  L.vGradient(cv, 0, S, [
    [0, c('#a8cc82')],
    [0.3, c('#679a54')],
    [0.62, c('#37704a')],
    [1, c('#17382a')],
  ]);
  L.radialGlow(cv, nx(0.32), ny(0.1), S * 0.55, c('#f6efb4'), 0.42);
  const rand = L.mulberry(424242);
  // Dense canopy along the top, receding into gloom at the bottom.
  const clump = (cx, cy, r, base, lit) => {
    for (let i = 0; i < 9; i++) {
      const ox = (rand() - 0.5) * r * 1.8;
      const oy = (rand() - 0.5) * r;
      const col = L.mix(c(base), c(lit), Math.max(0, 0.7 - cy / (S * 1.4)));
      L.fillEllipse(cv, cx + ox, cy + oy, r * (0.45 + rand() * 0.4), r * (0.32 + rand() * 0.3), col);
    }
  };
  clump(nx(0.08), ny(0.1), S * 0.14, '#4a8348', '#8dbb6a');
  clump(nx(0.35), ny(0.06), S * 0.16, '#55904c', '#9cc674');
  clump(nx(0.65), ny(0.1), S * 0.15, '#4a8348', '#8dbb6a');
  clump(nx(0.92), ny(0.07), S * 0.14, '#55904c', '#9cc674');
  clump(nx(0.2), ny(0.26), S * 0.1, '#3c7442', '#7fae62');
  clump(nx(0.55), ny(0.24), S * 0.11, '#3c7442', '#7fae62');
  clump(nx(0.82), ny(0.28), S * 0.1, '#33683c', '#6fa25a');
  clump(nx(0.4), ny(0.45), S * 0.09, '#2c6238', '#5f9852');
  clump(nx(0.72), ny(0.5), S * 0.1, '#285a34', '#548c4a');
  // Tapered trunks (wider at the base) with a lit side.
  const trunk = (xTop, baseW, hgt, litLeft) => {
    const x0 = xTop - baseW * 0.4;
    const x1 = xTop + baseW * 0.4;
    const bx0 = xTop - baseW * 0.62;
    const bx1 = xTop + baseW * 0.62;
    L.fillPolygon(
      cv,
      [
        [x0, 0],
        [x1, 0],
        [bx1, hgt],
        [bx0, hgt],
      ],
      c('#4a3527'),
    );
    const lx = litLeft ? bx0 : xTop;
    L.fillPolygon(
      cv,
      [
        [litLeft ? x0 : xTop + baseW * 0.12, 0],
        [litLeft ? xTop - baseW * 0.05 : x1, 0],
        [litLeft ? bx0 + baseW * 0.1 : bx1, hgt],
        [litLeft ? bx0 : xTop + baseW * 0.18, hgt],
      ],
      c('#6f5238'),
    );
    void lx;
  };
  trunk(nx(0.16), S * 0.05, S * 0.96, true);
  trunk(nx(0.4), S * 0.035, S * 0.8, false);
  trunk(nx(0.58), S * 0.06, S, true);
  trunk(nx(0.8), S * 0.04, S * 0.86, false);
  trunk(nx(0.95), S * 0.045, S * 0.92, true);
  // Understorey glow + ferns.
  L.radialGlow(cv, nx(0.35), ny(0.94), S * 0.35, c('#c8e08a'), 0.26);
  for (let i = 0; i < 20; i++) {
    const x = rand() * S;
    const y = ny(0.85) + rand() * S * 0.12;
    L.fillEllipse(cv, x, y, S * 0.018 + rand() * S * 0.022, S * 0.007, c('#2c5c34'));
  }
}

/** 7 · Desert Dusk — sculpted dunes, warm light, first stars. */
function desertDusk(cv) {
  L.vGradient(cv, 0, ny(0.7), [
    [0, c('#274b63')],
    [0.4, c('#6a7fa0')],
    [0.62, c('#e8a56e')],
    [0.82, c('#ffcf8f')],
    [1, c('#ffe9bd')],
  ]);
  const rand = L.mulberry(9091);
  for (let i = 0; i < 50; i++) {
    const x = rand() * S;
    const y = rand() * ny(0.4);
    const bright = 120 + rand() * 135;
    L.fillRect(cv, Math.round(x), Math.round(y), 2, 2, [bright, bright, Math.min(255, bright + 20)]);
  }
  L.radialGlow(cv, nx(0.34), ny(0.62), S * 0.24, c('#ffe1a6'), 0.5);
  L.fillEllipse(cv, nx(0.34), ny(0.62), S * 0.042, S * 0.042, c('#fff2cf'));
  // Dunes: layered ridges from far (light) to near (dark). Each dune body
  // gets a shadow tone; the sun-facing slope gets a lit overlay polygon.
  const dune = (yL, yR, apexX, apexY, lit, shade) => {
    const ridge = L.quadPoints([0, yL * S], [apexX * S * 0.6, apexY * S], [apexX * S * 1.2, apexY * S], [S, yR * S], 40);
    L.fillPolygon(cv, [...ridge, [S, S], [0, S]], c(shade));
    // Lit face: from the apex rightward down the slope (sun sits left).
    const afterApex = ridge.filter(([x]) => x >= apexX * S * 0.95);
    if (afterApex.length > 1) {
      L.fillPolygon(
        cv,
        [...afterApex, [S, S], [apexX * S, S]],
        c(lit),
      );
    }
  };
  dune(0.74, 0.68, 0.42, 0.63, '#e2a468', '#b5764a');
  dune(0.82, 0.76, 0.6, 0.7, '#c9834f', '#8f5535');
  dune(0.9, 0.84, 0.3, 0.79, '#a5613b', '#693c28');
  dune(0.98, 0.93, 0.66, 0.87, '#8a4c30', '#53301f');
  // Cactus silhouettes on the nearest dune.
  const cactus = (x, y, hgt) => {
    L.fillRect(cv, x - 4, y - hgt, 9, hgt, c('#2e4436'));
    L.fillRect(cv, x - 14, y - hgt * 0.6, 6, hgt * 0.4, c('#2e4436'));
    L.fillRect(cv, x - 14, y - hgt * 0.62, 12, 6, c('#2e4436'));
    L.fillRect(cv, x + 8, y - hgt * 0.5, 6, hgt * 0.34, c('#2e4436'));
    L.fillRect(cv, x + 4, y - hgt * 0.52, 10, 6, c('#2e4436'));
  };
  cactus(nx(0.82), ny(0.95), S * 0.11);
  cactus(nx(0.14), ny(0.93), S * 0.08);
}

/** 8 · Lily Pond — Monet-style water, pads and blossoms. */
function lilyPond(cv) {
  L.vGradient(cv, 0, S, [
    [0, c('#274d4c')],
    [0.35, c('#2f6b62')],
    [0.7, c('#4f8f7a')],
    [1, c('#7fb598')],
  ]);
  L.radialGlow(cv, nx(0.62), ny(0.3), S * 0.5, c('#a8d8c0'), 0.3);
  // Ripple streaks.
  const rand = L.mulberry(80808);
  for (let i = 0; i < 34; i++) {
    const y = rand() * S;
    const x = rand() * S * 0.8;
    const wdt = S * 0.06 + rand() * S * 0.16;
    L.fillRect(cv, Math.round(x), Math.round(y), Math.round(wdt), 2, c('#8fc4a8'));
  }
  // Lily pads with a light top edge and a notch.
  const pad = (x, y, r, ang) => {
    const top = L.mix(c('#3e7a4a'), c('#7cb56a'), (y / S) * 0.8);
    const dark = c('#26543a');
    for (let py = -r; py <= r; py++) {
      for (let px = -r; px <= r; px++) {
        const dx = px / r;
        const dy = py / (r * 0.62);
        if (dx * dx + dy * dy > 1) continue;
        // Notch: a wedge missing toward `ang`.
        const a = Math.atan2(py, px);
        let da = Math.abs(a - ang);
        if (da > Math.PI) da = Math.PI * 2 - da;
        if (da < 0.32) continue;
        const shade = Math.cos(a - 1.2) > 0.25 ? dark : top;
        L.setPx(cv, Math.round(x + px), Math.round(y + py), shade);
      }
    }
  };
  const pads = [
    [0.2, 0.3, 0.075],
    [0.45, 0.22, 0.06],
    [0.72, 0.28, 0.08],
    [0.3, 0.52, 0.095],
    [0.6, 0.5, 0.085],
    [0.85, 0.55, 0.07],
    [0.15, 0.72, 0.11],
    [0.45, 0.78, 0.12],
    [0.75, 0.82, 0.1],
    [0.95, 0.74, 0.075],
  ];
  for (const [px, py, pr] of pads) pad(nx(px), ny(py), pr * S, rand() * Math.PI * 2);
  // Soft shadows under pads.
  for (const [px, py, pr] of pads) {
    L.blendPx(cv, nx(px), ny(py) + pr * S * 0.5, c('#1d3f3a'), 0.25);
  }
  // Lotus blossoms: fanned petals on two pads.
  const blossom = (x, y, size) => {
    for (let i = 0; i < 7; i++) {
      const ang = -Math.PI / 2 + (i - 3) * 0.38;
      const px = x + Math.cos(ang) * size * 0.55;
      const py = y + Math.sin(ang) * size * 0.62;
      const tone = L.mix(c('#f7d7e0'), c('#e78ba4'), Math.abs(i - 3) / 3);
      L.fillEllipse(cv, px, py, size * 0.3, size * 0.48, tone);
    }
    L.fillEllipse(cv, x, y - size * 0.1, size * 0.16, size * 0.12, c('#f9e6b0'));
  };
  blossom(nx(0.3), ny(0.5), S * 0.075);
  blossom(nx(0.77), ny(0.8), S * 0.09);
  // Reeds framing the corners.
  const reed = (x, topY, hgt) => {
    L.fillRect(cv, x, topY, 4, hgt, c('#274a33'));
    L.fillEllipse(cv, x + 2, topY - 6, 5, 12, c('#4b7040'));
  };
  reed(nx(0.05), ny(0.12), S * 0.22);
  reed(nx(0.1), ny(0.2), S * 0.16);
  reed(nx(0.94), ny(0.1), S * 0.24);
  reed(nx(0.89), ny(0.18), S * 0.15);
}

/* ------------------------------------------------- converted classics (v8) */

/**
 * The four beloved classic scenes rebuilt at HD fidelity (round 7): same
 * compositions the user knows — floating tree, turquoise cove, sakura
 * temple, aurora fjord — re-painted with gradients, soft light and layered
 * silhouettes instead of hard pixel outlines.
 */

/** 9 · Floating Tree — the hero: a drifting island with a lush canopy. */
function floatingTree(cv) {
  // Airy daylight sky.
  L.vGradient(cv, 0, S, [
    [0, c('#58addf')],
    [0.45, c('#8ecbf0')],
    [0.78, c('#c4e7f8')],
    [1, c('#e9f6fd')],
  ]);
  L.radialGlow(cv, nx(0.8), ny(0.14), S * 0.3, c('#ffffff'), 0.22);
  // Cloud puffs: soft shadow underside, white body, pale top light.
  const cloud = (x, y, s) => {
    for (const [ox, oy, rx, ry] of [
      [-1.1, 0.15, 0.75, 0.5],
      [1.05, 0.18, 0.7, 0.48],
      [-0.35, -0.25, 0.8, 0.62],
      [0.5, -0.18, 0.72, 0.55],
      [0, 0.1, 0.95, 0.6],
    ]) {
      L.fillEllipse(cv, x + ox * s, y + oy * s + s * 0.22, rx * s, ry * s, c('#cfe4f2'));
    }
    for (const [ox, oy, rx, ry] of [
      [-1.05, 0, 0.72, 0.48],
      [1.0, 0.02, 0.66, 0.45],
      [-0.32, -0.38, 0.78, 0.6],
      [0.48, -0.3, 0.7, 0.52],
      [0, 0, 0.95, 0.58],
    ]) {
      L.fillEllipse(cv, x + ox * s, y + oy * s, rx * s, ry * s, c('#ffffff'));
    }
    L.fillEllipse(cv, x - s * 0.3, y - s * 0.42, s * 0.55, s * 0.3, c('#f2f9fd'));
  };
  cloud(nx(0.16), ny(0.18), S * 0.085);
  cloud(nx(0.78), ny(0.32), S * 0.07);
  cloud(nx(0.1), ny(0.6), S * 0.06);
  cloud(nx(0.88), ny(0.72), S * 0.075);
  cloud(nx(0.28), ny(0.88), S * 0.08);
  cloud(nx(0.62), ny(0.94), S * 0.06);
  // Birds.
  const bird = (x, y, w) => {
    L.fillPolygon(
      cv,
      [
        [x - w, y],
        [x - w * 0.2, y - w * 0.42],
        [x, y],
        [x + w * 0.2, y - w * 0.42],
        [x + w, y],
      ],
      c('#4a708c'),
    );
  };
  bird(nx(0.66), ny(0.2), S * 0.014);
  bird(nx(0.71), ny(0.24), S * 0.011);
  bird(nx(0.62), ny(0.27), S * 0.009);
  // Satellite islets (small rock + grass cap + tiny sapling).
  const islet = (x, y, r, tree) => {
    L.fillPolygon(
      cv,
      [
        [x - r, y],
        [x + r, y],
        [x + r * 0.45, y + r * 1.5],
        [x - r * 0.2, y + r * 1.35],
      ],
      c('#7c6a5e'),
    );
    L.fillPolygon(
      cv,
      [
        [x - r, y],
        [x - r * 0.1, y + r * 1.42],
        [x - r * 0.2, y + r * 1.35],
      ],
      c('#94806f'),
    );
    L.fillEllipse(cv, x, y, r * 1.15, r * 0.42, c('#6fb457'));
    if (tree) {
      L.fillRect(cv, x - 2, y - r * 0.95, 4, r * 0.95, c('#7a5236'));
      L.fillEllipse(cv, x, y - r * 1.25, r * 0.62, r * 0.55, c('#5f9e46'));
      L.fillEllipse(cv, x - r * 0.2, y - r * 1.42, r * 0.4, r * 0.34, c('#83c45f'));
    }
  };
  islet(nx(0.13), ny(0.56), S * 0.032, true);
  islet(nx(0.87), ny(0.52), S * 0.026, false);
  islet(nx(0.8), ny(0.88), S * 0.02, false);
  // MAIN ISLAND — grass cap first, then rock body beneath.
  const ix = nx(0.5);
  const topY = ny(0.5);
  // Rock underside: lit left face, shaded right face, jagged bottom tip.
  L.fillPolygon(
    cv,
    [
      [ix - S * 0.185, topY],
      [ix + S * 0.185, topY],
      [ix + S * 0.14, topY + S * 0.06],
      [ix + S * 0.15, topY + S * 0.1],
      [ix + S * 0.06, topY + S * 0.16],
      [ix + S * 0.075, topY + S * 0.2],
      [ix - S * 0.01, topY + S * 0.24],
      [ix - S * 0.07, topY + S * 0.19],
      [ix - S * 0.06, topY + S * 0.14],
      [ix - S * 0.13, topY + S * 0.1],
      [ix - S * 0.12, topY + S * 0.05],
    ],
    c('#7c6a5e'),
  );
  L.fillPolygon(
    cv,
    [
      [ix + S * 0.185, topY],
      [ix + S * 0.14, topY + S * 0.06],
      [ix + S * 0.15, topY + S * 0.1],
      [ix + S * 0.06, topY + S * 0.16],
      [ix + S * 0.075, topY + S * 0.2],
      [ix - S * 0.01, topY + S * 0.24],
      [ix + S * 0.03, topY + S * 0.2],
      [ix - S * 0.02, topY + S * 0.14],
      [ix + S * 0.03, topY + S * 0.08],
      [ix + S * 0.02, topY],
    ],
    c('#665448'),
  );
  L.fillPolygon(
    cv,
    [
      [ix - S * 0.185, topY],
      [ix - S * 0.12, topY + S * 0.05],
      [ix - S * 0.13, topY + S * 0.1],
      [ix - S * 0.06, topY + S * 0.14],
      [ix - S * 0.07, topY + S * 0.19],
      [ix - S * 0.01, topY + S * 0.24],
      [ix - S * 0.05, topY + S * 0.18],
      [ix - S * 0.1, topY + S * 0.11],
      [ix - S * 0.09, topY + S * 0.04],
    ],
    c('#96816f'),
  );
  // Hanging roots.
  const root = (x, y0, len, w, col) => {
    L.fillPolygon(
      cv,
      [
        [x - w, y0],
        [x + w, y0],
        [x + w * 0.4 + w * 0.6 * Math.sin(len), y0 + len],
        [x - w * 0.4 + w * 0.6 * Math.sin(len * 0.8), y0 + len],
      ],
      col,
    );
  };
  root(ix - S * 0.13, topY + S * 0.095, S * 0.05, 3.2, c('#6e5b50'));
  root(ix - S * 0.05, topY + S * 0.155, S * 0.07, 3.6, c('#6e5b50'));
  root(ix + S * 0.04, topY + S * 0.165, S * 0.045, 3, c('#5f4e44'));
  root(ix + S * 0.1, topY + S * 0.09, S * 0.06, 3, c('#6e5b50'));
  root(ix - S * 0.09, topY + S * 0.115, S * 0.035, 2.6, c('#7c6a5e'));
  // Waterfall drip off the right lip + droplets.
  L.fillPolygon(
    cv,
    [
      [ix + S * 0.145, topY + S * 0.015],
      [ix + S * 0.175, topY + S * 0.02],
      [ix + S * 0.165, topY + S * 0.09],
      [ix + S * 0.15, topY + S * 0.09],
    ],
    c('#bfe6f8'),
  );
  L.fillEllipse(cv, ix + S * 0.158, topY + S * 0.115, 5, 7, c('#d9f1fc'));
  L.fillEllipse(cv, ix + S * 0.163, topY + S * 0.15, 4, 5, c('#eaf7fd'));
  // Grass cap overhanging the rock, with a soft dome highlight.
  L.fillEllipse(cv, ix, topY, S * 0.21, S * 0.058, c('#6aa84c'));
  L.fillEllipse(cv, ix - S * 0.02, topY - S * 0.014, S * 0.2, S * 0.046, c('#7cb857'));
  L.fillEllipse(cv, ix - S * 0.05, topY - S * 0.024, S * 0.09, S * 0.02, c('#93cc6c'));
  // Trunk with a lit side.
  L.fillPolygon(
    cv,
    [
      [ix - S * 0.036, topY - S * 0.02],
      [ix + S * 0.036, topY - S * 0.02],
      [ix + S * 0.026, topY - S * 0.1],
      [ix - S * 0.026, topY - S * 0.1],
    ],
    c('#7a5236'),
  );
  L.fillPolygon(
    cv,
    [
      [ix - S * 0.036, topY - S * 0.02],
      [ix - S * 0.014, topY - S * 0.02],
      [ix - S * 0.01, topY - S * 0.1],
      [ix - S * 0.026, topY - S * 0.1],
    ],
    c('#96694a'),
  );
  // Canopy: layered fluffy clumps, dark base → bright sunlit tops.
  const clump = (x, y, r, base, lit) => {
    const rnd = L.mulberry(Math.round(x * 7 + y * 13));
    for (let i = 0; i < 8; i++) {
      const ox = (rnd() - 0.5) * r * 1.7;
      const oy = (rnd() - 0.5) * r * 0.9;
      L.fillEllipse(cv, x + ox, y + oy, r * (0.42 + rnd() * 0.35), r * (0.34 + rnd() * 0.3), c(base));
    }
    for (let i = 0; i < 5; i++) {
      const ox = (rnd() - 0.5) * r * 1.4;
      const oy = -r * 0.15 + (rnd() - 0.5) * r * 0.6;
      L.fillEllipse(cv, x + ox, y + oy, r * (0.3 + rnd() * 0.25), r * (0.24 + rnd() * 0.2), c(lit));
    }
  };
  clump(ix, ny(0.24), S * 0.165, '#4e8a3c', '#67a84b');
  clump(ix - S * 0.15, ny(0.3), S * 0.105, '#457c36', '#5f9e46');
  clump(ix + S * 0.15, ny(0.29), S * 0.11, '#47813a', '#67a84b');
  clump(ix - S * 0.07, ny(0.17), S * 0.1, '#55954a', '#79b957');
  clump(ix + S * 0.08, ny(0.16), S * 0.095, '#55954a', '#79b957');
  clump(ix, ny(0.115), S * 0.08, '#5f9e46', '#8fc95f');
  clump(ix - S * 0.2, ny(0.36), S * 0.07, '#3f7633', '#5a9a44');
  clump(ix + S * 0.21, ny(0.35), S * 0.072, '#3f7633', '#5a9a44');
  // Sun-kissed highlights on the upper-left canopy.
  L.fillEllipse(cv, ix - S * 0.05, ny(0.1), S * 0.055, S * 0.035, c('#a9d877'));
  L.fillEllipse(cv, ix + S * 0.02, ny(0.085), S * 0.04, S * 0.026, c('#c0e78d'));
}

/** 10 · Turquoise Cove — palm beach, gradient sea, striped umbrella. */
function turquoiseCove(cv) {
  const horizon = ny(0.42);
  L.vGradient(cv, 0, horizon, [
    [0, c('#7ec8ec')],
    [0.6, c('#b8e4f6')],
    [1, c('#eef9ec')],
  ]);
  L.radialGlow(cv, nx(0.17), ny(0.15), S * 0.16, c('#fff6d8'), 0.6);
  L.fillEllipse(cv, nx(0.17), ny(0.15), S * 0.03, S * 0.03, c('#fffdf2'));
  // Gulls.
  const gull = (x, y, w) => {
    L.fillPolygon(
      cv,
      [
        [x - w, y],
        [x, y - w * 0.5],
        [x + w, y],
        [x, y - w * 0.18],
      ],
      c('#6a8ca4'),
    );
  };
  gull(nx(0.52), ny(0.16), S * 0.013);
  gull(nx(0.57), ny(0.2), S * 0.01);
  // Sea: deep at the horizon, glowing turquoise in the shallows.
  L.vGradient(cv, horizon, ny(0.64), [
    [0, c('#1f7f9e')],
    [0.3, c('#2fa4b8')],
    [0.62, c('#4ec4c4')],
    [1, c('#8fe6da')],
  ]);
  // Sparkle lanes.
  const rnd = L.mulberry(31110);
  for (let i = 0; i < 46; i++) {
    const y = horizon + 6 + rnd() * (ny(0.64) - horizon - 10);
    const t = (y - horizon) / (ny(0.64) - horizon);
    const x = rnd() * S;
    L.fillRect(cv, Math.round(x), Math.round(y), Math.round(8 + t * 26), 2, c('#dff8f2'));
  }
  // Sailboat resting on the horizon.
  const bx = nx(0.63);
  const by = horizon - 2;
  L.fillPolygon(cv, [[bx, by - S * 0.105], [bx, by - S * 0.006], [bx - S * 0.075, by - S * 0.006]], c('#fbfbf6'));
  L.fillPolygon(cv, [[bx + S * 0.008, by - S * 0.088], [bx + S * 0.008, by - S * 0.006], [bx + S * 0.056, by - S * 0.006]], c('#f0ede2'));
  L.fillPolygon(
    cv,
    [
      [bx - S * 0.042, by],
      [bx + S * 0.05, by],
      [bx + S * 0.032, by + S * 0.018],
      [bx - S * 0.028, by + S * 0.018],
    ],
    c('#c2554a'),
  );
  // Foam edge + wet sand.
  L.fillPolygon(
    cv,
    [
      [0, ny(0.62)],
      [S, ny(0.64)],
      [S, ny(0.68)],
      [nx(0.5), ny(0.655)],
      [0, ny(0.67)],
    ],
    c('#eef8f0'),
  );
  L.fillPolygon(
    cv,
    [
      [0, ny(0.665)],
      [nx(0.5), ny(0.65)],
      [S, ny(0.675)],
      [S, ny(0.71)],
      [0, ny(0.7)],
    ],
    c('#e3d3a4'),
  );
  // Dry sand.
  L.vGradient(cv, ny(0.7), S, [
    [0, c('#f2e2b4')],
    [1, c('#ecd9a0')],
  ]);
  for (let i = 0; i < 40; i++) {
    const x = rnd() * S;
    const y = ny(0.74) + rnd() * (S - ny(0.74));
    L.fillRect(cv, Math.round(x), Math.round(y), 2, 2, c('#dfc98e'));
  }
  // Rocks, right edge.
  const rock = (x, y, rx, ry, base, lit) => {
    L.fillEllipse(cv, x, y, rx, ry, c(base));
    L.fillEllipse(cv, x - rx * 0.25, y - ry * 0.3, rx * 0.55, ry * 0.45, c(lit));
  };
  rock(nx(0.93), ny(0.72), S * 0.05, S * 0.032, '#8a8a84', '#a5a59e');
  rock(nx(0.87), ny(0.75), S * 0.035, S * 0.024, '#7c7c76', '#98988f');
  rock(nx(0.06), ny(0.63), S * 0.045, S * 0.026, '#83837d', '#9d9d95');
  // Beach umbrella (striped canopy + pole + shadow) on the dry sand.
  const ux = nx(0.7);
  const uy = ny(0.82);
  L.fillEllipse(cv, ux + S * 0.035, uy + S * 0.004, S * 0.14, S * 0.02, c('#d9c48e'));
  L.fillRect(cv, Math.round(ux - 3), Math.round(uy - S * 0.27), 7, S * 0.28, c('#9a7a55'));
  for (let i = 0; i < 8; i++) {
    const a0 = Math.PI + (i / 8) * Math.PI;
    const a1 = Math.PI + ((i + 1) / 8) * Math.PI;
    const r = S * 0.155;
    const pts = [
      [ux, uy - S * 0.265],
      [ux + Math.cos(a0) * r, uy - S * 0.265 + Math.sin(a0) * r * 0.62],
      [ux + Math.cos((a0 + a1) / 2) * r * 1.04, uy - S * 0.265 + Math.sin((a0 + a1) / 2) * r * 0.66],
      [ux + Math.cos(a1) * r, uy - S * 0.265 + Math.sin(a1) * r * 0.62],
    ];
    L.fillPolygon(cv, pts, c(i % 2 === 0 ? '#e05a4e' : '#f7f2e6'));
  }
  L.fillEllipse(cv, ux, uy - S * 0.265, S * 0.013, S * 0.011, c('#7a5c3e'));
  // Towel.
  L.fillPolygon(
    cv,
    [
      [nx(0.24), ny(0.8)],
      [nx(0.36), ny(0.775)],
      [nx(0.38), ny(0.845)],
      [nx(0.26), ny(0.87)],
    ],
    c('#f2a8b8'),
  );
  L.fillPolygon(
    cv,
    [
      [nx(0.27), ny(0.794)],
      [nx(0.35), ny(0.779)],
      [nx(0.357), ny(0.802)],
      [nx(0.277), ny(0.817)],
    ],
    c('#fbdae2'),
  );
  L.fillPolygon(
    cv,
    [
      [nx(0.283), ny(0.83)],
      [nx(0.363), ny(0.815)],
      [nx(0.37), ny(0.838)],
      [nx(0.29), ny(0.853)],
    ],
    c('#fbdae2'),
  );
  // Beach ball with a dark rim so the pale wedge reads as a sphere.
  const ballX = nx(0.47);
  const ballY = ny(0.865);
  const br = S * 0.034;
  L.fillEllipse(cv, ballX, ballY + br * 0.12, br * 1.05, br * 0.4, c('#d9c48e'));
  L.fillEllipse(cv, ballX, ballY, br, br, c('#3a3a44'));
  const wr = br * 0.88;
  for (let i = 0; i < 6; i++) {
    const a0 = (i / 6) * Math.PI * 2;
    const a1 = ((i + 1) / 6) * Math.PI * 2;
    const pts = [[ballX, ballY]];
    for (let t = 0; t <= 6; t++) {
      const a = a0 + ((a1 - a0) * t) / 6;
      pts.push([ballX + Math.cos(a) * wr, ballY + Math.sin(a) * wr]);
    }
    L.fillPolygon(cv, pts, c(['#e05a4e', '#f6c945', '#4a9fd6', '#f7f2e6', '#f2a03d', '#67b8a0'][i]));
  }
  L.fillEllipse(cv, ballX - br * 0.3, ballY - br * 0.32, br * 0.26, br * 0.2, c('#ffffff'));
  // Palm tree leaning over the water — thick tapered trunk, broad fronds.
  const py0 = ny(1.02);
  const seg = 8;
  for (let i = 0; i < seg; i++) {
    const t0 = i / seg;
    const t1 = (i + 1) / seg;
    const bend = (t) => nx(0.13) + (nx(0.31) - nx(0.13)) * t * t;
    const y0 = py0 - (py0 - ny(0.48)) * t0;
    const y1 = py0 - (py0 - ny(0.48)) * t1;
    const w0 = S * 0.02 * (1 - t0 * 0.42);
    const w1 = S * 0.02 * (1 - t1 * 0.42);
    L.fillPolygon(
      cv,
      [
        [bend(t0) - w0, y0],
        [bend(t0) + w0, y0],
        [bend(t1) + w1, y1],
        [bend(t1) - w1, y1],
      ],
      c('#8a6a48'),
    );
    // Trunk rings.
    if (i % 2 === 1) {
      L.fillRect(cv, Math.round(bend(t1) - w1), Math.round(y1 - 2), Math.round(w1 * 2), 3, c('#7a5c3e'));
    }
  }
  const topX = nx(0.31);
  const topY2 = ny(0.48);
  const frond = (ang, len, droop, col) => {
    const spine = [];
    for (let t = 0; t <= 8; t++) {
      const tt = t / 8;
      const a = ang + droop * tt * tt;
      spine.push([
        topX + Math.cos(a) * len * tt,
        topY2 + Math.sin(a) * len * tt * 0.85 + droop * 26 * tt * tt,
      ]);
    }
    const pts = [];
    for (let t = 0; t <= 8; t++) {
      const [sx, sy] = spine[t];
      const w = S * 0.016 * Math.sin((t / 8) * Math.PI * 0.9 + 0.15);
      pts.push([sx - w * 0.4, sy - w]);
    }
    for (let t = 8; t >= 0; t--) {
      const [sx, sy] = spine[t];
      const w = S * 0.016 * Math.sin((t / 8) * Math.PI * 0.9 + 0.15);
      pts.push([sx + w * 0.4, sy + w]);
    }
    L.fillPolygon(cv, pts, c(col));
  };
  frond(-2.7, S * 0.21, 0.45, '#3f8f4f');
  frond(-2.0, S * 0.23, 0.55, '#57a85c');
  frond(-1.25, S * 0.2, 0.7, '#2f7a42');
  frond(-0.45, S * 0.21, 0.8, '#3f8f4f');
  frond(0.35, S * 0.19, 0.85, '#57a85c');
  frond(1.1, S * 0.16, 0.8, '#2f7a42');
  frond(2.5, S * 0.13, 0.6, '#3f8f4f');
  L.fillEllipse(cv, topX + S * 0.014, topY2 + S * 0.014, S * 0.012, S * 0.01, c('#6e5238'));
  L.fillEllipse(cv, topX - S * 0.016, topY2 + S * 0.022, S * 0.011, S * 0.009, c('#7a5c40'));
}

/** 11 · Sakura Temple — pagoda, torii gate and blossoms at dusk. */
function sakuraTemple(cv) {
  L.vGradient(cv, 0, ny(0.62), [
    [0, c('#f2bcd0')],
    [0.45, c('#f9d7de')],
    [0.78, c('#fdeae4')],
    [1, c('#fef4ea')],
  ]);
  L.radialGlow(cv, nx(0.74), ny(0.2), S * 0.22, c('#fff3da'), 0.4);
  // Haze mountains.
  L.fillPolygon(
    cv,
    [
      [0, ny(0.46)],
      [nx(0.2), ny(0.36)],
      [nx(0.42), ny(0.45)],
      [nx(0.6), ny(0.38)],
      [nx(0.82), ny(0.46)],
      [S, ny(0.4)],
      [S, ny(0.62)],
      [0, ny(0.62)],
    ],
    c('#d3a8c2'),
  );
  L.fillPolygon(
    cv,
    [
      [0, ny(0.52)],
      [nx(0.24), ny(0.44)],
      [nx(0.5), ny(0.52)],
      [nx(0.76), ny(0.45)],
      [S, ny(0.52)],
      [S, ny(0.64)],
      [0, ny(0.64)],
    ],
    c('#bd8fae'),
  );
  // Temple hill.
  L.fillPolygon(
    cv,
    [
      [0, ny(0.62)],
      [nx(0.2), ny(0.58)],
      [nx(0.45), ny(0.6)],
      [nx(0.7), ny(0.575)],
      [S, ny(0.6)],
      [S, ny(0.7)],
      [0, ny(0.7)],
    ],
    c('#4e6e58'),
  );
  // Foreground ground — everything below the hill to the bottom edge.
  L.vGradient(cv, ny(0.68), S, [
    [0, c('#496850')],
    [1, c('#37503f')],
  ]);
  // PAGODA — three roofs with upturned eaves, red body, cream walls.
  const tx = nx(0.56);
  const roof = (y, halfW, rise) => {
    L.fillPolygon(
      cv,
      [
        [tx - halfW, y],
        [tx - halfW * 0.72, y - rise * 0.55],
        [tx - halfW * 0.3, y - rise * 0.85],
        [tx, y - rise],
        [tx + halfW * 0.3, y - rise * 0.85],
        [tx + halfW * 0.72, y - rise * 0.55],
        [tx + halfW, y],
        [tx + halfW * 0.55, y + S * 0.008],
        [tx - halfW * 0.55, y + S * 0.008],
      ],
      c('#3a2f3a'),
    );
  };
  const body = (y0, y1, halfW) => {
    L.fillRect(cv, tx - halfW, y0, halfW * 2, y1 - y0, c('#b8453e'));
    L.fillRect(cv, tx - halfW * 0.55, y0 + S * 0.006, halfW * 1.1, y1 - y0 - S * 0.012, c('#f2e8d8'));
    for (let i = -1; i <= 1; i++) {
      L.fillRect(cv, tx + i * halfW * 0.62 - S * 0.006, y0 + S * 0.01, S * 0.012, y1 - y0 - S * 0.02, c('#7a2f2c'));
    }
  };
  roof(ny(0.19), S * 0.05, S * 0.028);
  L.fillRect(cv, tx - 3, ny(0.14), 6, S * 0.026, c('#3a2f3a'));
  L.fillEllipse(cv, tx, ny(0.137), S * 0.008, S * 0.012, c('#c99a3f'));
  body(ny(0.198), ny(0.235), S * 0.046);
  roof(ny(0.243), S * 0.085, S * 0.03);
  body(ny(0.251), ny(0.29), S * 0.075);
  roof(ny(0.298), S * 0.12, S * 0.032);
  body(ny(0.306), ny(0.35), S * 0.1);
  roof(ny(0.358), S * 0.155, S * 0.034);
  L.fillRect(cv, tx - S * 0.11, ny(0.366), S * 0.22, ny(0.475) - ny(0.366), c('#a83c36'));
  // Door + steps.
  L.fillRect(cv, tx - S * 0.018, ny(0.435), S * 0.036, ny(0.475) - ny(0.435), c('#5a2a26'));
  L.fillRect(cv, tx - S * 0.13, ny(0.475), S * 0.26, S * 0.01, c('#8a7a66'));
  // Wall windows on the upper tiers peek past each roof.
  for (const [wy, hw] of [
    [0.208, 0.046],
    [0.262, 0.075],
    [0.318, 0.1],
  ]) {
    L.fillRect(cv, tx - hw * S * 0.5, ny(wy), hw * S, S * 0.018, c('#f2e8d8'));
  }
  // TORII gate on the path, left of the pagoda.
  const gx = nx(0.33);
  L.fillRect(cv, gx - S * 0.05, ny(0.5), S * 0.014, ny(0.66) - ny(0.5), c('#c4453c'));
  L.fillRect(cv, gx + S * 0.036, ny(0.5), S * 0.014, ny(0.66) - ny(0.5), c('#c4453c'));
  L.fillRect(cv, gx - S * 0.075, ny(0.49), S * 0.15, S * 0.016, c('#b03a34'));
  L.fillRect(cv, gx - S * 0.083, ny(0.478), S * 0.166, S * 0.014, c('#c4453c'));
  L.fillRect(cv, gx - S * 0.01, ny(0.525), S * 0.02, S * 0.012, c('#b03a34'));
  // Stone path zig-zagging down the hill: center line with growing width.
  const pathC = [
    [0.56, 0.485, 0.05],
    [0.545, 0.58, 0.065],
    [0.52, 0.68, 0.08],
    [0.48, 0.8, 0.1],
    [0.42, 1.02, 0.13],
  ];
  const leftEdge = pathC.map(([x, y, w]) => [x - w, y]);
  const rightEdge = pathC.map(([x, y, w]) => [x + w, y]);
  L.fillPolygon(cv, [...leftEdge, ...rightEdge.reverse()], c('#d9cdb8'));
  // Stepping-stone tone down the middle.
  for (let i = 0; i + 1 < pathC.length; i++) {
    const [x0, y0, w0] = pathC[i];
    const [x1, y1, w1] = pathC[i + 1];
    L.fillPolygon(
      cv,
      [
        [nx(x0) - w0 * S * 0.55, ny(y0)],
        [nx(x0) + w0 * S * 0.55, ny(y0)],
        [nx(x1) + w1 * S * 0.55, ny(y1)],
        [nx(x1) - w1 * S * 0.55, ny(y1)],
      ],
      c('#c4b8a0'),
    );
  }
  // Grass verges flanking the path (simple non-crossing quads).
  const vergeL = pathC.map(([x, y, w]) => [x - w - 0.075 - (1 - y) * 0.02, y]);
  L.fillPolygon(cv, [...leftEdge, ...vergeL.reverse()], c('#5a7a4a'));
  const vergeR = pathC.map(([x, y, w]) => [x + w + 0.08 + (1 - y) * 0.02, y]);
  L.fillPolygon(cv, [...rightEdge, ...vergeR.reverse()], c('#54744a'));
  // SAKURA tree — thick trunk with branches, layered blossom masses.
  L.fillPolygon(
    cv,
    [
      [nx(0.08), S],
      [nx(0.15), S],
      [nx(0.175), ny(0.72)],
      [nx(0.16), ny(0.62)],
      [nx(0.14), ny(0.63)],
      [nx(0.125), ny(0.74)],
    ],
    c('#5a4038'),
  );
  L.fillPolygon(
    cv,
    [
      [nx(0.15), ny(0.68)],
      [nx(0.163), ny(0.655)],
      [nx(0.25), ny(0.56)],
      [nx(0.235), ny(0.545)],
    ],
    c('#5a4038'),
  );
  L.fillPolygon(
    cv,
    [
      [nx(0.152), ny(0.64)],
      [nx(0.168), ny(0.625)],
      [nx(0.1), ny(0.55)],
      [nx(0.088), ny(0.568)],
    ],
    c('#5a4038'),
  );
  const bloom = (x, y, r, base, lit) => {
    const rnd = L.mulberry(Math.round(x * 3 + y * 5));
    for (let i = 0; i < 7; i++) {
      L.fillEllipse(
        cv,
        x + (rnd() - 0.5) * r * 1.8,
        y + (rnd() - 0.5) * r * 1.1,
        r * (0.35 + rnd() * 0.3),
        r * (0.28 + rnd() * 0.26),
        c(base),
      );
    }
    for (let i = 0; i < 4; i++) {
      L.fillEllipse(
        cv,
        x + (rnd() - 0.5) * r * 1.4,
        y - r * 0.2 + (rnd() - 0.5) * r * 0.7,
        r * (0.26 + rnd() * 0.22),
        r * (0.2 + rnd() * 0.18),
        c(lit),
      );
    }
  };
  bloom(nx(0.17), ny(0.53), S * 0.085, '#e89ab8', '#f7c3d6');
  bloom(nx(0.07), ny(0.5), S * 0.06, '#e08fb0', '#f4b8cd');
  bloom(nx(0.26), ny(0.55), S * 0.055, '#e89ab8', '#f7c3d6');
  bloom(nx(0.12), ny(0.45), S * 0.05, '#f2b8cc', '#fbe3ec');
  bloom(nx(0.21), ny(0.47), S * 0.045, '#f2b8cc', '#fbe3ec');
  L.fillEllipse(cv, nx(0.16), ny(0.42), S * 0.035, S * 0.026, c('#fbdce8'));
  // Falling petals.
  const rndP = L.mulberry(51555);
  for (let i = 0; i < 26; i++) {
    const x = rndP() * S * 0.55;
    const y = ny(0.3) + rndP() * ny(0.6);
    L.fillEllipse(cv, x, y, 3 + rndP() * 3, 2 + rndP() * 2, c(i % 3 === 0 ? '#f7c3d6' : '#f2b0c6'));
  }
  // Stone lantern.
  const lx = nx(0.75);
  const ly = ny(0.8);
  L.fillRect(cv, lx - S * 0.02, ly, S * 0.04, S * 0.02, c('#8f8f86'));
  L.fillRect(cv, lx - S * 0.008, ly - S * 0.07, S * 0.016, S * 0.07, c('#9a9a90'));
  L.fillRect(cv, lx - S * 0.026, ly - S * 0.085, S * 0.052, S * 0.018, c('#8f8f86'));
  L.fillRect(cv, lx - S * 0.02, ly - S * 0.14, S * 0.04, S * 0.055, c('#aaa89c'));
  L.fillRect(cv, lx - S * 0.009, ly - S * 0.13, S * 0.018, S * 0.035, c('#f7d98c'));
  L.fillPolygon(
    cv,
    [
      [lx - S * 0.034, ly - S * 0.14],
      [lx + S * 0.034, ly - S * 0.14],
      [lx + S * 0.02, ly - S * 0.165],
      [lx - S * 0.02, ly - S * 0.165],
    ],
    c('#7f7f76'),
  );
  L.fillEllipse(cv, lx, ly - S * 0.172, S * 0.008, S * 0.007, c('#6f6f66'));
}

/** 12 · Aurora Fjord — northern lights over water, peaks and a warm cabin. */
function auroraFjord(cv) {
  L.vGradient(cv, 0, S, [
    [0, c('#060c1e')],
    [0.4, c('#0c1630')],
    [0.68, c('#152340')],
    [1, c('#1b2c50')],
  ]);
  const rnd = L.mulberry(1112111);
  for (let i = 0; i < 150; i++) {
    const x = rnd() * S;
    const y = rnd() * ny(0.6);
    const b = 110 + rnd() * 145;
    L.fillRect(cv, Math.round(x), Math.round(y), 2, 2, [b, b, Math.min(255, b + 45)]);
  }
  L.radialGlow(cv, nx(0.13), ny(0.11), S * 0.07, c('#dfe8ff'), 0.45);
  L.fillEllipse(cv, nx(0.13), ny(0.11), S * 0.026, S * 0.026, c('#eef2ff'));
  L.fillEllipse(cv, nx(0.142), ny(0.098), S * 0.023, S * 0.023, c('#0b1428'));
  // Aurora bands (solid slices — the round-6 lesson).
  const band = (p0, p1, p2, p3, half, core, bright, fringe) => {
    const center = L.quadPoints(
      [p0[0] * S, p0[1] * S],
      [p1[0] * S, p1[1] * S],
      [p2[0] * S, p2[1] * S],
      [p3[0] * S, p3[1] * S],
      48,
    );
    const slice = (i, topOff, botOff, col) => {
      const [ax, ay] = center[i];
      const [bx, by] = center[i + 1];
      L.fillPolygon(
        cv,
        [
          [ax, ay + topOff],
          [bx, by + topOff],
          [bx, by + botOff],
          [ax, ay + botOff],
        ],
        col,
      );
    };
    for (let i = 0; i + 1 < center.length; i++) {
      const wob = Math.sin(i * 0.5) * 9;
      // Taper both ends so ribbons melt into the sky instead of stopping.
      const env = 0.18 + 0.82 * Math.sin((i / (center.length - 1)) * Math.PI) ** 0.7;
      const h = half * env;
      slice(i, -h - 6 * env + wob * 0.7, h + 9 * env - wob * 0.7, c(fringe));
      slice(i, -h + wob * 0.5, h + 4, c(core));
      slice(i, -h * 0.38, h * 0.3, c(bright));
    }
  };
  band([0.02, 0.38], [0.28, 0.2], [0.52, 0.32], [0.85, 0.1], 17, '#2fbf77', '#c8ffe2', '#1f6f8f');
  band([0.08, 0.3], [0.36, 0.38], [0.62, 0.18], [0.9, 0.3], 12, '#57d99a', '#dcffef', '#6b5ab0');
  band([0.04, 0.16], [0.28, 0.28], [0.56, 0.12], [0.82, 0.22], 7, '#8fe8bd', '#e6fff2', '#4f8fc9');
  // Snow caps: a neat cap around each ridge's apex (highest ridge vertex).
  const peak = (pts, col, snowCol) => {
    L.fillPolygon(cv, pts, col);
    let ai = 1; // skip the two base-closing corners
    for (let i = 2; i < pts.length - 2; i++) {
      if (pts[i][1] < pts[ai][1]) ai = i;
    }
    const [px, py] = pts[ai];
    const th = py + S * 0.035;
    const lx = pts[ai - 1][0];
    const rx = pts[ai + 1][0];
    L.fillPolygon(
      cv,
      [
        [px, py],
        [px - (px - lx) * 0.62, py + (th - py) * 0.55],
        [px - (px - lx) * 0.3, th],
        [px + (rx - px) * 0.3, th],
        [px + (rx - px) * 0.62, py + (th - py) * 0.55],
      ],
      snowCol,
    );
  };
  peak(
    [
      [0, ny(0.52)],
      [nx(0.16), ny(0.3)],
      [nx(0.3), ny(0.48)],
      [nx(0.44), ny(0.34)],
      [nx(0.58), ny(0.5)],
      [nx(0.72), ny(0.36)],
      [nx(0.88), ny(0.5)],
      [S, ny(0.44)],
      [S, ny(0.66)],
      [0, ny(0.66)],
    ],
    c('#33456b'),
    c('#b9c6e2'),
  );
  peak(
    [
      [0, ny(0.6)],
      [nx(0.2), ny(0.44)],
      [nx(0.38), ny(0.58)],
      [nx(0.52), ny(0.46)],
      [nx(0.7), ny(0.6)],
      [nx(0.9), ny(0.5)],
      [S, ny(0.58)],
      [S, ny(0.72)],
      [0, ny(0.72)],
    ],
    c('#243352'),
    c('#93a4c8'),
  );
  // Fjord water.
  L.vGradient(cv, ny(0.7), S, [
    [0, c('#1b2c50')],
    [0.5, c('#101d3a')],
    [1, c('#0a1226')],
  ]);
  // Aurora reflections: sparse dim streaks wavering below the bands.
  for (let i = 0; i < 18; i++) {
    const x = rnd() * S;
    const y = ny(0.73) + rnd() * (S - ny(0.73) - 14);
    const h = S * 0.012 + rnd() * S * 0.032;
    L.fillRect(cv, Math.round(x), Math.round(y), 2, Math.round(h), c(i % 2 === 0 ? '#1a5f4c' : '#1c5560'));
  }
  for (let i = 0; i < 24; i++) {
    const x = rnd() * S;
    const y = ny(0.74) + rnd() * (S - ny(0.74));
    L.fillRect(cv, Math.round(x), Math.round(y), 10 + rnd() * 20, 2, c('#22335c'));
  }
  // Shoreline + pines.
  L.fillPolygon(
    cv,
    [
      [0, ny(0.68)],
      [nx(0.14), ny(0.7)],
      [nx(0.3), ny(0.685)],
      [nx(0.46), ny(0.7)],
      [nx(0.6), ny(0.688)],
      [nx(0.75), ny(0.7)],
      [S, ny(0.686)],
      [S, ny(0.72)],
      [0, ny(0.72)],
    ],
    c('#0e1830'),
  );
  const pine = (x, y, hgt, col) => {
    for (let i = 0; i < 3; i++) {
      const w = hgt * (0.4 - i * 0.1);
      const base = y - hgt * (0.26 * i);
      L.fillPolygon(
        cv,
        [
          [x - w, base],
          [x, base - hgt * 0.45],
          [x + w, base],
        ],
        col,
      );
    }
    L.fillRect(cv, Math.round(x - 2), Math.round(y - 2), 4, hgt * 0.14, col);
  };
  for (const [qx, qy, h] of [
    [0.04, 0.69, 0.1],
    [0.09, 0.7, 0.13],
    [0.15, 0.695, 0.09],
    [0.24, 0.7, 0.11],
    [0.62, 0.695, 0.08],
    [0.68, 0.7, 0.1],
    [0.94, 0.69, 0.09],
  ]) {
    pine(nx(qx), ny(qy), h * S, c('#0a1428'));
  }
  // Warm cabin on the near shore: dark timber, thin snow lip, lit windows.
  const hx = nx(0.79);
  const hy = ny(0.66);
  L.fillRect(cv, hx - S * 0.045, hy - S * 0.05, S * 0.09, S * 0.05, c('#33261d'));
  L.fillPolygon(
    cv,
    [
      [hx - S * 0.058, hy - S * 0.05],
      [hx + S * 0.058, hy - S * 0.05],
      [hx, hy - S * 0.1],
    ],
    c('#1c2436'),
  );
  L.fillPolygon(
    cv,
    [
      [hx - S * 0.05, hy - S * 0.058],
      [hx - S * 0.024, hy - S * 0.082],
      [hx + S * 0.024, hy - S * 0.082],
      [hx + S * 0.05, hy - S * 0.058],
    ],
    c('#b9c6e0'),
  );
  L.fillRect(cv, hx + S * 0.028, hy - S * 0.088, S * 0.012, S * 0.03, c('#2c2018'));
  L.fillRect(cv, hx - S * 0.032, hy - S * 0.038, S * 0.018, S * 0.018, c('#ffcf7a'));
  L.fillRect(cv, hx + S * 0.012, hy - S * 0.038, S * 0.018, S * 0.018, c('#ffcf7a'));
  L.radialGlow(cv, hx, hy - S * 0.03, S * 0.06, c('#ffc76e'), 0.26);
  // Window light pooling on the snow.
  L.fillEllipse(cv, hx - S * 0.02, hy + S * 0.008, S * 0.045, S * 0.011, c('#2c3a5c'));
}

/* -------------------------------------------------------------- registry */

/**
 * HD set registry (round 7: HD-only gallery). The four converted classics
 * lead — floating-tree keeps the hero slot it has held since round 5 —
 * followed by the round-6 high-fidelity set. `paper` doubles as palette[0]
 * (the uncolored look) and must stay visually near the artwork's dominant
 * light tone.
 */
export const hifiScenes = [
  // Converted classics (contentVersion bumped so old 128² saves exit cleanly).
  { id: 'floating-tree', title: 'Floating Tree', seed: 1109, paper: '#8ecbf0', paint: floatingTree },
  { id: 'turquoise-cove', title: 'Turquoise Cove', seed: 1110, paper: '#2fa4b8', paint: turquoiseCove },
  { id: 'sakura-temple', title: 'Sakura Temple', seed: 1111, paper: '#f2bcd0', paint: sakuraTemple },
  { id: 'aurora-fjord', title: 'Aurora Fjord', seed: 1112, paper: '#0c1630', paint: auroraFjord },
  // Round-6 high-fidelity set.
  { id: 'hd-sunset-sail', title: 'Sunset Sail', seed: 1101, paper: '#1d1a40', paint: sunsetSail },
  { id: 'hd-mountain-dawn', title: 'Mountain Dawn', seed: 1102, paper: '#2c2a55', paint: mountainDawn },
  { id: 'hd-aurora-night', title: 'Aurora Night', seed: 1103, paper: '#070b21', paint: auroraNight },
  { id: 'hd-rose-glow', title: 'Rose Glow', seed: 1104, paper: '#e8aeb4', paint: roseGlow },
  { id: 'hd-city-night', title: 'City Lights', seed: 1105, paper: '#101226', paint: cityNight },
  { id: 'hd-forest-light', title: 'Forest Light', seed: 1106, paper: '#123224', paint: forestLight },
  { id: 'hd-desert-dusk', title: 'Desert Dusk', seed: 1107, paper: '#5f3628', paint: desertDusk },
  { id: 'hd-lily-pond', title: 'Lily Pond', seed: 1108, paper: '#274d4c', paint: lilyPond },
];
