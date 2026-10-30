/**
 * PixelHaven scenes — batch D: floating-tree, the reference-inspired hero
 * scene (user's screenshot "floating tree"): a lush floating island with an
 * oversized multi-tone canopy, magenta trunk and hanging roots, faceted rock
 * underside, cyan crystals, drifting side islands and flat-bottom clouds.
 * Farm/animals from the reference are intentionally excluded.
 * All coordinates assume SIZE=128.
 */
import * as L from './art-lib.mjs';

const { fillRect, fillCircle, fillEllipse, fillPolygon, quadCurve, setPx, getPx,
  sprinkle, ditherStrip } = L;

/* palette: 0 paper — neutral cream so uncolored cells read as empty */
const treePalette = [
  '#f6f0e2', // 0 paper (uncolored cells)
  '#4f8ec9', // 1 sky deep (top)
  '#64a1d6', // 2 sky mid
  '#7db4e0', // 3 sky light (horizon)
  '#fdfdfa', // 4 cloud body
  '#d8e7f3', // 5 cloud shade
  '#b5d05e', // 6 canopy light (sun-lime)
  '#8bb04a', // 7 canopy mid
  '#5f8a3a', // 8 canopy deep
  '#31501f', // 9 canopy shadow (near-black green dapples)
  '#c864a8', // 10 canopy accent (magenta leaves)
  '#c86f9f', // 11 trunk light
  '#a34a7e', // 12 trunk mid
  '#6f2f58', // 13 trunk dark
  '#9aa6ab', // 14 rock light
  '#77848b', // 15 rock mid
  '#55616a', // 16 rock dark
  '#3a454e', // 17 rock deepest
  '#9adb62', // 18 grass light
  '#6db54b', // 19 grass mid
  '#498f38', // 20 grass dark
  '#d6f2f9', // 21 crystal light
  '#8fd6ec', // 22 crystal mid
  '#4fa8cf', // 23 crystal deep
];

/* one material per group → shading inside a material never gets outlines */
const treeGroups = [
  [1, 2, 3], // sky
  [4, 5], // clouds
  [6, 7, 8, 9, 10], // canopy
  [11, 12, 13], // trunk + roots
  [14, 15, 16, 17], // island rock
  [18, 19, 20], // grass
  [21, 22, 23], // crystals
];

function sceneTree(g) {
  /* 1. flat sky: solid bands + narrow dithered seams (no surface noise) */
  fillRect(g, 0, 0, 128, 128, 2);
  fillRect(g, 0, 0, 128, 34, 1);
  fillRect(g, 0, 94, 128, 34, 3);
  ditherStrip(g, 0, 127, 34, 1, 2, 0.7);
  ditherStrip(g, 0, 127, 35, 1, 2, 0.4);
  ditherStrip(g, 0, 127, 36, 1, 2, 0.15);
  ditherStrip(g, 0, 127, 91, 2, 3, 0.85);
  ditherStrip(g, 0, 127, 92, 2, 3, 0.5);
  ditherStrip(g, 0, 127, 93, 2, 3, 0.2);

  /* 2. clouds behind everything */
  L.cloudShape(g, 20, 22, 30, 6, 4, 5);
  L.cloudShape(g, 100, 14, 26, 5, 4, 5);
  L.cloudShape(g, 10, 66, 20, 5, 4, 5);
  L.cloudShape(g, 112, 88, 24, 5, 4, 5);
  L.cloudShape(g, 26, 122, 44, 8, 4, 5);
  L.cloudShape(g, 100, 124, 40, 7, 4, 5);

  /* 3. drifting side islands (grass cap + rock keel + a crystal each) */
  // left island
  fillEllipse(g, 16, 78, 9, 3, 19);
  fillEllipse(g, 15, 77, 7, 2, 18);
  fillPolygon(g, [[9, 79], [23, 79], [20, 86], [16, 89], [12, 86]], 15);
  fillPolygon(g, [[12, 82], [20, 82], [18, 87], [14, 87]], 16);
  setPx(g, 16, 88, 17);
  fillPolygon(g, [[12, 86], [14, 86], [13, 93], [12, 92]], 22);
  fillPolygon(g, [[12, 86], [13, 86], [13, 92], [12, 92]], 21);
  // right island
  fillEllipse(g, 114, 60, 8, 3, 19);
  fillEllipse(g, 113, 59, 6, 2, 18);
  fillPolygon(g, [[108, 61], [120, 61], [118, 68], [114, 71], [110, 68]], 15);
  fillPolygon(g, [[114, 64], [119, 63], [117, 68], [113, 69]], 16);
  fillPolygon(g, [[116, 67], [119, 66], [118, 74], [116, 73]], 22);
  fillPolygon(g, [[116, 67], [117, 67], [117, 73], [116, 73]], 21);
  L.line(g, 119, 66, 118, 74, 23);

  /* 4. main island rock keel */
  fillPolygon(g, [[38, 62], [90, 62], [87, 70], [80, 78], [72, 86], [64, 94], [56, 86], [48, 78], [41, 70]], 15);
  // lit band right under the grass lip
  fillPolygon(g, [[42, 62], [86, 62], [83, 67], [45, 67]], 14);
  // faceted shards
  fillPolygon(g, [[46, 68], [58, 70], [52, 80], [44, 74]], 16);
  fillPolygon(g, [[68, 70], [82, 68], [76, 78], [66, 76]], 16);
  fillPolygon(g, [[56, 82], [72, 82], [66, 90], [60, 90]], 17);
  setPx(g, 46, 78, 16); setPx(g, 47, 79, 16); setPx(g, 62, 76, 14); setPx(g, 76, 74, 14);
  setPx(g, 54, 88, 16); setPx(g, 74, 88, 16); setPx(g, 64, 90, 17); setPx(g, 44, 72, 14);

  /* 5. short hanging roots (magenta tendrils hugging the keel) */
  quadCurve(g, 54, 88, 51, 96, 47, 104, 12, 2);
  quadCurve(g, 55, 89, 53, 96, 48, 103, 13, 1);
  quadCurve(g, 60, 90, 57, 97, 56, 102, 12, 1);
  quadCurve(g, 74, 88, 76, 96, 74, 103, 13, 2);
  quadCurve(g, 64, 93, 63, 99, 62, 105, 13, 2);
  quadCurve(g, 68, 91, 68, 98, 66, 104, 13, 2);
  // boulder caught on the left root, with a grass tuft
  fillCircle(g, 47, 106, 3, 15);
  setPx(g, 48, 107, 16); setPx(g, 46, 107, 16);
  fillEllipse(g, 47, 104, 3, 1, 19);
  // small rock on the right root tip
  fillCircle(g, 74, 105, 2, 15);
  setPx(g, 75, 106, 16);

  /* 6. chunky crystals hugging the island sides */
  // left cluster
  fillPolygon(g, [[40, 72], [46, 74], [44, 90], [40, 87]], 22);
  fillPolygon(g, [[40, 72], [42, 73], [42, 88], [40, 87]], 21);
  L.line(g, 46, 74, 44, 90, 23);
  fillPolygon(g, [[47, 77], [52, 78], [50, 88], [47, 86]], 23);
  fillPolygon(g, [[47, 77], [48, 77], [49, 87], [47, 86]], 21);
  // right cluster
  fillPolygon(g, [[80, 70], [86, 72], [84, 88], [80, 85]], 22);
  fillPolygon(g, [[80, 70], [81, 71], [81, 86], [80, 85]], 21);
  L.line(g, 86, 72, 84, 88, 23);
  fillPolygon(g, [[87, 75], [91, 76], [90, 84], [87, 83]], 21);
  L.line(g, 91, 76, 90, 84, 23);
  // one crystal hanging under the island tip
  fillPolygon(g, [[61, 92], [66, 92], [65, 103], [61, 101]], 21);
  L.line(g, 66, 92, 65, 103, 23);

  /* 7. grass cap (wider than the rock so the lip hangs over) */
  fillEllipse(g, 64, 62, 34, 7, 19);
  fillEllipse(g, 62, 60, 30, 4, 18);
  for (let y = 66; y <= 69; y++) {
    for (let x = 30; x <= 98; x++) {
      const v = getPx(g, x, y);
      if (v === 19 || v === 18) {
        const nx = (x - 64) / 34;
        const ny = (y - 62) / 7;
        if (nx * nx + ny * ny <= 1) setPx(g, x, y, 20);
      }
    }
  }
  // tufts on top
  for (const [tx, ty] of [[42, 57], [50, 56], [58, 55], [72, 56], [80, 57], [88, 59], [34, 59], [94, 60]]) {
    setPx(g, tx, ty, 18); setPx(g, tx + 1, ty - 1, 18); setPx(g, tx - 1, ty, 19);
  }

  /* 8. trunk: magenta, S-curved, with root flares and branch stubs */
  quadCurve(g, 64, 62, 62, 52, 65, 34, 12, 5);
  quadCurve(g, 66, 62, 64, 52, 67, 34, 13, 2);
  quadCurve(g, 62, 62, 60, 52, 63, 34, 11, 2);
  // flares where the trunk meets the grass
  fillPolygon(g, [[58, 64], [63, 59], [61, 65]], 12);
  fillPolygon(g, [[70, 64], [65, 59], [67, 65]], 13);
  // branch stubs reaching into the crown
  quadCurve(g, 65, 38, 72, 35, 76, 31, 12, 2);
  quadCurve(g, 63, 36, 56, 33, 52, 30, 13, 2);

  /* 9. canopy — oversized, lobed, multi-tone */
  // mid-green mass
  fillCircle(g, 64, 22, 20, 7);
  fillCircle(g, 38, 28, 14, 7);
  fillCircle(g, 90, 28, 14, 7);
  fillCircle(g, 26, 38, 10, 7);
  fillCircle(g, 102, 38, 10, 7);
  fillCircle(g, 46, 12, 12, 7);
  fillCircle(g, 82, 12, 12, 7);
  fillCircle(g, 64, 8, 10, 7);
  fillCircle(g, 32, 20, 8, 7);
  fillCircle(g, 96, 18, 8, 7);
  fillCircle(g, 50, 36, 12, 7);
  fillCircle(g, 78, 36, 12, 7);
  fillCircle(g, 64, 34, 12, 7);
  // light clusters (sun from the top-left)
  fillCircle(g, 58, 16, 12, 6);
  fillCircle(g, 36, 22, 8, 6);
  fillCircle(g, 80, 18, 9, 6);
  fillCircle(g, 93, 24, 7, 6);
  fillCircle(g, 46, 8, 7, 6);
  fillCircle(g, 66, 5, 6, 6);
  fillCircle(g, 28, 33, 6, 6);
  fillCircle(g, 97, 34, 6, 6);
  fillCircle(g, 58, 32, 7, 6);
  fillCircle(g, 74, 31, 6, 6);
  // deep crescents on the lower-right of each lobe
  fillCircle(g, 48, 32, 8, 8);
  fillCircle(g, 74, 33, 8, 8);
  fillCircle(g, 90, 34, 7, 8);
  fillCircle(g, 34, 38, 7, 8);
  fillCircle(g, 102, 40, 7, 8);
  fillCircle(g, 64, 40, 10, 8);
  fillCircle(g, 54, 24, 6, 8);
  // chunky near-black dapples, hand-placed like the reference
  for (const [dx, dy] of [
    [40, 30], [41, 31], [58, 24], [59, 25], [76, 26], [77, 27], [90, 22],
    [34, 36], [35, 37], [96, 36], [97, 37], [64, 16], [50, 18], [70, 20],
    [86, 28], [46, 26], [92, 40], [30, 40], [102, 32], [62, 32], [68, 34],
    [44, 14], [84, 14], [56, 12], [72, 38], [38, 24], [98, 26],
    [48, 28], [52, 29], [80, 30], [42, 34], [94, 28], [100, 36],
    [56, 36], [32, 34], [78, 38], [58, 20], [76, 18], [50, 22],
  ]) {
    setPx(g, dx, dy, 9);
  }
  // magenta accent leaves scattered through the crown
  sprinkle(g, L.prng(7712), 26, 6, 102, 42, [10], 26);

  /* canopy fringe: separated lobes with sky notches between them */
  fillCircle(g, 44, 42, 4, 7);
  fillCircle(g, 56, 44, 4, 7);
  fillCircle(g, 72, 44, 4, 7);
  fillCircle(g, 84, 42, 4, 7);
  fillCircle(g, 44, 42, 2, 6);
  fillCircle(g, 56, 44, 2, 6);
  // notch the gaps so the lobes read as distinct clusters
  fillCircle(g, 50, 46, 2, 2);
  fillCircle(g, 78, 46, 2, 2);
  fillCircle(g, 38, 44, 2, 2);
  fillCircle(g, 90, 44, 2, 2);
  // a few deep cells under the fringe lobes for weight
  setPx(g, 44, 46, 8); setPx(g, 45, 46, 8); setPx(g, 56, 48, 8);
  setPx(g, 72, 48, 8); setPx(g, 84, 46, 8); setPx(g, 85, 46, 8);
}

function decorateTree(g, rand) {
  /* falling leaves drifting to the lower-right, like the reference */
  const leaves = [
    [108, 52, 6], [112, 58, 8], [104, 64, 10], [116, 48, 6], [100, 56, 6],
    [16, 50, 6], [12, 56, 8], [20, 46, 10], [8, 44, 6], [118, 62, 10],
    [40, 110, 6], [92, 112, 8], [58, 118, 10], [106, 106, 6], [22, 108, 8],
    [110, 70, 6], [14, 64, 10],
  ];
  for (const [x, y, c] of leaves) {
    setPx(g, x, y, c);
    setPx(g, x + 1, y, c);
  }
  /* crystal glints */
  setPx(g, 41, 74, 21);
  setPx(g, 81, 72, 21);
  setPx(g, 62, 95, 4);
  /* a couple of bright leaf highlights catching the sun */
  sprinkle(g, rand, 30, 6, 100, 38, [6], 10);
}

export const scenesD = [
  {
    id: 'floating-tree',
    title: 'Floating Tree',
    palette: treePalette,
    groups: treeGroups,
    paper: '#f6f0e2',
    outline: '#2c3540',
    seed: 20261029,
    scene: sceneTree,
    decorate: decorateTree,
  },
];
