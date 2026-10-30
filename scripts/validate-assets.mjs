#!/usr/bin/env node
/**
 * PixelHaven asset validation â€” release gate (checklist Â§C).
 *
 * Validates catalog.json, every artwork manifest (schema, dimensions, mask
 * charset, palette), preview files, and the audio track manifest. Exits 1 on
 * any error so CI fails loudly.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ART = join(ROOT, 'public', 'artwork');
const AUDIO = join(ROOT, 'public', 'audio');

const errors = [];
const warn = (msg) => console.warn(`  âš  ${msg}`);
const fail = (msg) => errors.push(msg);

const HEX = /^#[0-9a-f]{6}$/;
const MASK_CHARS = /^[.\-1-9a-z]$/;
const RLE_TOKEN = /^[0-9a-z]{2}$/;

function check(cond, msg) {
  if (!cond) fail(msg);
  return cond;
}

/* ------------------------------------------------------------- catalog */

if (!check(existsSync(join(ART, 'catalog.json')), 'catalog.json is missing')) {
  process.exit(1);
}

let catalog;
try {
  catalog = JSON.parse(readFileSync(join(ART, 'catalog.json'), 'utf8'));
} catch (e) {
  console.error(`  âœ— catalog.json is not valid JSON: ${e.message}`);
  process.exit(1);
}

check(catalog.schemaVersion === 1, 'catalog schemaVersion must be 1');
check(Array.isArray(catalog.artworks) && catalog.artworks.length >= 12,
  `catalog must list at least 12 artworks (found ${catalog.artworks?.length ?? 0})`);

const seenIds = new Set();

for (const entry of catalog.artworks ?? []) {
  const { id, title, manifest: manifestPath, preview: previewPath } = entry;
  check(typeof id === 'string' && /^[a-z0-9-]+$/.test(id), `catalog: bad id '${id}'`);
  if (seenIds.has(id)) fail(`catalog: duplicate id '${id}'`);
  seenIds.add(id);
  check(typeof title === 'string' && title.length > 0, `catalog [${id}]: missing title`);

  const manifestFile = join(ROOT, 'public', manifestPath ?? '');
  if (!check(existsSync(manifestFile), `catalog [${id}]: manifest not found: ${manifestPath}`)) continue;

  let m;
  try {
    m = JSON.parse(readFileSync(manifestFile, 'utf8'));
  } catch (e) {
    fail(`[${id}] manifest is not valid JSON: ${e.message}`);
    continue;
  }

  check(m.id === id, `[${id}] manifest id mismatch: '${m.id}'`);
  const schema = m.schemaVersion;
  check(schema === 1 || schema === 2, `[${id}] schemaVersion must be 1 or 2`);
  check(Number.isInteger(m.contentVersion) && m.contentVersion >= 1, `[${id}] bad contentVersion`);
  const maxDim = schema === 2 ? 512 : 128;
  check(Number.isInteger(m.width) && m.width >= 4 && m.width <= maxDim, `[${id}] width out of range`);
  check(Number.isInteger(m.height) && m.height >= 4 && m.height <= maxDim, `[${id}] height out of range`);
  check(HEX.test(m.paperColor ?? ''), `[${id}] bad paperColor`);
  check(HEX.test(m.outlineColor ?? ''), `[${id}] bad outlineColor`);
  const maxPalette = schema === 2 ? 256 : 37;
  check(Array.isArray(m.palette) && m.palette.length >= 2 && m.palette.length <= maxPalette,
    `[${id}] palette must have 2..${maxPalette} entries`);
  (m.palette ?? []).forEach((c, i) => check(HEX.test(c ?? ''), `[${id}] palette[${i}] invalid hex`));

  let colorable = 0;
  if (schema === 2) {
    // RLE grid: every cell is colorable; rows must decode and cover exactly.
    check(Array.isArray(m.rle) && m.rle.length === m.height,
      `[${id}] rle rows (${m.rle?.length}) != height (${m.height})`);
    (m.rle ?? []).forEach((row, y) => {
      if (typeof row !== 'string' || row.length % 4 !== 0) return;
      let covered = 0;
      let valid = true;
      for (let pos = 0; pos < row.length; pos += 4) {
        const iTok = row.slice(pos, pos + 2);
        const rTok = row.slice(pos + 2, pos + 4);
        const index = parseInt(iTok, 36);
        const run = parseInt(rTok, 36);
        if (!(RLE_TOKEN.test(iTok) && RLE_TOKEN.test(rTok)) || !(index >= 1 && index < (m.palette ?? []).length) || run < 1) {
          valid = false;
          break;
        }
        covered += run;
      }
      if (valid && covered === m.width) colorable += covered;
      else fail(`[${id}] rle row ${y} does not decode to exactly ${m.width} cells`);
    });
    // HD tier quality bar (round 6): 100-200 paintable colors at 256Â².
    if (entry.tier === 'hd') {
      check(m.palette.length >= 101 && m.palette.length <= 201,
        `[${id}] HD tier requires 100..200 paintable colors (found ${m.palette.length - 1})`);
      check(m.width === 256 && m.height === 256, `[${id}] HD tier boards must be 256Ã—256`);
    }
  } else {
    // Mask: dimensions + charset + colorable palette refs + at least one colorable.
    check(Array.isArray(m.mask) && m.mask.length === m.height,
      `[${id}] mask rows (${m.mask?.length}) != height (${m.height})`);
    (m.mask ?? []).forEach((row, y) => {
      check(typeof row === 'string' && row.length === m.width,
        `[${id}] mask row ${y} length ${row?.length} != width ${m.width}`);
      for (const ch of row ?? '') {
        if (!check(MASK_CHARS.test(ch), `[${id}] mask row ${y}: invalid char '${ch}'`)) continue;
        if (ch !== '.' && ch !== '-') {
          colorable++;
          const idx = parseInt(ch, 36);
          check(idx >= 1 && idx < m.palette.length,
            `[${id}] mask row ${y}: digit '${ch}' -> palette index ${idx} out of range`);
        }
      }
    });
  }
  check(colorable > 0, `[${id}] no colorable cells`);
  check(['hd', 'classic', undefined].includes(entry.tier), `[${id}] bad tier '${entry.tier}'`);

  // Preview exists, is SVG, and lives in the same folder as the manifest.
  const previewFile = join(ROOT, 'public', previewPath ?? '');
  check(existsSync(previewFile), `[${id}] preview missing: ${previewPath}`);
  if (existsSync(previewFile)) {
    const svg = readFileSync(previewFile, 'utf8');
    check(svg.startsWith('<svg'), `[${id}] preview is not an SVG document`);
  }
  check(
    dirname(manifestPath ?? '') === dirname(previewPath ?? ''),
    `[${id}] manifest and preview live in different folders`,
  );
}

// No orphan artwork directories (would ship dead weight / untracked content).
for (const entry of readdirSync(ART, { withFileTypes: true })) {
  if (entry.isDirectory() && !seenIds.has(entry.name)) {
    warn(`orphan artwork directory not in catalog: ${entry.name}`);
  }
  if (entry.isFile() && entry.name !== 'catalog.json') {
    warn(`unexpected file in public/artwork: ${entry.name}`);
  }
}

/* --------------------------------------------------------------- audio */

const tracksFile = join(AUDIO, 'tracks.json');
if (check(existsSync(tracksFile), 'audio/tracks.json is missing')) {
  let t;
  try {
    t = JSON.parse(readFileSync(tracksFile, 'utf8'));
  } catch (e) {
    fail(`tracks.json is not valid JSON: ${e.message}`);
    t = null;
  }
  if (t) {
    check(t.schemaVersion === 1, 'tracks schemaVersion must be 1');
    check(Array.isArray(t.tracks) && t.tracks.length >= 1, 'tracks list is empty');
    const ids = new Set();
    for (const track of t.tracks ?? []) {
      check(typeof track.id === 'string' && track.id.length > 0, 'track missing id');
      if (ids.has(track.id)) fail(`duplicate track id '${track.id}'`);
      ids.add(track.id);
      const file = join(AUDIO, basename(track.file ?? ''));
      check(existsSync(file), `track file missing: ${track.file}`);
      if (existsSync(file)) {
        const kb = statSync(file).size / 1024;
        check(kb > 4, `track file suspiciously small: ${track.file} (${kb.toFixed(0)} KB)`);
        check(kb < 10240, `track file too large (>10MB): ${track.file}`);
      }
      check(typeof track.license === 'string' && track.license.length > 0,
        `track '${track.id}' missing license string`);
    }
  }
}

/* --------------------------------------------------------------- result */

if (errors.length > 0) {
  console.error(`\nAsset validation FAILED with ${errors.length} error(s):`);
  for (const e of errors) console.error(`  âœ— ${e}`);
  process.exit(1);
}
console.log(`âœ“ ${catalog.artworks.length} artworks, ${seenIds.size} previews, audio tracks â€” all valid.`);
