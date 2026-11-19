/**
 * PixelHaven artwork generator — HD-only (round 9 sizing, round 11 retune).
 *
 * Every artwork is a schema-2 board: 128×128 cells, 24-128 paintable colors.
 * Scenes are painted at 512² (the painters' native canvas), box-downsampled
 * 4× to the board, given a light painterly value-noise pass and median-cut
 * quantized (pbn-lib.mjs scenes live in hifi-scenes.mjs). contentVersion 9.
 *
 * Round 11 retune: the 128² set was carrying 100+ colors that only existed as
 * 1-2 cell specks, which read as dithery mush and made sessions feel endless.
 * `mergeSmallRegions` now converges, so every color owns at least a 12-cell
 * region — the board reads as clean flat colour blocks at any zoom.
 *
 * History: the classic 128×128 schema-1 set (contentVersion 6, art-lib.mjs
 * DSL) was retired in round 7 when its four favorites were rebuilt as HD
 * scenes (256², contentVersion 7); the engine still reads schema-1 for
 * compatibility. Round 9 shrunk the HD boards to 128² (a 4× lighter
 * session); round 11 cleaned up their palette and bumped contentVersion 8→9
 * so pre-retune saves exit through the version guard.
 */
import { mkdirSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as P from './pbn-lib.mjs';
import { hifiScenes } from './hifi-scenes.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'artwork');
const HD_SIZE = 128;
const HD_CONTENT_VERSION = 9;

/* ---------------------------------------------------------------- HD set */

// Painters rasterize at their native 512²; one 4× box downsample lands on
// the 128² board (2× the smoothing of the old 256² pipeline for free).
const HD_SUPERSAMPLE = 4;
// Every surviving color must own a region of at least this many cells — this
// is the single biggest lever on how "mushy" the board looks and how much
// tapping a session takes. 12 cells is small enough to keep real detail and
// large enough to kill 1-cell dither speckle.
const HD_MIN_REGION = 12;
// Palette band: scenes differ in complexity, so the natural count ranges from
// ~32 (floating-tree, aurora) to ~113 (sunset-sail). Both bounds are wide on
// purpose — the quality bar is "clean regions", not a fixed count.
const HD_MIN_COLORS = 24;
const HD_MAX_COLORS = 128;

function generateHdArtwork(art) {
  const cv = P.createCanvas(HD_SIZE * HD_SUPERSAMPLE, HD_SIZE * HD_SUPERSAMPLE);
  art.paint(cv);
  const down = P.boxDownsample(cv, HD_SUPERSAMPLE);
  const noise = P.makeNoise(art.seed);
  // Light texture: enough to keep region borders organic, not enough to
  // shatter flat areas into speckle after quantization.
  P.texturePass(down, noise, 8);
  const { grid, palette, usedColors } = P.quantizeCanvas(down, {
    colorTarget: 140,
    minSize: HD_MIN_REGION,
    minColors: HD_MIN_COLORS,
    maxColors: HD_MAX_COLORS,
  });
  if (usedColors < HD_MIN_COLORS || usedColors > HD_MAX_COLORS) {
    throw new Error(`[${art.id}] HD palette has ${usedColors} colors — must be ${HD_MIN_COLORS}..${HD_MAX_COLORS}`);
  }
  if (HD_SIZE * HD_SUPERSAMPLE !== 512) {
    throw new Error(`HD painters rasterize at 512² but the pipeline expects ${HD_SIZE * HD_SUPERSAMPLE}²`);
  }
  const hexPalette = [art.paper, ...palette.map(P.rgbToHex)];
  const rle = P.rleEncodeRows(grid, HD_SIZE, HD_SIZE);
  const manifest = {
    id: art.id,
    title: art.title,
    schemaVersion: 2,
    contentVersion: HD_CONTENT_VERSION,
    width: HD_SIZE,
    height: HD_SIZE,
    paperColor: art.paper,
    outlineColor: '#2b2620',
    palette: hexPalette,
    rle,
  };
  const preview = P.renderHdPreviewSvg(grid, hexPalette, HD_SIZE, HD_SIZE, art.paper, 4);
  return { manifest, preview, usedColors };
}

function main() {
  const catalog = { schemaVersion: 1, artworks: [] };
  const summary = [];

  // HD-only gallery (round 7). Registry order = gallery order; the
  // converted classics lead so floating-tree stays the hero.
  for (const art of hifiScenes) {
    const { manifest, preview, usedColors } = generateHdArtwork(art);
    const dir = join(OUT, art.id);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest) + '\n');
    writeFileSync(join(dir, 'preview.svg'), preview);
    catalog.artworks.push({
      id: art.id,
      title: art.title,
      tier: 'hd',
      manifest: `artwork/${art.id}/manifest.json`,
      preview: `artwork/${art.id}/preview.svg`,
    });
    summary.push(`  ${art.id.padEnd(20)} "${art.title}" — ${usedColors} colors, ${HD_SIZE}×${HD_SIZE} (HD, crisp display)`);
  }
  writeFileSync(join(OUT, 'catalog.json'), JSON.stringify(catalog, null, 2) + '\n');
  const knownIds = new Set(hifiScenes.map((a) => a.id));
  for (const entry of readdirSync(OUT, { withFileTypes: true })) {
    if (entry.isDirectory() && !knownIds.has(entry.name)) {
      rmSync(join(OUT, entry.name), { recursive: true });
      console.log(`  removed retired artwork dir: ${entry.name}`);
    }
  }
  console.log(
    `Generated ${hifiScenes.length} HD artworks (${HD_SIZE}×${HD_SIZE}, cv ${HD_CONTENT_VERSION}) — gallery is HD-only:`,
  );
  console.log(summary.join('\n'));
}

main();
