/**
 * PixelHaven v6 scenes — batch A: rainy-night-cat, eiffel-dusk,
 * turquoise-cove, paris-cafe. All coordinates assume SIZE=128.
 */
import * as L from './art-lib.mjs';

const { fillRect, hline, vline, line, fillCircle, fillEllipse, fillTriangleUp,
  fillPolygon, quadCurve, sprinkle, radialGlow, vGradient, hGradient,
  ditherShadow, rimLight, sparkle, cloudShape, palmTree } = L;

/* ============================== rainy-night-cat ======================= */

const catPalette = [
  '#f1ead8', // 0 paper
  ...L.ramp('#161d3a', '#3a4f82', 6), // 1-6 night sky through the glass
  '#e8e4d4', // 7 moon
  '#aab8d6', // 8 moon halo
  '#2c3a63', // 9 skyline far
  '#1e2a4c', // 10 skyline near
  '#f2b95c', // 11 lit window amber
  '#ffd98a', // 12 lit window bright
  '#e8a557', // 13 lamp glow on wall
  '#5d4f62', // 14 wall trim
  '#8d7a8f', // 15 wall mauve
  '#6f5f74', // 16 wall mauve shadow
  '#b98a5a', // 17 wood light (sill top)
  '#9a6b42', // 18 wood mid (frame)
  '#7a5233', // 19 wood dark (frame shade)
  '#8a6844', // 20 floor plank
  '#6e5236', // 21 floor plank dark
  '#2a2a34', // 22 cat stripes / darkest
  '#46465a', // 23 cat body
  '#c9c2b8', // 24 cat chest
  '#f2c14e', // 25 cat eye gold
  '#5f8f5a', // 26 plant leaf
  '#3f6b42', // 27 plant leaf dark
  '#b96a45', // 28 pot terracotta
  '#96502f', // 29 pot dark
  '#7d93c4', // 30 rain streak
  '#a9bcd9', // 31 rain sheen
];

const catGroups = [[1, 2, 3, 4, 5, 6, 7, 8, 30, 31], [9, 10, 11, 12], [13, 15, 16, 14], [17, 18, 19, 20, 21], [22, 23, 24, 25], [26, 27], [28, 29]];

function sceneCat(g) {
  // Wall fills everything; the window view is carved into it.
  fillRect(g, 0, 0, 128, 128, 15);
  // Window frame block, then carve the view out of it
  fillRect(g, 12, 6, 104, 74, 18);
  vGradient(g, 15, 112, 9, 74, [1, 2, 3, 4, 5, 6], (v) => v === 18);
  fillCircle(g, 96, 24, 6, 7);
  radialGlow(g, 96, 24, 11, 8, (v) => v >= 1 && v <= 6);
  fillRect(g, 14, 52, 18, 24, 9); fillRect(g, 34, 44, 10, 32, 9);
  fillRect(g, 46, 56, 14, 20, 9); fillRect(g, 62, 40, 8, 36, 9);
  fillRect(g, 100, 48, 14, 28, 9); fillTriangleUp(g, 38, 36, 7, 44, 9);
  fillRect(g, 14, 62, 24, 14, 10); fillRect(g, 40, 58, 16, 18, 10);
  fillRect(g, 58, 64, 20, 12, 10); fillRect(g, 80, 60, 12, 16, 10);
  fillRect(g, 94, 66, 20, 10, 10);
  vline(g, 26, 56, 62, 10); vline(g, 47, 52, 58, 10); vline(g, 105, 60, 66, 10);
  for (const [wx, wy] of [[20, 66], [30, 70], [44, 62], [52, 68], [64, 68], [70, 70], [84, 64], [100, 70], [108, 68]]) {
    fillRect(g, wx, wy, 2, 2, 11);
  }
  fillRect(g, 44, 62, 2, 2, 12); fillRect(g, 70, 70, 2, 2, 12);
  // Window frame shading + mullions
  hline(g, 12, 115, 74, 19); hline(g, 12, 115, 7, 17);
  vline(g, 115, 7, 74, 19); vline(g, 12, 7, 74, 17);
  fillRect(g, 62, 9, 3, 65, 18); fillRect(g, 63, 9, 1, 65, 19);
  fillRect(g, 15, 40, 97, 3, 18); hline(g, 15, 111, 42, 19);
  // Sill
  fillRect(g, 0, 78, 128, 5, 17);
  fillRect(g, 0, 83, 128, 4, 18);
  hline(g, 0, 127, 86, 19);
  // Wall below + shadow under sill
  ditherShadow(g, 64, 92, 70, 6, 16, (v) => v === 15);
  fillRect(g, 0, 114, 128, 3, 14); // trim
  fillRect(g, 0, 117, 128, 11, 20); // floor
  for (let x = 6; x < 256; x += 24) fillRect(g, x, 117, 2, 11, 21);
  hline(g, 0, 127, 122, 21); hline(g, 0, 127, 117, 21);
  // Cat — sitting on the sill, right of center
  fillEllipse(g, 88, 68, 14, 11, 23); // haunches/body
  fillEllipse(g, 80, 73, 8, 5, 23); // front paws base
  fillCircle(g, 87, 45, 9, 23); // head
  fillTriangleUp(g, 80, 35, 4, 44, 23); // left ear
  fillTriangleUp(g, 94, 35, 4, 44, 23); // right ear
  fillTriangleUp(g, 80, 38, 2, 43, 22);
  fillTriangleUp(g, 94, 38, 2, 43, 22);
  fillEllipse(g, 87, 62, 5, 8, 24); // chest bib
  fillRect(g, 82, 44, 2, 2, 25); fillRect(g, 90, 44, 2, 2, 25); // eyes
  L.setPx(g, 82, 44, 24); L.setPx(g, 90, 44, 24); // glints
  fillRect(g, 86, 48, 2, 1, 24); // nose
  fillRect(g, 78, 52, 4, 2, 22); fillRect(g, 92, 51, 4, 2, 22); // cheek stripes
  fillRect(g, 80, 60, 14, 2, 22); fillRect(g, 82, 66, 13, 2, 22); // body stripes
  fillRect(g, 79, 72, 12, 2, 22);
  quadCurve(g, 75, 74, 62, 80, 70, 84, 22, 2); // tail curl past the mug
  quadCurve(g, 75, 74, 64, 79, 70, 83, 23, 1);
  rimLight(g, 66, 30, 106, 80, 23, 31, 'up', 0.6); // window sheen on the fur
  // Framed night picture on the wall
  fillRect(g, 8, 96, 22, 16, 19);
  fillRect(g, 10, 98, 18, 12, 1);
  fillRect(g, 12, 102, 5, 8, 9);
  fillRect(g, 19, 100, 4, 10, 9);
  fillCircle(g, 24, 101, 1, 7);
  // Mug of cocoa
  fillRect(g, 64, 71, 7, 8, 11);
  fillRect(g, 71, 73, 2, 3, 11); // handle
  fillRect(g, 64, 71, 7, 2, 12);
  // Plant on the left — a tidy leafy bush
  fillRect(g, 20, 68, 12, 10, 28);
  fillRect(g, 20, 68, 12, 2, 29);
  fillCircle(g, 22, 60, 5, 26);
  fillCircle(g, 31, 57, 6, 26);
  fillCircle(g, 26, 51, 5, 27);
  fillCircle(g, 34, 64, 4, 27);
  fillCircle(g, 17, 53, 4, 27);
  L.setPx(g, 25, 62, 26); L.setPx(g, 29, 60, 26); L.setPx(g, 23, 55, 26);
  // Warm lamp glow from the right
  radialGlow(g, 124, 98, 34, 13, (v) => v === 15 || v === 16);
  ditherShadow(g, 0, 96, 10, 40, 16, (v) => v === 15);
}

function decorateCat(g, rand) {
  // Rain streaks over the pane — long and quiet
  for (let i = 0; i < 26; i++) {
    const x = 15 + Math.floor(rand() * 97);
    const y = 9 + Math.floor(rand() * 42);
    const len = 3 + Math.floor(rand() * 5);
    for (let k = 0; k < len; k++) setIfSky(g, x, y + k, 30);
    if (rand() < 0.35) setIfSky(g, x + 1, y + len, 31);
  }
  // Sheen diagonal on glass
  for (let d = 0; d < 22; d++) setIfSky(g, 24 + d, 16 + Math.floor(d * 0.55), 31);
  // Stars
  sparkle(g, rand, 18, 10, 108, 30, [7, 8], 4);
  // Steam from the mug
  for (let i = 0; i < 7; i++) {
    const y = 60 + i * 2;
    const x = 67 + Math.round(Math.sin(i * 0.8) * 2);
    setIfSky(g, x, y, 31); setIfSky(g, x, y - 1, 31);
  }
}

function setIfSky(g, x, y, v) {
  const cur = L.getPx(g, x, y);
  if (cur !== undefined && cur >= 1 && cur <= 6) L.setPx(g, x, y, v);
}

/* ================================ eiffel-dusk ========================= */

const eiffelPalette = [
  '#f6ecd9', // 0 paper
  ...L.ramp('#ffd9a8', '#372c52', 6), // 1-6 dusk sky
  '#ffedb8', // 7 sun
  '#ffe2b0', // 8 sun halo
  '#f7c4b0', // 9 cloud light
  '#b07a90', // 10 cloud shade
  '#3a2f4d', // 11 birds
  '#3f5940', // 12 park grass
  '#c9b394', // 13 gravel path
  '#a89272', // 14 path edge
  '#2f4630', // 15 tree dark
  '#5a7d54', // 16 tree highlight
  '#2d2440', // 17 tower silhouette
  '#ffe9a0', // 18 tower beacon
  '#e8d9c0', // 19 facade
  '#6a7080', // 20 mansard zinc
  '#5d6b80', // 21 windows
  '#c9b8a5', // 22 balcony lines
  '#8fb0b5', // 23 fountain basin
  '#a9d4d8', // 24 fountain water
  '#4a3f5e', // 25 tower lattice iron
];

const eiffelGroups = [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 18], [12, 15, 16], [13, 14], [17, 25], [19, 20, 21, 22], [23, 24]];

function sceneEiffel(g) {
  vGradient(g, 0, 127, 0, 95, [1, 2, 3, 4, 5, 6]);
  // Low sun
  fillCircle(g, 30, 74, 8, 7);
  radialGlow(g, 30, 74, 17, 8, (v) => v >= 1 && v <= 6);
  // Cumulus clouds with flat bottoms + shaded undersides
  cloudShape(g, 26, 36, 48, 8, 9, 10);
  cloudShape(g, 104, 26, 40, 7, 9, 10);
  cloudShape(g, 66, 58, 30, 4, 9, 10);
  // Birds
  for (const [bx, by] of [[18, 18], [26, 22], [110, 40], [102, 44]]) {
    hline(g, bx - 2, bx - 1, by, 11); hline(g, bx + 1, bx + 2, by, 11);
    setPx2(g, bx, by - 1, 11);
  }
  // Park ground
  fillRect(g, 0, 96, 128, 32, 12);
  fillPolygon(g, [[56, 96], [76, 96], [92, 128], [36, 128]], 13);
  hline(g, 56, 76, 96, 14);
  // Haussmann blocks flanking (behind the tower)
  fillRect(g, 0, 66, 30, 30, 19);
  fillRect(g, 0, 62, 30, 5, 20);
  fillRect(g, 4, 56, 4, 6, 20); fillRect(g, 22, 56, 4, 6, 20);
  fillRect(g, 112, 74, 16, 22, 19);
  fillRect(g, 112, 70, 16, 5, 20);
  fillRect(g, 117, 65, 4, 5, 20);
  for (let y = 70; y < 92; y += 6) {
    for (let x = 3; x < 27; x += 12) fillRect(g, x, y, 3, 3, 21);
  }
  for (let y = 78; y < 94; y += 6) {
    for (let x = 114; x < 126; x += 12) fillRect(g, x, y, 3, 3, 21);
  }
  hline(g, 0, 29, 84, 22); hline(g, 112, 127, 88, 22);
  // Fountain left of the path
  fillEllipse(g, 44, 106, 10, 4, 23);
  fillEllipse(g, 44, 105, 7, 2, 24);
  fillRect(g, 43, 96, 3, 10, 23);
  fillCircle(g, 44, 95, 2, 24);
  // Eiffel tower (right of the sun, over the park)
  towerFill(g);
  // Trees along the park
  fillCircle(g, 14, 104, 6, 15); fillCircle(g, 118, 106, 7, 15);
  fillCircle(g, 12, 102, 3, 16); fillCircle(g, 116, 104, 3, 16);
  fillCircle(g, 32, 112, 5, 15); fillCircle(g, 100, 114, 5, 15);
  // Park benches
  fillRect(g, 22, 116, 8, 2, 14); fillRect(g, 23, 118, 1, 3, 14); fillRect(g, 28, 118, 1, 3, 14);
  // Lamp posts along path
  fillRect(g, 54, 104, 2, 12, 17); fillCircle(g, 55, 102, 2, 18);
  fillRect(g, 80, 110, 2, 10, 17); fillCircle(g, 81, 108, 2, 18);
}

/**
 * Eiffel silhouette with true proportions: concave flaring legs, great arch,
 * two platforms, slender tapering spire, antenna. Lattice braces in the
 * lighter iron tone; arch openings carved back to the sky ramp.
 */
function towerFill(g) {
  const ax = 88; // center axis
  const GROUND = 96;
  // antenna
  vline(g, ax, 6, 15, 17);
  // top platform cap
  fillRect(g, ax - 3, 15, 7, 3, 17);
  // upper spire: y18 (half 2) → y41 (half 7), concave (slow at top, fast at bottom)
  for (let y = 18; y <= 41; y++) {
    const t = (y - 18) / 23;
    const half = 2 + Math.round(Math.pow(t, 1.35) * 5);
    hline(g, ax - half, ax + half, y, 17);
  }
  // second platform
  fillRect(g, ax - 8, 41, 17, 4, 17);
  hline(g, ax - 8, ax + 8, 44, 25);
  // middle section: y45 (half 7) → y70 (half 11), slight concave
  for (let y = 45; y <= 70; y++) {
    const t = (y - 45) / 25;
    const half = 7 + Math.round(Math.pow(t, 1.2) * 4);
    hline(g, ax - half, ax + half, y, 17);
  }
  // first platform
  fillRect(g, ax - 12, 70, 25, 5, 17);
  hline(g, ax - 12, ax + 12, 74, 25);
  // legs: y75 → y96, outer edge flares with a power curve, inner edge follows
  for (let y = 75; y <= GROUND; y++) {
    const t = (y - 75) / 21;
    const outer = 12 + Math.round(Math.pow(t, 1.7) * 9);
    const inner = 7 + Math.round(Math.pow(t, 1.35) * 6);
    hline(g, ax - outer, ax - inner, y, 17);
    hline(g, ax + inner, ax + outer, y, 17);
  }
  // great arch: carve sky between the legs below y78
  for (let y = 78; y <= GROUND; y++) {
    for (let x = ax - 13; x <= ax + 13; x++) {
      const dx = (x - ax) / 12;
      const dy = (y - 99) / 21;
      if (dx * dx + dy * dy <= 1) {
        const s = skyAt(y);
        if (s !== null) L.setPx(g, x, y, s);
      }
    }
  }
  // lattice X-braces — middle section
  for (let y = 46; y <= 64; y += 5) {
    const t = (y - 45) / 25;
    const half = 7 + Math.round(Math.pow(t, 1.2) * 4) - 1;
    line(g, ax - half, y, ax + half, Math.min(69, y + 5), 25);
    line(g, ax + half, y, ax - half, Math.min(69, y + 5), 25);
  }
  // lattice braces — spire
  for (let y = 22; y <= 34; y += 5) {
    const t = (y - 18) / 23;
    const half = 2 + Math.round(Math.pow(t, 1.35) * 5);
    if (half >= 3) {
      line(g, ax - half, y, ax + half, Math.min(40, y + 5), 25);
      line(g, ax + half, y, ax - half, Math.min(40, y + 5), 25);
    }
  }
  // lattice braces — inside each leg (below the arch spring line)
  for (let y = 80; y <= 92; y += 4) {
    const t = (y - 75) / 21;
    const outer = 12 + Math.round(Math.pow(t, 1.7) * 9) - 1;
    const inner = 7 + Math.round(Math.pow(t, 1.35) * 6) + 1;
    line(g, ax - outer, y, ax - inner, Math.min(95, y + 4), 25);
    line(g, ax - inner, y, ax - outer, Math.min(95, y + 4), 25);
    line(g, ax + inner, y, ax + outer, Math.min(95, y + 4), 25);
    line(g, ax + outer, y, ax + inner, Math.min(95, y + 4), 25);
  }
  // horizontal tie under the arch + splayed feet
  fillRect(g, ax - 21, 93, 10, 5, 17);
  fillRect(g, ax + 11, 93, 10, 5, 17);
  fillRect(g, ax - 13, 75, 27, 2, 25); // arch tie beam
}

function skyAt(y) {
  const t = (y / 95) * 5;
  return 1 + Math.min(4, Math.max(0, Math.floor(t))); // solid nearest stop, 1..5
}

function setPx2(g, x, y, v) { L.setPx(g, x, y, v); }

function decorateEiffel(g, rand) {
  // Tower beacon shimmer
  sparkle(g, rand, 84, 6, 92, 14, [18], 2);
  // Fountain spray
  sparkle(g, rand, 41, 92, 48, 97, [24], 2);
  // Sun path on gravel
  for (let i = 0; i < 18; i++) {
    const x = 56 + Math.floor(rand() * 22);
    const y = 98 + Math.floor(rand() * 28);
    const v = L.getPx(g, x, y);
    if (v === 13 && rand() < 0.5) L.setPx(g, x, y, 7);
  }
}

/* ============================== turquoise-cove ======================== */

const covePalette = [
  '#f8f3e4', // 0 paper
  '#bfe8ec', // 1 sky high
  '#e8f7f2', // 2 sky mid
  '#fdf6dc', // 3 sky low haze
  '#fff2c0', // 4 sun
  '#ffe9a8', // 5 sun halo
  '#0e5e72', // 6 sea deep
  '#14788a', // 7 sea deep-mid
  '#1e93a0', // 8 sea mid
  '#35b0ac', // 9 sea shallow
  '#63cdc4', // 10 sea light
  '#93e0d6', // 11 sea foam fringe
  '#d9f2ee', // 12 horizon glint
  '#c94f43', // 13 boat hull / accents
  '#5d4a3a', // 14 wood mast
  '#fbf7ea', // 15 sail white / foam
  '#d9d2c0', // 16 sail shade
  '#f2ddb0', // 17 sand
  '#e0c48e', // 18 wet sand / shadows
  '#3f8a52', // 19 palm frond
  '#5aa866', // 20 palm frond light
  '#8a6242', // 21 palm trunk
  '#6e4c32', // 22 palm trunk dark
  '#f2705e', // 23 umbrella coral
  '#f2a5b8', // 24 towel pink
  '#ffd166', // 25 beach ball / starfish
  '#7a7a72', // 26 rocks
  '#9a9a8e', // 27 rock highlight
];

const coveGroups = [[1, 2, 3, 4, 5], [6, 7, 8, 9, 10, 11, 12], [13, 14, 15, 16], [17, 18], [19, 20], [21, 22], [23, 15], [24, 15], [25, 23], [26, 27]];

function sceneCove(g) {
  vGradient(g, 0, 127, 0, 51, [1, 2, 3]);
  fillCircle(g, 24, 15, 6, 4);
  radialGlow(g, 24, 15, 12, 5, (v) => v >= 1 && v <= 3);
  // Sea
  vGradient(g, 0, 127, 52, 87, [6, 7, 8, 9, 10, 11]);
  hline(g, 0, 127, 52, 12);
  // Sailboat on the horizon
  fillRect(g, 84, 58, 12, 3, 13);
  fillRect(g, 89, 44, 1, 14, 14);
  fillPolygon(g, [[90, 44], [90, 57], [100, 57]], 15);
  fillPolygon(g, [[88, 47], [88, 57], [82, 57]], 16);
  // Beach: sand polygon with curve
  fillPolygon(g, [[0, 100], [18, 94], [44, 90], [78, 89], [108, 92], [128, 90], [128, 128], [0, 128]], 17);
  // Wet sand strip along waterline
  fillPolygon(g, [[0, 100], [18, 94], [44, 90], [78, 89], [108, 92], [128, 90], [128, 94], [108, 96], [78, 93], [44, 94], [18, 98], [0, 104]], 18);
  // Palm tree leaning in from the left (v6 structured palm)
  palmTree(g, 10, 106, 42, 22, 21, 22, 19, 20);
  // Umbrella planted on the sand
  fillRect(g, 92, 90, 1, 18, 14);
  for (let w = 0; w < 6; w++) {
    const x0 = 80 + w * 5;
    fillPolygon(g, [[x0, 90], [x0 + 5, 90], [92, 76]], w % 2 === 0 ? 23 : 15);
  }
  fillRect(g, 80, 89, 25, 2, 23);
  ditherShadow(g, 96, 110, 14, 3, 18, (v) => v === 17);
  // Towel + beach ball + starfish
  fillPolygon(g, [[30, 112], [52, 108], [56, 118], [34, 122]], 24);
  hline(g, 34, 54, 115, 15); hline(g, 33, 53, 119, 15);
  fillCircle(g, 70, 112, 5, 25);
  fillPolygon(g, [[70, 107], [73, 112], [70, 112]], 23);
  fillCircle(g, 69, 111, 1, 15);
  // Starfish
  fillRect(g, 108, 116, 3, 3, 25);
  L.setPx(g, 109, 114, 25); L.setPx(g, 109, 119, 25); L.setPx(g, 107, 117, 25); L.setPx(g, 111, 117, 25);
  // Rocks framing the cove
  fillEllipse(g, 122, 96, 10, 7, 26);
  fillEllipse(g, 118, 93, 5, 3, 27);
  fillEllipse(g, 6, 92, 8, 5, 26);
  // Gulls
  for (const [bx, by] of [[56, 22], [64, 18]]) {
    hline(g, bx - 2, bx - 1, by, 26); hline(g, bx + 1, bx + 2, by, 26);
  }
}

function decorateCove(g, rand) {
  // Foam scallops along the waterline
  for (let x = 0; x < 256; x += 16) {
    const y = 90 + Math.round(Math.sin(x * 0.09) * 2);
    for (let k = 0; k < 3; k++) {
      const v = L.getPx(g, x + k, y + k - 1);
      if (v === 10 || v === 11 || v === 6 || v === 18) L.setPx(g, x + k, y + k - 1, 15);
    }
  }
  // Sun glints — sparse, plus-shaped
  sparkle(g, rand, 8, 56, 120, 82, [15, 12], 8);
  // Sand grain — only on dry sand below the wet strip
  for (let i = 0; i < 36; i++) {
    const x = Math.floor(rand() * 256);
    const y = 100 + Math.floor(rand() * 26);
    if (L.getPx(g, x, y) === 17 && rand() < 0.6) L.setPx(g, x, y, 18);
  }
}

/* ================================ paris-cafe ========================== */

const cafePalette = [
  '#f6ecd9', // 0 paper
  '#d9a878', // 1 facade
  '#c99a6c', // 2 facade siding
  '#8a99ad', // 3 window glass
  '#e8c9a0', // 4 window frame
  '#4f6b52', // 5 shutters
  '#e05a6e', // 6 flowers
  '#5f8f5a', // 7 leaves
  '#c94f43', // 8 awning red
  '#f6ecd9', // 9 awning cream
  '#a83c33', // 10 awning shade
  '#b98a5e', // 11 shaded wall
  '#e8e4da', // 12 marble top
  '#b8b2a4', // 13 marble edge
  '#3a3a3a', // 14 iron dark
  '#fbf7ea', // 15 cup / white
  '#6e4c32', // 16 coffee
  '#d9a05a', // 17 croissant
  '#b57f42', // 18 croissant shade
  '#5a7d8f', // 19 vase
  '#c9a05a', // 20 chair seat
  '#2e3830', // 21 chalkboard
  '#d9d9cf', // 22 chalk lines
  '#8f8779', // 23 cobble
  '#6e675c', // 24 cobble gap
  '#f2c98a', // 25 golden light
  '#6b5a4a', // 26 chair wood light
];

const cafeGroups = [[1, 2, 25], [3, 4], [5], [6, 7], [8, 9, 10], [11], [12, 13], [14, 15], [16], [17, 18], [19], [20, 26], [21, 22], [23, 24]];

function sceneCafe(g) {
  // Facade with siding
  fillRect(g, 0, 0, 128, 104, 1);
  for (let y = 6; y < 104; y += 7) hline(g, 0, 127, y, 2);
  // Golden hour wash from the right
  hGradient(g, 76, 127, 0, 103, [1, 25], (v) => v === 1 || v === 25);
  // Windows with shutters
  for (const [wx] of [[14], [86]]) {
    fillRect(g, wx, 12, 24, 34, 4);
    fillRect(g, wx + 3, 15, 18, 28, 3);
    vline(g, wx + 12, 15, 42, 4);
    hline(g, wx + 3, wx + 20, 29, 4);
    fillRect(g, wx - 6, 12, 6, 34, 5);
    fillRect(g, wx + 24, 12, 6, 34, 5);
    fillRect(g, wx + 2, 46, 20, 4, 4);
    fillRect(g, wx + 2, 44, 20, 2, 7);
    for (let fx = wx + 3; fx < wx + 21; fx += 16) {
      fillCircle(g, fx + 1, 44, 2, 6);
      L.setPx(g, fx + 1, 42, 7);
    }
  }
  // Awning with scallops
  fillRect(g, 0, 56, 128, 20, 9);
  for (let x = 0; x < 256; x += 32) fillRect(g, x, 56, 8, 20, 8);
  for (let x = 0; x < 256; x += 32) {
    fillCircle(g, x + 4, 76, 4, 8);
    fillCircle(g, x + 12, 76, 4, 9);
  }
  fillRect(g, 0, 74, 128, 2, 10);
  // Under-awning shaded wall strip
  fillRect(g, 0, 78, 128, 8, 11);
  // Bistro table
  fillEllipse(g, 64, 92, 13, 4, 12);
  fillEllipse(g, 64, 90, 13, 4, 13);
  fillEllipse(g, 64, 89, 12, 3, 12);
  fillRect(g, 63, 94, 3, 20, 14);
  fillRect(g, 58, 114, 12, 2, 14);
  // Cup + saucer
  fillEllipse(g, 56, 88, 4, 1, 15);
  fillRect(g, 53, 84, 6, 4, 15);
  fillRect(g, 59, 85, 2, 2, 15);
  fillRect(g, 54, 84, 4, 1, 16);
  // Croissant
  fillEllipse(g, 72, 87, 6, 3, 17);
  fillEllipse(g, 70, 86, 3, 2, 18);
  fillEllipse(g, 75, 86, 2, 2, 18);
  // Vase with flower
  fillRect(g, 66, 82, 4, 6, 19);
  vline(g, 68, 76, 82, 7);
  fillCircle(g, 68, 74, 3, 6);
  fillCircle(g, 68, 74, 1, 25);
  // Chairs
  for (const cx of [38, 92]) {
    fillRect(g, cx, 86, 14, 2, 26);
    fillRect(g, cx + 1, 88, 12, 2, 20);
    fillRect(g, cx, 90, 2, 22, 14);
    fillRect(g, cx + 12, 90, 2, 22, 14);
    fillRect(g, cx, 96, 14, 2, 14);
  }
  // Chalkboard menu
  fillPolygon(g, [[16, 104], [34, 104], [30, 128], [20, 128]], 14);
  fillPolygon(g, [[19, 107], [31, 107], [28, 124], [22, 124]], 21);
  hline(g, 22, 28, 111, 22); hline(g, 22, 28, 114, 22);
  hline(g, 23, 27, 117, 22);
  // Cobblestones
  fillRect(g, 0, 104, 128, 24, 24);
  for (let y = 104; y < 256; y += 4) {
    const off = ((y - 104) / 4) % 2 === 0 ? 0 : 3;
    for (let x = off; x < 256; x += 7) {
      fillRect(g, x, y, 5, 3, 23);
    }
  }
  // Hanging flower basket right
  vline(g, 118, 78, 84, 14);
  fillRect(g, 114, 84, 9, 7, 19);
  fillRect(g, 114, 84, 9, 2, 14);
  fillCircle(g, 116, 82, 2, 6); fillCircle(g, 120, 82, 2, 6);
  fillCircle(g, 118, 80, 2, 6);
  L.setPx(g, 112, 90, 7); L.setPx(g, 125, 89, 7); L.setPx(g, 118, 92, 7);
}

function decorateCafe(g, rand) {
  // Steam from the cup
  for (let i = 0; i < 9; i++) {
    const y = 76 + i * 2;
    const x = 56 + Math.round(Math.sin(i * 0.7) * 2);
    const v = L.getPx(g, x, y);
    if (v === 11 || v === 1) L.setPx(g, x, y, 15);
  }
  // Awning stripe weave dither
  for (let i = 0; i < 60; i++) {
    const x = Math.floor(rand() * 256);
    const y = 58 + Math.floor(rand() * 16);
    const v = L.getPx(g, x, y);
    if (v === 8 && (x & 3) === 0 && (y & 3) === 0) L.setPx(g, x, y, 10);
  }
  // Golden dust in the light shaft
  for (let i = 0; i < 24; i++) {
    const x = 80 + Math.floor(rand() * 44);
    const y = 60 + Math.floor(rand() * 40);
    const v = L.getPx(g, x, y);
    if ((v === 25 || v === 1) && rand() < 0.5) L.setPx(g, x, y, 15);
  }
}

/* exports */

export const scenesA = [
  {
    id: 'rainy-night-cat',
    title: 'Rainy Night Cat',
    palette: catPalette,
    groups: catGroups,
    paper: '#f1ead8',
    outline: '#241f2e',
    seed: 51,
    scene: sceneCat,
    decorate: decorateCat,
  },
  {
    id: 'eiffel-dusk',
    title: 'Eiffel Tower at Dusk',
    palette: eiffelPalette,
    groups: eiffelGroups,
    paper: '#f6ecd9',
    outline: '#2a2138',
    seed: 52,
    scene: sceneEiffel,
    decorate: decorateEiffel,
  },
  {
    id: 'turquoise-cove',
    title: 'Turquoise Cove',
    palette: covePalette,
    groups: coveGroups,
    paper: '#f8f3e4',
    outline: '#2e4a50',
    seed: 53,
    scene: sceneCove,
    decorate: decorateCove,
  },
  {
    id: 'paris-cafe',
    title: 'Paris Café Terrace',
    palette: cafePalette,
    groups: cafeGroups,
    paper: '#f6ecd9',
    outline: '#33261e',
    seed: 54,
    scene: sceneCafe,
    decorate: decorateCafe,
  },
];
