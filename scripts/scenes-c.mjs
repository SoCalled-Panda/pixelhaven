/**
 * PixelHaven v6 scenes — batch C: desert-dunes, balloon-valley,
 * aurora-fjord, greenhouse-morning. All coordinates assume SIZE=128.
 */
import * as L from './art-lib.mjs';

const { fillRect, hline, vline, line, fillCircle, fillEllipse, fillTriangleUp,
  fillPolygon, quadCurve, radialGlow, vGradient, hGradient,
  ditherShadow, rimLight, sparkle, cloudShape, palmTree } = L;

/* ============================== desert-dunes ========================== */

const desertPalette = [
  '#f9f1dc', // 0 paper
  '#ffd98a', // 1 sky hot high
  '#ffc46e', // 2 sky hot
  '#ffaa5e', // 3 sky deep
  '#f28d4e', // 4 sky horizon
  '#ff8a5e', // 5 sun
  '#ffc9a0', // 6 sun halo
  '#f2c98a', // 7 dune far
  '#e8b070', // 8 dune far mid
  '#d99554', // 9 dune mid
  '#c67a42', // 10 dune near
  '#a85c32', // 11 dune shadow
  '#8a4a28', // 12 dune deep shadow
  '#e8a05e', // 13 ridge highlight
  '#f7d4a0', // 14 sand crest light
  '#3f6b42', // 15 palm leaf dark
  '#5f8f5a', // 16 palm leaf
  '#8a6242', // 17 palm trunk
  '#6e4c32', // 18 palm trunk dark
  '#2e7d8a', // 19 oasis water
  '#4fa5ab', // 20 oasis water light
  '#3a5a38', // 21 cactus body
  '#4f7346', // 22 cactus light
  '#e05a6e', // 23 cactus flower
  '#5d4436', // 24 caravan silhouette
  '#443626', // 25 caravan dark
];

const desertGroups = [[1, 2, 3, 4, 5, 6], [7, 8], [9, 10, 13, 14], [11, 12], [15, 16], [17, 18], [19, 20], [21, 22, 23], [24, 25]];

function sceneDesert(g) {
  vGradient(g, 0, 127, 0, 66, [1, 2, 3, 4]);
  fillCircle(g, 40, 22, 10, 5);
  radialGlow(g, 40, 22, 20, 6, (v) => v >= 1 && v <= 4);
  // Dune layers, back to front
  fillPolygon(g, [[0, 60], [26, 44], [58, 58], [88, 48], [128, 62], [128, 128], [0, 128]], 7);
  fillPolygon(g, [[0, 78], [36, 60], [72, 76], [104, 64], [128, 76], [128, 128], [0, 128]], 9);
  fillPolygon(g, [[0, 96], [40, 78], [86, 94], [128, 82], [128, 128], [0, 128]], 10);
  // Ridge highlight lines
  quadCurve(g, 0, 78, 36, 60, 72, 76, 13, 1);
  quadCurve(g, 72, 76, 104, 64, 128, 76, 13, 1);
  quadCurve(g, 0, 96, 40, 78, 86, 94, 14, 1);
  quadCurve(g, 86, 94, 128, 82, 128, 82, 14, 1);
  // Slip-face shadows (right side of crests)
  fillPolygon(g, [[36, 60], [72, 76], [64, 78], [30, 64]], 11);
  fillPolygon(g, [[40, 78], [86, 94], [76, 96], [34, 82]], 11);
  fillPolygon(g, [[88, 48], [128, 62], [128, 68], [92, 52]], 8);
  // Oasis pond
  fillEllipse(g, 34, 108, 20, 8, 19);
  fillEllipse(g, 34, 107, 16, 6, 20);
  // Palms at the oasis (v6 structured palms, leaning apart)
  palmTree(g, 16, 102, 40, -13, 17, 18, 15, 16);
  palmTree(g, 54, 104, 34, 12, 18, 17, 15, 16);
  // Cacti on the near dune
  fillRect(g, 92, 74, 5, 18, 21);
  fillRect(g, 87, 80, 4, 4, 21); fillRect(g, 87, 76, 4, 6, 21);
  fillRect(g, 98, 82, 4, 4, 21); fillRect(g, 98, 78, 4, 6, 21);
  fillRect(g, 92, 74, 5, 2, 22);
  L.setPx(g, 94, 72, 23);
  fillRect(g, 112, 86, 4, 12, 21);
  fillRect(g, 108, 90, 4, 4, 21); fillRect(g, 116, 92, 4, 4, 21);
  // Caravan silhouette on the far ridge
  const caravan = [[52, 54], [64, 52], [76, 55], [88, 52]];
  for (let i = 0; i < caravan.length; i++) {
    const [cx, cy] = caravan[i];
    fillEllipse(g, cx, cy, 4, 3, 24); // body
    fillEllipse(g, cx + 4, cy - 1, 2, 2, 24); // hump/head
    fillRect(g, cx - 2, cy + 2, 1, 3, 25);
    fillRect(g, cx + 2, cy + 2, 1, 3, 25);
    if (i === 0) fillRect(g, cx + 5, cy - 6, 2, 5, 24); // rider
  }
  hline(g, 48, 92, 57, 25);
  // Heat shimmer bands at the horizon
  for (let x = 0; x < 256; x += 3) {
    hline(g, x, x + 1, 64 + (x % 2), 1);
  }
}

function decorateDesert(g, rand) {
  // Sand grain — sparse, mid + near dunes only
  for (let i = 0; i < 40; i++) {
    const x = Math.floor(rand() * 256);
    const y = 84 + Math.floor(rand() * 44);
    const v = L.getPx(g, x, y);
    if ((v === 9 || v === 10) && rand() < 0.5) L.setPx(g, x, y, rand() < 0.5 ? v + 1 : v - 1);
  }
  // Water sparkle
  sparkle(g, rand, 20, 102, 48, 112, [20, 6], 4);
  // Palm shadow on the sand
  ditherShadow(g, 30, 104, 16, 3, 11, (v) => v === 10);
  // Vulture circling
  hline(g, 104, 106, 18, 24); hline(g, 108, 110, 18, 24);
}

/* ============================= balloon-valley ========================= */

const balloonPalette = [
  '#f8f4e6', // 0 paper
  '#a8d8f0', // 1 sky high
  '#bfe4f4', // 2 sky
  '#d8f0f4', // 3 sky low
  '#fbf7ea', // 4 cloud
  '#d2e2ec', // 5 cloud shade
  '#c94f43', // 6 balloon red
  '#a83c33', // 7 balloon red shade
  '#4f9ea0', // 8 balloon teal
  '#3a7a7c', // 9 balloon teal shade
  '#f2b84e', // 10 balloon gold
  '#cf9238', // 11 balloon gold shade
  '#fbf7ea', // 12 balloon cream
  '#e2d8c4', // 13 balloon cream shade
  '#5d4a3a', // 14 basket
  '#7a5233', // 15 basket weave
  '#4a3a2c', // 16 ropes
  '#4f8a52', // 17 field light
  '#3f7346', // 18 field
  '#356238', // 19 field dark
  '#a8c46a', // 20 field yellow-green
  '#e0d0a0', // 21 field wheat
  '#4f8f9e', // 22 river
  '#7ab5bd', // 23 river light
  '#2f4630', // 24 trees
  '#3f5940', // 25 trees light
  '#d9c9a8', // 26 house walls
  '#a85c4a', // 27 house roofs
  '#3a2f4d', // 28 birds
];

const balloonGroups = [[1, 2, 3, 28], [4, 5], [6, 7], [8, 9], [10, 11], [12, 13], [14, 15, 16], [17, 18, 19, 20, 21], [22, 23], [24, 25], [26, 27]];

function sceneBalloon(g) {
  vGradient(g, 0, 127, 0, 78, [1, 2, 3]);
  // Cumulus clouds with flat bottoms
  cloudShape(g, 32, 26, 46, 8, 4, 5);
  cloudShape(g, 102, 20, 48, 9, 4, 5);
  // Valley: patchwork fields
  fillPolygon(g, [[0, 84], [128, 78], [128, 128], [0, 128]], 18);
  fillPolygon(g, [[0, 84], [40, 80], [64, 92], [24, 100], [0, 96]], 17);
  fillPolygon(g, [[64, 92], [96, 82], [128, 86], [128, 100], [88, 104]], 20);
  fillPolygon(g, [[24, 100], [64, 92], [88, 104], [52, 116], [12, 112]], 21);
  fillPolygon(g, [[88, 104], [128, 100], [128, 120], [92, 124]], 19);
  fillPolygon(g, [[0, 96], [24, 100], [12, 112], [0, 116]], 19);
  // River winding through the valley
  quadCurve(g, 96, 128, 84, 108, 100, 88, 22, 3);
  quadCurve(g, 100, 88, 108, 80, 118, 78, 22, 2);
  hline(g, 92, 100, 96, 23); hline(g, 86, 96, 112, 23);
  // Trees + tiny farmhouses
  fillCircle(g, 16, 106, 5, 24); fillCircle(g, 22, 108, 4, 25);
  fillCircle(g, 74, 120, 5, 24); fillCircle(g, 108, 108, 5, 24);
  fillRect(g, 34, 96, 8, 6, 26); fillPolygon(g, [[32, 96], [44, 96], [38, 90]], 27);
  fillRect(g, 60, 108, 7, 5, 26); fillPolygon(g, [[58, 108], [69, 108], [63, 103]], 27);
  // Birds
  for (const [bx, by] of [[58, 40], [66, 36], [50, 46]]) {
    hline(g, bx - 2, bx - 1, by, 28); hline(g, bx + 1, bx + 2, by, 28);
  }
  // Balloon 1 — big red/cream, left
  balloonAt(g, 28, 44, 16, 6, 7, 12, 13);
  // Balloon 2 — teal, right
  balloonAt(g, 92, 36, 13, 8, 9, 12, 13);
  // Balloon 3 — gold, small, center-far
  balloonAt(g, 62, 24, 9, 10, 11, 12, 13);
}

function balloonAt(g, cx, cy, r, c1, s1, c2, s2) {
  const ry = Math.round(r * 1.15);
  fillEllipse(g, cx, cy, r, ry, c1);
  // gores (vertical stripes)
  for (let i = -2; i <= 2; i++) {
    if (i === 0) continue;
    const gx = cx + Math.round(i * r * 0.45);
    for (let y = cy - ry; y <= cy + ry; y++) {
      const dy = (y - cy) / ry;
      const half = Math.round(Math.sqrt(Math.max(0, 1 - dy * dy)) * r);
      if (Math.abs(gx - cx) <= half) fillRect(g, gx, y, 1, 1, c2);
    }
  }
  // sphere shading: small specular highlight upper-left + right shade band
  const hx = cx - Math.round(r * 0.42);
  const hy = cy - Math.round(ry * 0.5);
  fillEllipse(g, hx, hy, Math.max(1, Math.round(r * 0.18)), Math.max(1, Math.round(ry * 0.2)), c2);
  for (let y = cy - ry; y <= cy + ry; y++) {
    const dy = (y - cy) / ry;
    const half = Math.sqrt(Math.max(0, 1 - dy * dy)) * r;
    for (let x = cx - Math.ceil(half); x <= cx + Math.ceil(half); x++) {
      const dx = (x - cx) / r;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > 1) continue;
      const ang = Math.atan2(dy, dx); // y down: upper-left ≈ (-π, -π/2)
      if (d > 0.72 && d < 0.97 && ang < -0.55 * Math.PI && bayer8t(x, y) < 0.5) {
        L.setPx(g, x, y, c2);
      } else if (d > 0.6 && dx > 0.25 && bayer8t(x, y) < 0.85) {
        L.setPx(g, x, y, s1);
      }
    }
  }
  // mouth + ropes + basket
  fillRect(g, cx - 3, cy + ry, 7, 2, s1);
  line(g, cx - 3, cy + ry + 1, cx - 3, cy + ry + 6, 16);
  line(g, cx + 3, cy + ry + 1, cx + 3, cy + ry + 6, 16);
  fillRect(g, cx - 4, cy + ry + 6, 9, 6, 14);
  for (let y = cy + ry + 7; y < cy + ry + 12; y += 2) {
    hline(g, cx - 4, cx + 4, y, 15);
  }
}

/** bayer8 sampler without importing the matrix here */
function bayer8t(x, y) {
  return L.BAYER8[y & 7][x & 7];
}

function decorateBalloon(g, rand) {
  // Field texture — sparse crop-row dashes
  for (let i = 0; i < 30; i++) {
    const x = Math.floor(rand() * 124);
    const y = 84 + Math.floor(rand() * 44);
    const v = L.getPx(g, x, y);
    if ((v === 20 || v === 21) && rand() < 0.5) {
      L.setPx(g, x, y, 17);
      if (rand() < 0.5) L.setPx(g, x + 1, y, 17);
    }
  }
}

/* ============================== aurora-fjord ========================== */

const auroraPalette = [
  '#f4eee0', // 0 paper
  '#101733', // 1 sky deep
  '#182046', // 2 sky
  '#223059', // 3 sky low
  '#6fe3a6', // 4 aurora green
  '#a5f0c8', // 5 aurora green light
  '#59c9c9', // 6 aurora teal
  '#8adfd8', // 7 aurora teal light
  '#8a7ac9', // 8 aurora violet hint
  '#f2f2ea', // 9 snow
  '#d2dcea', // 10 snow shade
  '#5d6b8a', // 11 mountain body
  '#485570', // 12 mountain shade
  '#1c3140', // 13 fjord water
  '#265060', // 14 fjord mid
  '#2e6b72', // 15 fjord light
  '#5d4436', // 16 cabin wood
  '#443626', // 17 cabin dark
  '#8a5a44', // 18 cabin roof
  '#ffd98a', // 19 cabin window
  '#ffedb8', // 20 window glow
  '#141d24', // 21 pines
  '#22333a', // 22 pines light
  '#f2ead2', // 23 stars
];

const auroraGroups = [[1, 2, 3, 23], [4, 5], [6, 7], [8], [9, 10], [11, 12], [13, 14, 15], [16, 17, 18], [19, 20], [21, 22]];

function sceneAurora(g) {
  vGradient(g, 0, 127, 0, 80, [1, 2, 3]);
  const starRand = L.prng(11);
  for (let i = 0; i < 40; i++) {
    const x = Math.floor(starRand() * 128);
    const y = Math.floor(starRand() * 66);
    const v = L.getPx(g, x, y);
    if (v >= 1 && v <= 3) L.setPx(g, x, y, 23);
  }
  // Mountains: two ranges with snow caps
  fillPolygon(g, [[0, 84], [30, 44], [64, 84]], 11);
  fillPolygon(g, [[22, 56], [30, 44], [40, 56], [34, 58], [26, 58]], 9);
  fillPolygon(g, [[48, 84], [84, 38], [120, 84]], 11);
  fillPolygon(g, [[74, 52], [84, 38], [96, 54], [88, 54], [82, 50]], 9);
  fillPolygon(g, [[0, 84], [30, 44], [40, 56], [22, 56]], 10);
  fillPolygon(g, [[64, 84], [84, 38], [96, 54], [74, 52]], 10);
  fillRect(g, 0, 82, 128, 6, 12);
  // Fjord
  fillRect(g, 0, 88, 128, 40, 13);
  vGradient(g, 0, 127, 88, 127, [13, 14, 15], (v) => v >= 13 && v <= 15);
  // Aurora curtains (decorate pass paints the glow); paint faint source bands
  for (const [cx, topY, w, c] of [[34, 8, 10, 4], [70, 4, 12, 6], [104, 12, 8, 4]]) {
    quadCurve(g, cx - w, topY, cx, topY + 26, cx - 6, 64, c, 2);
    quadCurve(g, cx - w + 4, topY + 4, cx + 4, topY + 28, cx - 2, 66, c, 2);
  }
  // Cabin on the near shore
  fillRect(g, 88, 74, 20, 12, 16);
  fillRect(g, 88, 74, 20, 2, 17);
  fillPolygon(g, [[85, 74], [111, 74], [104, 66], [92, 66]], 18);
  fillRect(g, 92, 78, 5, 5, 19);
  fillRect(g, 99, 78, 5, 5, 19);
  // Pines along the shore
  for (const [px, ph] of [[10, 26], [22, 32], [36, 22], [50, 30], [64, 20], [120, 24]]) {
    fillTriangleUp(g, px, 88 - ph, 7, 88, 21);
    fillRect(g, px - 1, 85, 3, 4, 21);
  }
  fillTriangleUp(g, 22, 60, 8, 88, 22);
}

function decorateAurora(g, rand) {
  // Aurora glow: dithered curtains rising from the bands
  for (const [cx, topY, w, lite, deep] of [[34, 8, 10, 5, 4], [70, 4, 12, 7, 6], [104, 12, 8, 5, 4]]) {
    for (let i = 0; i < 160; i++) {
      const t = rand();
      const y = topY + Math.floor(t * 58);
      const sway = Math.round(Math.sin(y * 0.12) * 6);
      const x = cx + sway + Math.floor((rand() - 0.5) * (w + 8));
      const v = L.getPx(g, x, y);
      if (v >= 1 && v <= 3) {
        L.setPx(g, x, y, rand() < 0.6 ? lite : deep);
      }
    }
  }
  // Violet hint at the top edge of curtains
  for (let i = 0; i < 24; i++) {
    const x = 20 + Math.floor(rand() * 90);
    const y = 2 + Math.floor(rand() * 14);
    const v = L.getPx(g, x, y);
    if (v >= 1 && v <= 3 && rand() < 0.35) L.setPx(g, x, y, 8);
  }
  // Aurora reflection in the fjord
  for (let i = 0; i < 50; i++) {
    const x = Math.floor(rand() * 256);
    const y = 90 + Math.floor(rand() * 36);
    const v = L.getPx(g, x, y);
    if ((v === 13 || v === 14) && rand() < 0.4) L.setPx(g, x, y, rand() < 0.5 ? 15 : 14);
  }
  // Window glow on the snow-free ground
  radialGlow(g, 94, 82, 7, 20, (v) => v === 12 || v === 11);
  // Smoke from the chimney
  for (let i = 0; i < 8; i++) {
    const y = 62 - i * 2;
    const x = 97 + Math.round(Math.sin(i * 0.6) * 2);
    const v = L.getPx(g, x, y);
    if (v >= 1 && v <= 3) L.setPx(g, x, y, 10);
  }
}

/* =========================== greenhouse-morning ======================= */

const greenPalette = [
  '#f9f4e6', // 0 paper
  '#cfe8ee', // 1 glass sky
  '#e2f2ec', // 2 glass bright
  '#f7f0dc', // 3 glare streak
  '#5a6b5e', // 4 iron frame dark
  '#7a8a76', // 5 iron frame
  '#a5b89e', // 6 iron frame light
  '#d9cbb2', // 7 shelf wood light
  '#b8a888', // 8 shelf wood
  '#8a7458', // 9 shelf wood dark
  '#8f8779', // 10 stone floor
  '#6e675c', // 11 stone floor gap
  '#3f7346', // 12 foliage dark
  '#4f8a52', // 13 foliage
  '#6aab62', // 14 foliage light
  '#8fc982', // 15 foliage highlight
  '#b96a45', // 16 pot terracotta
  '#96502f', // 17 pot dark
  '#d97a52', // 18 pot light
  '#e05a6e', // 19 flower red
  '#f2a5b8', // 20 flower pink
  '#ffd166', // 21 flower gold
  '#5a7d8f', // 22 watering can
  '#7a9daf', // 23 watering can light
  '#4f9ea0', // 24 fern teal
];

const greenGroups = [[1, 2, 3], [4, 5, 6], [7, 8, 9], [10, 11], [12, 13, 14, 15], [16, 17, 18], [19, 20, 21], [22, 23], [24]];

function sceneGreen(g) {
  // Glass wall backdrop
  vGradient(g, 0, 127, 0, 127, [1, 2, 1], (v) => v === 0);
  // Iron gable frame
  fillRect(g, 0, 0, 128, 5, 5);
  fillRect(g, 0, 0, 5, 128, 5);
  fillRect(g, 123, 0, 5, 128, 5);
  fillRect(g, 0, 123, 128, 5, 5);
  // Roof ribs
  line(g, 8, 42, 64, 8, 4);
  line(g, 64, 8, 120, 42, 4);
  line(g, 14, 46, 64, 14, 5);
  line(g, 64, 14, 114, 46, 5);
  // Vertical mullions — three for a calmer pane rhythm
  for (const mx of [24, 64, 104]) {
    fillRect(g, mx, 12, 2, 112, 5);
    fillRect(g, mx, 12, 1, 112, 6);
  }
  // Horizontal rails
  for (const ry of [40, 72]) {
    fillRect(g, 5, ry, 118, 3, 5);
    fillRect(g, 5, ry, 118, 1, 6);
  }
  // Glare streaks on the glass — three quiet diagonals
  for (let i = 0; i < 3; i++) {
    line(g, 34 + i * 30, 118, 56 + i * 30, 22, 3);
  }
  // Shelf left (two boards) with pots
  fillRect(g, 10, 78, 44, 4, 8);
  fillRect(g, 10, 78, 44, 1, 7);
  fillRect(g, 12, 82, 3, 22, 9); fillRect(g, 49, 82, 3, 22, 9);
  // Pots on the upper shelf
  for (const px of [16, 30, 42]) {
    fillRect(g, px, 66, 8, 12, 16);
    fillRect(g, px, 66, 8, 2, 18);
    fillRect(g, px, 76, 8, 2, 17);
  }
  // Monstera in the first pot
  fillCircle(g, 20, 58, 7, 13);
  fillEllipse(g, 16, 54, 5, 4, 14);
  fillEllipse(g, 24, 56, 4, 3, 15);
  L.setPx(g, 18, 58, 12); L.setPx(g, 21, 56, 12);
  // Flowers in the second pot
  vline(g, 33, 54, 66, 13); vline(g, 36, 56, 66, 12);
  fillCircle(g, 33, 52, 3, 19); fillCircle(g, 36, 54, 2, 21);
  // Fern in the third pot
  quadCurve(g, 45, 66, 38, 56, 32, 58, 24, 1);
  quadCurve(g, 45, 66, 52, 56, 58, 58, 24, 1);
  quadCurve(g, 45, 66, 44, 52, 40, 48, 24, 1);
  quadCurve(g, 45, 66, 48, 52, 52, 48, 13, 1);
  // Lower shelf: seedlings row
  fillRect(g, 10, 108, 44, 4, 8);
  fillRect(g, 10, 108, 44, 1, 7);
  fillRect(g, 12, 112, 3, 12, 9); fillRect(g, 49, 112, 3, 12, 9);
  for (const px of [16, 26, 36, 44]) {
    fillRect(g, px, 100, 6, 8, 17);
    fillCircle(g, px + 3, 96, 3, 14);
    L.setPx(g, px + 3, 93, 15);
  }
  // Big potted plant on the floor right
  fillPolygon(g, [[86, 96], [110, 96], [106, 120], [90, 120]], 16);
  fillRect(g, 86, 96, 24, 3, 18);
  quadCurve(g, 98, 96, 84, 74, 72, 82, 13, 2);
  quadCurve(g, 98, 96, 112, 72, 122, 80, 13, 2);
  quadCurve(g, 98, 96, 94, 64, 88, 56, 12, 2);
  quadCurve(g, 98, 96, 106, 62, 112, 54, 12, 2);
  fillCircle(g, 88, 54, 6, 14);
  fillCircle(g, 114, 52, 6, 14);
  fillCircle(g, 90, 52, 3, 15);
  fillCircle(g, 76, 80, 4, 15);
  fillCircle(g, 98, 60, 4, 20); // bloom
  fillCircle(g, 112, 62, 3, 21);
  // Watering can on the floor
  fillRect(g, 56, 108, 14, 12, 22);
  fillRect(g, 56, 108, 14, 2, 23);
  quadCurve(g, 70, 112, 78, 110, 80, 104, 22, 2);
  fillCircle(g, 80, 103, 2, 22);
  quadCurve(g, 56, 110, 50, 104, 54, 98, 22, 2);
  // Stone floor
  fillRect(g, 5, 120, 118, 3, 11);
  for (let x = 8; x < 122; x += 24) fillRect(g, x, 120, 6, 3, 10);
}

function decorateGreen(g, rand) {
  // Sun shafts through the roof
  for (let i = 0; i < 55; i++) {
    const t = i / 55;
    const x0 = 24 + t * 40;
    const y0 = 14;
    const x1 = x0 + 34;
    const y1 = 96;
    const x = Math.round(x0 + (x1 - x0) * rand());
    const y = Math.round(y0 + (y1 - y0) * rand());
    const v = L.getPx(g, x, y);
    if ((v === 1 || v === 2) && rand() < 0.5) L.setPx(g, x, y, 3);
  }
  // Foliage speckle
  for (let i = 0; i < 40; i++) {
    const x = Math.floor(rand() * 256);
    const y = Math.floor(rand() * 118);
    const v = L.getPx(g, x, y);
    if ((v === 13 || v === 14) && rand() < 0.4) L.setPx(g, x, y, v + 1);
  }
}

/* exports */

export const scenesC = [
  {
    id: 'desert-dunes',
    title: 'Desert Dunes',
    palette: desertPalette,
    groups: desertGroups,
    paper: '#f9f1dc',
    outline: '#4a2e1e',
    seed: 71,
    scene: sceneDesert,
    decorate: decorateDesert,
  },
  {
    id: 'balloon-valley',
    title: 'Balloon Valley',
    palette: balloonPalette,
    groups: balloonGroups,
    paper: '#f8f4e6',
    outline: '#2c3040',
    seed: 72,
    scene: sceneBalloon,
    decorate: decorateBalloon,
  },
  {
    id: 'aurora-fjord',
    title: 'Aurora Fjord',
    palette: auroraPalette,
    groups: auroraGroups,
    paper: '#f4eee0',
    outline: '#0e1428',
    seed: 73,
    scene: sceneAurora,
    decorate: decorateAurora,
  },
  {
    id: 'greenhouse-morning',
    title: 'Greenhouse Morning',
    palette: greenPalette,
    groups: greenGroups,
    paper: '#f9f4e6',
    outline: '#2e3630',
    seed: 74,
    scene: sceneGreen,
    decorate: decorateGreen,
  },
];
