/** Flat grid model — row-major indexing (checklist §D). */

export interface GridSpec {
  width: number;
  height: number;
}

export function cellCount(grid: GridSpec): number {
  return grid.width * grid.height;
}

export function inBounds(grid: GridSpec, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < grid.width && y < grid.height;
}

export function indexOf(grid: GridSpec, x: number, y: number): number {
  return y * grid.width + x;
}

export function xOf(index: number, width: number): number {
  return index % width;
}

export function yOf(index: number, width: number): number {
  return Math.floor(index / width);
}

/* ------------------------------------------------------------------ */
/* Schema-2 (high-fidelity) RLE grid decoding — see types.ts.          */
/* ------------------------------------------------------------------ */

export interface RleRun {
  index: number;
  run: number;
}

/**
 * Decode one RLE row into runs. Each token is 4 base-36 chars:
 * 2 = palette index, 2 = run length. Throws with a precise message on any
 * malformation so bad data is rejected at the manifest boundary.
 */
export function decodeRleRow(row: string, y: number): RleRun[] {
  if (row.length % 4 !== 0) {
    throw new Error(`RLE row ${y} length ${row.length} is not a multiple of 4`);
  }
  const runs: RleRun[] = [];
  const TOKEN = /^[0-9a-z]{2}$/;
  for (let pos = 0; pos < row.length; pos += 4) {
    const iTok = row.slice(pos, pos + 2);
    const rTok = row.slice(pos + 2, pos + 4);
    if (!TOKEN.test(iTok) || !TOKEN.test(rTok)) {
      throw new Error(`RLE row ${y} token at ${pos}: invalid base-36 characters`);
    }
    const index = parseInt(iTok, 36);
    const run = parseInt(rTok, 36);
    if (!Number.isInteger(index) || Number.isNaN(index)) {
      throw new Error(`RLE row ${y} token at ${pos}: bad index`);
    }
    if (!Number.isInteger(run) || Number.isNaN(run) || run < 1) {
      throw new Error(`RLE row ${y} token at ${pos}: bad run length`);
    }
    runs.push({ index, run });
  }
  return runs;
}

/** 4-char RLE token encoder (index, run) — mirrors decodeRleRow. */
export function encodeRleToken(index: number, run: number): string {
  return (
    index.toString(36).padStart(2, '0') + run.toString(36).padStart(2, '0')
  );
}
