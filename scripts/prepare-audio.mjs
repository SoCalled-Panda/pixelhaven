#!/usr/bin/env node
/**
 * PixelHaven audio pipeline v3 — real lofi tracks (Purrple Cat set).
 *
 * Replaces the procedural generator (generate-audio.py) with licensed
 * recordings. Sources are dropped into `scripts/audio-src/` as MP3/WAV,
 * then this script:
 *
 *   1. trims intro/outro (percentages set per track below),
 *   2. builds a seamless sampler-style loop: the last N seconds crossfade
 *      into the first N seconds, so `element.loop` never clicks,
 *   3. loudness-normalizes to -16 LUFS (streaming/BGM standard),
 *   4. encodes OGG Vorbis q5 into `public/audio/<id>.ogg`,
 *   5. rewrites `public/audio/tracks.json` with attribution metadata.
 *
 * Usage:
 *   node scripts/prepare-audio.mjs            # process everything in SOURCES
 *
 * Adding your own tracks: drop a file in scripts/audio-src/, add an entry
 * to SOURCES with trim points + title/description/license, re-run.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'scripts', 'audio-src');
const OUT = join(ROOT, 'public', 'audio');
const CROSSFADE = 1.0; // seconds of crossfaded loop seam

/** track id -> source file + trim window (seconds) + catalog metadata.
 *  All tracks by Purrple Cat (Emma Wilson) — free-stock-music.com, CC BY-SA 3.0. */
const SOURCES = [
  {
    id: 'green-tea',
    file: 'green-tea.mp3',
    start: 12,
    end: 140,
    title: 'Green Tea',
    description: 'Warm, steamy lofi for a slow afternoon — mellow keys, soft snare.',
    artist: 'Purrple Cat',
    work: 'Green Tea',
    license: 'CC BY-SA 3.0',
    source: 'free-stock-music.com',
  },
  {
    id: 'birds-of-a-feather',
    file: 'birds-of-a-feather.mp3',
    start: 10,
    end: 128,
    title: 'Birds of a Feather',
    description: 'Featherlight morning lofi — gentle chords to ease you onto the page.',
    artist: 'Purrple Cat',
    work: 'Birds of a Feather',
    license: 'CC BY-SA 3.0',
    source: 'free-stock-music.com',
  },
  {
    id: 'shelter',
    file: 'shelter.mp3',
    start: 10,
    end: 120,
    title: 'Shelter',
    description: 'Cozy, hushed beats that wrap the room in a warm blanket of sound.',
    artist: 'Purrple Cat',
    work: 'Shelter',
    license: 'CC BY-SA 3.0',
    source: 'free-stock-music.com',
  },
  {
    id: 'wild-strawberry',
    file: 'wild-strawberry.mp3',
    start: 8,
    end: 122,
    title: 'Wild Strawberry',
    description: 'Sweet, playful lofi with a sunny skip in its step.',
    artist: 'Purrple Cat',
    work: 'Wild Strawberry',
    license: 'CC BY-SA 3.0',
    source: 'free-stock-music.com',
  },
  {
    id: 'field-of-fireflies',
    file: 'field-of-fireflies.mp3',
    start: 10,
    end: 124,
    title: 'Field of Fireflies',
    description: 'Dreamy dusk lofi — glowing pads drifting over a lazy groove.',
    artist: 'Purrple Cat',
    work: 'Field of Fireflies',
    license: 'CC BY-SA 3.0',
    source: 'free-stock-music.com',
  },
  {
    id: 'gentle-breeze',
    file: 'gentle-breeze.mp3',
    start: 12,
    end: 138,
    title: 'Gentle Breeze',
    description: 'Airy afternoon lofi that sways like curtains in an open window.',
    artist: 'Purrple Cat',
    work: 'Gentle Breeze',
    license: 'CC BY-SA 3.0',
    source: 'free-stock-music.com',
  },
];

const LEGACY_FILES = [
  'rainy-night.ogg', 'coffee-shop.ogg', 'slow-tempo.ogg', 'midnight-groove.ogg',
  'cocktail-bar.ogg', 'minor-key.ogg', 'rainy-window.ogg', 'midnight-study.ogg',
  'coffee-warmth.ogg', 'slow-porch.ogg',
];

function probeDuration(path) {
  const out = execFileSync('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path,
  ]).toString().trim();
  return Number(out);
}

function processTrack(entry) {
  const src = join(SRC, entry.file);
  if (!existsSync(src)) throw new Error(`missing source file: ${src}`);
  const dur = probeDuration(src);
  if (entry.end > dur - 1) entry.end = Math.floor(dur - 1);
  const segLen = entry.end - entry.start;
  if (segLen <= CROSSFADE * 2 + 10) throw new Error(`${entry.id}: trim window too short`);
  const bodyEnd = segLen - CROSSFADE; // relative seconds

  // X = seam (tail fades out while head fades in), Y = body.
  // Loop cycle X++Y is continuous at both wrap points (see README/docs).
  const filter = [
    'atrim=start=' + entry.start + ':end=' + entry.end,
    'asetpts=PTS-STARTPTS',
    'asplit=3[a][b][c]',
    '[a]atrim=start=0:end=' + bodyEnd + ',asetpts=PTS-STARTPTS[y]',
    '[b]atrim=start=' + bodyEnd + ',asetpts=PTS-STARTPTS,afade=t=out:st=0:d=' + CROSSFADE + '[bo]',
    '[c]atrim=start=0:end=' + CROSSFADE + ',asetpts=PTS-STARTPTS,afade=t=in:st=0:d=' + CROSSFADE + '[bi]',
    '[bo][bi]amix=inputs=2:duration=longest:normalize=0[x]',
    '[x][y]concat=n=2:v=0:a=1',
    'loudnorm=I=-16:TP=-1.5:LRA=11[out]',
  ].join(',');

  const dest = join(OUT, entry.id + '.ogg');
  execFileSync('ffmpeg', [
    '-y', '-hide_banner', '-i', src, '-filter_complex', filter,
    '-map', '[out]', '-c:a', 'libvorbis', '-q:a', '5', dest,
  ], { stdio: ['ignore', 'ignore', 'ignore'] });
  const outDur = probeDuration(dest);
  const kb = Math.round(statSync(dest).size / 1024);
  console.log(`${entry.id}: ${dur.toFixed(0)}s -> ${outDur.toFixed(0)}s loop, ${kb}KB`);
  return { entry, kb };
}

const results = [];
mkdirSync(SRC, { recursive: true });
mkdirSync(OUT, { recursive: true });

for (const entry of SOURCES) results.push(processTrack(entry));

for (const legacy of LEGACY_FILES) {
  const p = join(OUT, legacy);
  if (existsSync(p)) rmSync(p);
}

const tracks = results.map(({ entry }) => ({
  id: entry.id,
  title: entry.title,
  file: `audio/${entry.id}.ogg`,
  description: entry.description,
  license: `Music: "${entry.work}" by ${entry.artist} (${entry.source}) — ${entry.license}.`,
}));

const catalog = {
  schemaVersion: 1,
  defaultTrackId: 'green-tea',
  defaultVolume: 0.6,
  attribution: 'All tracks by Purrple Cat (free-stock-music.com), licensed CC BY-SA 3.0.',
  attributionShort: 'Purrple Cat · CC BY-SA 3.0',
  tracks,
};
writeFileSync(join(OUT, 'tracks.json'), JSON.stringify(catalog, null, 2) + '\n');
console.log(`tracks.json: ${tracks.length} tracks, default "${catalog.defaultTrackId}"`);
