/**
 * PixelHaven v6 scenes — batch B: sakura-temple, tokyo-neon-alley,
 * venice-canal, lighthouse-dusk. All coordinates assume SIZE=128.
 */
import * as L from './art-lib.mjs';

const { fillRect, hline, vline, line, fillCircle, fillEllipse, fillTriangleUp,
  fillPolygon, quadCurve, radialGlow, vGradient, hGradient,
  ditherShadow, sparkle } = L;

/* ============================== sakura-temple ========================= */

const sakuraPalette = [
  '#f7efe2', // 0 paper
  '#f6d7dc', // 1 dawn pink high
  '#f2c4cf', // 2 dawn pink
  '#f2cdb4', // 3 pale gold
  '#f7e3c0', // 4 horizon warm
  '#c9d4e0', // 5 Fuji haze
  '#8f9ab5', // 6 Fuji body
  '#f2f2ee', // 7 Fuji snow
  '#3f5940', // 8 mountain forest
  '#2f4630', // 9 mountain forest dark
  '#d94f3d', // 10 pagoda red
  '#a83c2e', // 11 pagoda red dark
  '#f2ede0', // 12 pagoda wall
  '#3a3440', // 13 pagoda roof dark
  '#57506a', // 14 pagoda roof light
  '#c94f43', // 15 torii gate
  '#9a3a30', // 16 torii shade
  '#8a6844', // 17 stone step light
  '#6e5a48', // 18 stone step dark
  '#5d4a3a', // 19 sakura trunk
  '#443626', // 20 sakura trunk dark
  '#f2b8c6', // 21 blossom light
  '#e89ab2', // 22 blossom mid
  '#d9829e', // 23 blossom deep
  '#f7d4e0', // 24 blossom pale
  '#c9b8a0', // 25 stone lantern
  '#a89478', // 26 stone lantern shade
  '#ffe9a8', // 27 lantern glow
];

const sakuraGroups = [[1, 2, 3, 4, 27], [5, 6, 7], [8, 9], [10, 11, 12], [13, 14], [15, 16], [17, 18], [19, 20], [21, 22, 23, 24], [25, 26]];

function sceneSakura(g) {
  vGradient(g, 0, 127, 0, 74, [1, 2, 3, 4]);
  // Fuji on the horizon, left of the pagoda
  fillPolygon(g, [[14, 74], [42, 34], [70, 74]], 6);
  fillPolygon(g, [[30, 46], [42, 34], [54, 46], [48, 48], [42, 44], [36, 48]], 7);
  hline(g, 14, 70, 74, 5);
  // Forested foothills
  fillPolygon(g, [[0, 74], [22, 58], [52, 74]], 8);
  fillPolygon(g, [[76, 74], [104, 56], [128, 72], [128, 74]], 8);
  fillEllipse(g, 22, 64, 7, 4, 9); fillEllipse(g, 104, 62, 8, 4, 9);
  // Temple courtyard platform
  fillRect(g, 0, 74, 128, 12, 17);
  hline(g, 0, 127, 74, 18);
  for (let x = 0; x < 256; x += 10) fillRect(g, x, 76, 1, 10, 18);
  // Pagoda: five tiers, center-right
  const tiers = [
    { y: 22, w: 9 }, { y: 32, w: 12 }, { y: 42, w: 15 }, { y: 52, w: 18 }, { y: 62, w: 21 },
  ];
  fillRect(g, 86, 20, 4, 6, 13); // finial
  for (const t of tiers) {
    const cx = 88;
    // body
    fillRect(g, cx - Math.floor(t.w * 0.62), t.y + 5, Math.ceil(t.w * 1.24), 6, 12);
    fillRect(g, cx - Math.floor(t.w * 0.62), t.y + 5, 2, 6, 10);
    // roof with upturned eaves
    fillPolygon(g, [[cx - t.w - 3, t.y + 5], [cx - t.w, t.y], [cx + t.w, t.y], [cx + t.w + 3, t.y + 5], [cx + t.w - 2, t.y + 4], [cx - t.w + 2, t.y + 4]], 13);
    hline(g, cx - t.w - 3, cx + t.w + 3, t.y + 4, 14);
  }
  fillRect(g, 70, 68, 36, 6, 10); // base platform
  hline(g, 70, 105, 68, 11);
  // Torii gate, center-left (clear of the sakura canopy and pagoda)
  vline(g, 50, 54, 74, 15); vline(g, 64, 54, 74, 15);
  vline(g, 49, 54, 74, 16); vline(g, 63, 54, 74, 16);
  fillRect(g, 44, 51, 26, 3, 15);
  fillRect(g, 42, 46, 30, 3, 15);
  hline(g, 42, 49, 48, 16);
  fillRect(g, 54, 56, 4, 2, 15); // plaque
  // Sakura tree, foreground left
  quadCurve(g, 14, 128, 12, 96, 22, 74, 19, 3);
  quadCurve(g, 14, 118, 26, 104, 34, 96, 20, 2);
  fillCircle(g, 20, 66, 12, 22);
  fillCircle(g, 34, 58, 10, 22);
  fillCircle(g, 6, 58, 9, 22);
  fillCircle(g, 24, 50, 9, 21);
  fillCircle(g, 40, 66, 8, 23);
  fillCircle(g, 14, 72, 8, 23);
  fillCircle(g, 30, 60, 5, 24);
  fillCircle(g, 10, 62, 4, 24);
  fillCircle(g, 36, 56, 3, 24);
  // Stone steps up to the platform
  for (let i = 0; i < 4; i++) {
    const w = 40 - i * 6;
    const x0 = 52 + i * 3;
    fillRect(g, x0, 86 + i * 3, w, 2, 17);
    hline(g, x0, x0 + w, 88 + i * 3, 18);
  }
  // Stone lantern beside the path
  fillRect(g, 104, 96, 4, 22, 25);
  fillRect(g, 100, 116, 12, 4, 26);
  fillRect(g, 102, 90, 8, 6, 25);
  fillRect(g, 103, 92, 6, 3, 27);
  fillPolygon(g, [[98, 90], [114, 90], [110, 84], [102, 84]], 26);
  // Path
  fillPolygon(g, [[60, 128], [92, 128], [85, 104], [67, 104]], 17);
  hline(g, 67, 85, 104, 18);
  for (let y = 108; y < 256; y += 5) hline(g, 63 + (y - 104), 89 - (y - 104), y, 18);
}

function decorateSakura(g, rand) {
  // Petal drift across the sky — sparse, reading as individual petals
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(rand() * 256);
    const y = Math.floor(rand() * 118);
    const v = L.getPx(g, x, y);
    if (v === 1 || v === 2 || v === 3 || v === 4) {
      L.setPx(g, x, y, rand() < 0.5 ? 24 : 21);
    }
  }
  // Blossom highlight speckle
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(rand() * 52);
    const y = 44 + Math.floor(rand() * 34);
    const v = L.getPx(g, x, y);
    if (v === 22 && rand() < 0.5) L.setPx(g, x, y, 24);
  }
  // Warm dusk glow around the lantern
  radialGlow(g, 106, 93, 8, 27, (v) => v >= 1 && v <= 4);
}

/* ============================ tokyo-neon-alley ======================== */

const tokyoPalette = [
  '#f6ecd9', // 0 paper
  '#141824', // 1 night sky
  '#1d2333', // 2 night sky light
  '#232a3e', // 3 building far
  '#2c344a', // 4 building far light
  '#3a4258', // 5 building near
  '#454e66', // 6 building near light
  '#ff5fa2', // 7 neon pink
  '#ffa1c4', // 8 neon pink light
  '#4fd8e0', // 9 neon cyan
  '#a5ecf0', // 10 neon cyan light
  '#ffd166', // 11 neon gold
  '#ffe9a8', // 12 neon gold light
  '#e8543f', // 13 lantern red
  '#ff8a6e', // 14 lantern red light
  '#c9cede', // 15 cables
  '#20242f', // 16 asphalt
  '#2b3040', // 17 asphalt light
  '#191d28', // 18 asphalt dark
  '#7a5233', // 19 vending machine body
  '#9a6b42', // 20 vending body light
  '#b8c4d8', // 21 window glass
  '#5d6b80', // 22 window dark
  '#8f8779', // 23 poster tone
  '#f2f2ea', // 24 sign white
  '#3f8a52', // 25 neon green
  '#7fd8a0', // 26 neon green light
];

const tokyoGroups = [[1, 2], [3, 4], [5, 6], [7, 8], [9, 10], [11, 12], [13, 14], [15], [16, 17, 18], [19, 20], [21, 22], [23], [24], [25, 26]];

function sceneTokyo(g) {
  vGradient(g, 0, 127, 0, 127, [1, 1, 2]);
  // Left building
  fillRect(g, 0, 0, 44, 128, 5);
  fillRect(g, 0, 0, 4, 128, 6);
  fillRect(g, 40, 0, 4, 128, 4);
  // Right building
  fillRect(g, 96, 0, 32, 128, 3);
  fillRect(g, 96, 0, 4, 128, 4);
  fillRect(g, 124, 0, 4, 128, 5);
  // Distant building sliver at alley end
  fillRect(g, 44, 34, 52, 84, 3);
  fillRect(g, 44, 34, 52, 3, 4);
  for (let y = 42; y < 112; y += 10) {
    for (let x = 48; x < 92; x += 9) fillRect(g, x, y, 4, 5, 22);
  }
  // Windows on the side buildings
  for (let y = 10; y < 118; y += 12) {
    for (let x = 8; x < 36; x += 10) fillRect(g, x, y, 5, 7, 21);
    for (let x = 102; x < 124; x += 10) fillRect(g, x, y, 5, 7, 21);
  }
  for (const [wx, wy] of [[8, 10], [28, 34], [18, 58], [102, 22], [112, 70], [102, 106]]) {
    fillRect(g, wx, wy, 5, 7, 12);
  }
  // Vertical neon signs (kanji-column look)
  fillRect(g, 46, 40, 10, 34, 8);
  for (let y = 42; y < 72; y += 6) fillRect(g, 48, y, 6, 4, 7);
  fillRect(g, 78, 44, 10, 30, 10);
  for (let y = 46; y < 72; y += 6) fillRect(g, 80, y, 6, 4, 9);
  fillRect(g, 60, 78, 8, 26, 12);
  for (let y = 80; y < 102; y += 6) fillRect(g, 62, y, 4, 4, 11);
  fillRect(g, 88, 80, 6, 22, 26);
  for (let y = 82; y < 100; y += 6) fillRect(g, 89, y, 4, 4, 25);
  // Horizontal shop signs
  fillRect(g, 46, 24, 40, 8, 8);
  fillRect(g, 48, 26, 36, 4, 7);
  fillRect(g, 46, 112, 20, 8, 10);
  fillRect(g, 48, 114, 16, 4, 9);
  fillRect(g, 72, 114, 22, 7, 8);
  fillRect(g, 74, 116, 18, 3, 7);
  // Lanterns strung across the alley
  for (const lx of [50, 62, 74, 86]) {
    fillRect(g, lx, 16, 6, 8, 13);
    fillRect(g, lx + 1, 18, 4, 4, 14);
    fillRect(g, lx + 2, 14, 2, 2, 15);
  }
  // Cables
  quadCurve(g, 44, 12, 66, 18, 96, 10, 15);
  quadCurve(g, 44, 28, 66, 33, 96, 26, 15);
  // Vending machine, right foreground
  fillRect(g, 100, 88, 20, 30, 19);
  fillRect(g, 102, 90, 16, 14, 20);
  for (let y = 92; y < 102; y += 4) {
    for (let x = 103; x < 117; x += 5) fillRect(g, x, y, 3, 3, x % 2 === 0 ? 7 : 9);
  }
  fillRect(g, 102, 108, 16, 6, 22);
  fillRect(g, 102, 107, 16, 1, 24);
  // Wet street
  fillRect(g, 44, 118, 52, 10, 16);
  fillRect(g, 0, 104, 44, 24, 16);
  fillRect(g, 96, 118, 32, 10, 16);
  fillRect(g, 44, 124, 52, 4, 18);
  // Neon reflections on the wet asphalt
  for (const [rx, c] of [[50, 7], [60, 7], [82, 9], [92, 9], [70, 11]]) {
    for (let y = 120; y < 127; y += 2) {
      const wob = Math.round(Math.sin(y * 0.7) * 1.5);
      fillRect(g, rx + wob, y, 2, 1, c);
    }
  }
  for (const [rx, c] of [[104, 7], [114, 9]]) {
    for (let y = 120; y < 256; y += 2) fillRect(g, rx, y, 2, 1, c);
  }
}

function decorateTokyo(g, rand) {
  // Tight neon halo: a dithered 1px fringe hugging each sign edge
  const halos = [[7, 8, 46, 40, 12, 36], [9, 10, 78, 44, 12, 32], [11, 12, 60, 78, 10, 28], [25, 26, 88, 80, 8, 24]];
  for (const [core, lite, hx, hy, hw, hh] of halos) {
    for (let y = hy - 2; y < hy + hh + 2; y++) {
      for (let x = hx - 2; x < hx + hw + 2; x++) {
        const v = L.getPx(g, x, y);
        const isBg = v === 1 || v === 2 || v === 3 || v === 5;
        if (!isBg) continue;
        const near = L.getPx(g, x - 1, y) === core || L.getPx(g, x + 1, y) === core
          || L.getPx(g, x, y - 1) === core || L.getPx(g, x, y + 1) === core
          || L.getPx(g, x, y) === lite;
        if (near && rand() < 0.6) L.setPx(g, x, y, lite);
      }
    }
  }
  // Sign buzz speckle
  for (let i = 0; i < 12; i++) {
    const x = 46 + Math.floor(rand() * 44);
    const y = 24 + Math.floor(rand() * 84);
    const v = L.getPx(g, x, y);
    if (v === 7 || v === 9) L.setPx(g, x, y, 24);
  }
  // Puddle sheen
  sparkle(g, rand, 46, 122, 92, 127, [17], 4);
  // Vending machine glow on the ground
  radialGlow(g, 110, 120, 9, 9, (v) => v === 16 || v === 18);
}

/* ============================== venice-canal ========================== */

const venicePalette = [
  '#f7f0e0', // 0 paper
  '#ffd9a0', // 1 sunset high
  '#ffc48a', // 2 sunset
  '#f2a173', // 3 sunset deep
  '#e88a7a', // 4 sunset rose
  '#d97a6e', // 5 horizon rose
  '#e8b58a', // 6 facade warm light
  '#d9a06e', // 7 facade warm
  '#c98a5e', // 8 facade terracotta
  '#b57a5e', // 9 facade shade
  '#e0a08a', // 10 facade rose
  '#f2d0b0', // 11 facade cream
  '#8a5a44', // 12 shutters / dark join
  '#5d4a3a', // 13 window dark
  '#b8c4c9', // 14 window glass dusk
  '#f2ede0', // 15 window warm lit
  '#7a4a3e', // 16 roof tile dark
  '#2a2430', // 17 gondola black
  '#453f4e', // 18 gondola highlight
  '#c94f43', // 19 gondola cushion
  '#5d4a3a', // 20 gondolier
  '#443626', // 21 gondolier dark / oar
  '#2e5561', // 22 canal deep
  '#3a6b74', // 23 canal mid
  '#4f8a8f', // 24 canal light
  '#7ab5b5', // 25 canal ripple light
  '#f2c98a', // 26 canal sunset reflection
  '#f2f2ea', // 27 mooring pole stripe
  '#3a6b9e', // 28 mooring pole blue
];

const veniceGroups = [[1, 2, 3, 4, 5], [6, 7, 8, 9, 10, 11], [12, 13], [14, 15], [16], [17, 18, 19], [20, 21], [22, 23, 24, 25, 26], [27, 28]];

function sceneVenice(g) {
  vGradient(g, 0, 127, 0, 62, [1, 2, 3, 4, 5]);
  // Left row of palazzi
  fillRect(g, 0, 14, 46, 66, 7);
  fillRect(g, 0, 14, 46, 4, 11);
  for (let y = 22; y < 76; y += 16) {
    for (let x = 5; x < 40; x += 24) {
      fillRect(g, x, y, 6, 10, 13);
      fillRect(g, x + 1, y + 1, 4, 8, 14);
      fillRect(g, x - 2, y - 2, 10, 2, 12);
    }
  }
  // One lit window
  fillRect(g, 28, 38, 6, 10, 13);
  fillRect(g, 29, 39, 4, 8, 15);
  // Right palazzo with balconies
  fillRect(g, 88, 8, 40, 72, 10);
  fillRect(g, 88, 8, 40, 4, 11);
  for (let y = 18; y < 76; y += 18) {
    for (let x = 94; x < 124; x += 14) {
      fillPolygon(g, [[x, y + 12], [x, y + 2], [x + 3, y], [x + 9, y], [x + 12, y + 2], [x + 12, y + 12]], 13);
      fillRect(g, x + 2, y + 2, 8, 10, 14);
      hline(g, x - 1, x + 13, y + 12, 12);
      vline(g, x, y + 12, y + 16, 12); vline(g, x + 12, y + 12, y + 16, 12);
    }
  }
  // Roof lines
  fillRect(g, 0, 10, 46, 4, 16); fillRect(g, 88, 4, 40, 4, 16);
  // Distant water continuing between the palazzi
  fillRect(g, 46, 62, 42, 18, 23);
  hline(g, 46, 87, 62, 5);
  // Stone bridge spanning between the buildings
  fillRect(g, 44, 26, 44, 4, 11); // walk
  fillRect(g, 44, 26, 44, 2, 6); // lit edge
  fillRect(g, 46, 30, 42, 16, 7); // stone face
  for (let x = 48; x < 86; x += 12) fillRect(g, x, 30, 3, 2, 12); // balustrade
  // Arch opening showing the distant canal
  for (let y = 32; y <= 46; y++) {
    for (let x = 52; x <= 84; x++) {
      const dx = (x - 68) / 16;
      const dy = (y - 46) / 14;
      if (dx * dx + dy * dy <= 1) L.setPx(g, x, y, 23);
    }
  }
  hline(g, 52, 84, 46, 8); // arch sill shadow
  for (let y = 40; y <= 46; y += 2) L.setPx(g, 68, y, 24); // boat tip passing through
  // Canal
  fillRect(g, 0, 80, 128, 48, 22);
  vGradient(g, 0, 127, 80, 127, [22, 23, 24], (v) => v === 22 || (v >= 22 && v <= 24));
  // Building reflections (wobble)
  for (let i = 0; i < 20; i++) {
    const sy = 79 - i * 3;
    const dy = 81 + i * 2;
    if (sy < 0) break;
    const wob = Math.round(Math.sin(i * 0.9) * 2);
    for (let x = 0; x < 46; x++) {
      const v = L.getPx(g, x, sy);
      if (v >= 6 && v <= 13) L.setPx(g, x + wob, dy, v === 13 ? 22 : 23);
    }
    for (let x = 88; x < 256; x++) {
      const v = L.getPx(g, x, sy);
      if (v >= 6 && v <= 16) L.setPx(g, x + wob, dy, 23);
    }
  }
  // Sunset path on water
  for (let i = 0; i < 26; i++) {
    const x = 52 + Math.floor(rand2(i) * 26);
    const y = 84 + i * 1.6;
    fillRect(g, x, Math.floor(y), 6 + (i % 3) * 3, 1, 26);
  }
  // Gondola: slender crescent hull with upturned prow and stern
  fillPolygon(g, [[45, 92], [83, 92], [90, 88], [95, 84], [92, 90], [85, 94], [47, 94], [40, 98], [36, 99], [41, 95]], 17);
  hline(g, 47, 83, 92, 18); // rim highlight
  fillRect(g, 56, 90, 14, 2, 19); // red cushion seat
  fillRect(g, 57, 89, 12, 1, 18);
  // Gondolier standing aft
  fillRect(g, 76, 76, 5, 12, 20);
  fillCircle(g, 78, 73, 3, 20);
  fillRect(g, 75, 80, 2, 6, 21);
  line(g, 72, 68, 90, 94, 21);
  // Mooring poles
  for (const [px, py] of [[30, 78], [102, 76]]) {
    fillRect(g, px, py - 22, 5, 22, 28);
    fillRect(g, px, py - 22, 5, 5, 27);
    fillRect(g, px, py - 12, 5, 5, 27);
    fillRect(g, px, py - 2, 5, 2, 27);
    fillRect(g, px + 4, py - 22, 1, 22, 22);
  }
  // Ripples
  for (let i = 0; i < 20; i++) {
    hline(g, 8 + i * 6, 12 + i * 6, 86 + (i % 5) * 9, 25);
  }
}

function rand2(i) {
  const s = Math.sin(i * 127.1) * 43758.5453;
  return s - Math.floor(s);
}

function decorateVenice(g, rand) {
  // Lit window glow on the water
  radialGlow(g, 31, 84, 7, 26, (v) => v >= 22 && v <= 25);
  // Water sparkle
  sparkle(g, rand, 4, 84, 124, 124, [26, 25], 7);
  // Facade texture — subtle, lower courses only
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(rand() * 256);
    const y = 52 + Math.floor(rand() * 22);
    const v = L.getPx(g, x, y);
    if (v === 7 || v === 10) L.setPx(g, x, y, rand() < 0.5 ? v - 1 : v + 1);
  }
}

/* ============================= lighthouse-dusk ======================== */

const lightPalette = [
  '#f4eee0', // 0 paper
  '#1a2450', // 1 sky deep
  '#243566', // 2 sky
  '#31467e', // 3 sky low
  '#41598e', // 4 sky horizon
  '#f2ead2', // 5 moon
  '#c9d4e8', // 6 moon halo
  '#f6f6f2', // 7 lighthouse white
  '#d9d9d0', // 8 lighthouse white shade
  '#c94f43', // 9 lighthouse red band
  '#a83c33', // 10 red band shade
  '#ffd98a', // 11 lantern light
  '#ffedb8', // 12 beam light
  '#2f4630', // 13 cliff grass dark
  '#3f5940', // 14 cliff grass
  '#5a5f5e', // 15 rock
  '#6e7472', // 16 rock light
  '#484f52', // 17 rock dark
  '#1c3a52', // 18 sea deep
  '#27506e', // 19 sea
  '#33688a', // 20 sea light
  '#fbf7ea', // 21 foam
  '#e8e4d4', // 22 gulls
  '#5d4a3a', // 23 cottage wood
  '#8a5a44', // 24 cottage roof
];

const lightGroups = [[1, 2, 3, 4, 5, 6, 12], [7, 8, 9, 10, 11], [13, 14], [15, 16, 17], [18, 19, 20, 21], [22], [23, 24]];

function sceneLighthouse(g) {
  vGradient(g, 0, 127, 0, 92, [1, 2, 3, 4]);
  // Moon
  fillCircle(g, 26, 22, 8, 5);
  radialGlow(g, 26, 22, 14, 6, (v) => v >= 1 && v <= 4);
  // Stars
  const starRand = L.prng(7);
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(starRand() * 128);
    const y = Math.floor(starRand() * 60);
    const v = L.getPx(g, x, y);
    if (v >= 1 && v <= 4) L.setPx(g, x, y, starRand() < 0.25 ? 22 : 6);
  }
  // Sea
  fillRect(g, 0, 88, 128, 26, 19);
  vGradient(g, 0, 127, 88, 113, [18, 19, 20], (v) => v === 19 || v === 18 || v === 20);
  // Cliff
  fillPolygon(g, [[0, 128], [0, 96], [14, 88], [34, 84], [58, 92], [72, 108], [80, 128]], 14);
  fillEllipse(g, 24, 94, 16, 5, 13);
  // Rocks at the waterline
  fillEllipse(g, 66, 118, 12, 5, 15);
  fillEllipse(g, 60, 115, 5, 3, 16);
  fillEllipse(g, 74, 121, 8, 4, 17);
  fillEllipse(g, 14, 122, 10, 4, 15);
  // Lighthouse: tapering tower with red bands
  for (let y = 30; y <= 86; y++) {
    const t = (y - 30) / 56;
    const half = 5 + Math.round(t * 7);
    hline(g, 40 - half, 40 + half, y, 7);
  }
  for (const [by0, by1] of [[38, 46], [56, 64], [74, 82]]) {
    for (let y = by0; y <= by1; y++) {
      const t = (y - 30) / 56;
      const half = 5 + Math.round(t * 7);
      hline(g, 40 - half, 40 + half, y, 9);
    }
  }
  // Left shading on the tower
  for (let y = 30; y <= 86; y++) {
    const t = (y - 30) / 56;
    const half = 5 + Math.round(t * 7);
    const base = ((y >= 38 && y <= 46) || (y >= 56 && y <= 64) || (y >= 74 && y <= 82)) ? 10 : 8;
    fillRect(g, 40 - half, y, 2, 1, base);
  }
  // Gallery + lantern room
  fillRect(g, 32, 26, 17, 4, 8);
  fillRect(g, 36, 18, 9, 8, 11);
  fillRect(g, 35, 16, 11, 3, 8);
  fillPolygon(g, [[33, 16], [48, 16], [40, 10]], 9);
  fillCircle(g, 40, 8, 2, 11);
  // Beam sweeping right-down
  fillPolygon(g, [[46, 22], [100, 44], [112, 40], [48, 16]], 12);
  // Keeper cottage on the cliff
  fillRect(g, 56, 96, 18, 12, 23);
  fillPolygon(g, [[54, 96], [76, 96], [70, 88], [60, 88]], 24);
  fillRect(g, 60, 100, 4, 4, 11);
  fillRect(g, 66, 100, 4, 4, 11);
  // Gulls
  for (const [bx, by] of [[84, 30], [92, 26], [104, 34]]) {
    hline(g, bx - 2, bx - 1, by, 22);
    hline(g, bx + 1, bx + 2, by, 22);
  }
  // Wave foam scallops
  for (let x = 0; x < 256; x += 12) {
    const y = 92 + ((x / 6) % 3) * 7;
    hline(g, x, x + 3, y, 21);
  }
}

function decorateLighthouse(g, rand) {
  // Beam dithered edges
  for (let i = 0; i < 70; i++) {
    const x = 50 + Math.floor(rand() * 60);
    const y = 16 + Math.floor(rand() * 34);
    const v = L.getPx(g, x, y);
    if (v === 12 && rand() < 0.4) L.setPx(g, x, y, 6);
  }
  // Lantern halo
  radialGlow(g, 40, 22, 14, 12, (v) => v >= 1 && v <= 4);
  // Moon glitter path on the sea
  for (let i = 0; i < 22; i++) {
    const x = 18 + Math.floor(rand() * 16);
    const y = 92 + Math.floor(rand() * 20);
    const v = L.getPx(g, x, y);
    if (v >= 18 && v <= 20 && rand() < 0.7) L.setPx(g, x, y, 6);
  }
  // Foam dither under scallops
  for (let i = 0; i < 22; i++) {
    const x = Math.floor(rand() * 256);
    const y = 92 + Math.floor(rand() * 20);
    const v = L.getPx(g, x, y);
    if ((v === 19 || v === 20) && rand() < 0.3) L.setPx(g, x, y, 21);
  }
  // Grass tufts on the cliff
  for (let i = 0; i < 14; i++) {
    const x = 6 + Math.floor(rand() * 60);
    const y = 90 + Math.floor(rand() * 30);
    if (L.getPx(g, x, y) === 14 && rand() < 0.6) L.setPx(g, x, y, 13);
  }
}

/* exports */

export const scenesB = [
  {
    id: 'sakura-temple',
    title: 'Sakura Temple',
    palette: sakuraPalette,
    groups: sakuraGroups,
    paper: '#f7efe2',
    outline: '#3a2c33',
    seed: 61,
    scene: sceneSakura,
    decorate: decorateSakura,
  },
  {
    id: 'tokyo-neon-alley',
    title: 'Tokyo Neon Alley',
    palette: tokyoPalette,
    groups: tokyoGroups,
    paper: '#f6ecd9',
    outline: '#12141c',
    seed: 62,
    scene: sceneTokyo,
    decorate: decorateTokyo,
  },
  {
    id: 'venice-canal',
    title: 'Venice Canal',
    palette: venicePalette,
    groups: veniceGroups,
    paper: '#f7f0e0',
    outline: '#33221c',
    seed: 63,
    scene: sceneVenice,
    decorate: decorateVenice,
  },
  {
    id: 'lighthouse-dusk',
    title: 'Lighthouse at Dusk',
    palette: lightPalette,
    groups: lightGroups,
    paper: '#f4eee0',
    outline: '#1e2438',
    seed: 64,
    scene: sceneLighthouse,
    decorate: decorateLighthouse,
  },
];
