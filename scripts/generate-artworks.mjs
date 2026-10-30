/**
 * PixelHaven artwork generator — HD-only (round 7).
 *
 * Every artwork is a schema-2 board: 256×256 cells, 100-200 paintable
 * colors. Scenes are rasterized at 512², box-downsampled, perturbed with
 * painterly value-noise and median-cut quantized (pbn-lib.mjs scenes live
 * in hifi-scenes.mjs). contentVersion 7.
 *
 * History: the classic 128×128 schema-1 set (contentVersion 6, art-lib.mjs
 * DSL) was retired in round 7 when its four favorites were rebuilt as HD
 * scenes; the engine still reads schema-1 manifests for compatibility.
 */
import { mkdirSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as P from './pbn-lib.mjs';
import { hifiScenes } from './hifi-scenes.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'artwork');
const HD_SIZE = 256;
const HD_CONTENT_VERSION = 7;

/* ---------------------------------------------------------------- HD set */

const HD_SUPERSAMPLE = 2;
const HD_MIN_COLORS = 100;
const HD_MAX_COLORS = 200;

function generateHdArtwork(art) {
  const cv = P.createCanvas(HD_SIZE * HD_SUPERSAMPLE, HD_SIZE * HD_SUPERSAMPLE);
  art.paint(cv);
  const down = P.boxDownsample(cv, HD_SUPERSAMPLE);
  const noise = P.makeNoise(art.seed);
  P.texturePass(down, noise, 14);
  const { grid, palette, usedColors } = P.quantizeCanvas(down, {
    colorTarget: 170,
    minSize: 4,
    minColors: HD_MIN_COLORS,
    maxColors: HD_MAX_COLORS,
  });
  if (usedColors < HD_MIN_COLORS || usedColors > HD_MAX_COLORS) {
    throw new Error(`[${art.id}] HD palette has ${usedColors} colors — must be ${HD_MIN_COLORS}..${HD_MAX_COLORS}`);
  }
  const hexPalette = ['#ffffff', ...palette.map(P.rgbToHex)];
  const rle = P.rleEncodeRows(grid, HD_SIZE, HD_SIZE);
  const manifest = {
    id: art.id,
    title: art.title,
    schemaVersion: 2,
    contentVersion: HD_CONTENT_VERSION,
    width: HD_SIZE,
    height: HD_SIZE,
    paperColor: '#ffffff',
    outlineColor: '#2b2620',
    palette: hexPalette,
    rle,
  };
  const preview = P.renderHdPreviewSvg(grid, hexPalette, HD_SIZE, HD_SIZE, '#ffffff', 3);
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
    summary.push(`  ${art.id.padEnd(20)} "${art.title}" — ${usedColors} colors, ${HD_SIZE}×${HD_SIZE} (HD)`);
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
