import { describe, expect, it } from 'vitest';
import { validateManifest } from './manifest';

const VALID = {
  id: 'test-dot',
  title: 'Test Dot',
  schemaVersion: 1,
  contentVersion: 1,
  width: 4,
  height: 4,
  paperColor: '#f8f1e5',
  outlineColor: '#43364a',
  palette: ['#ece2cf', '#e5533d', '#f2a03d'],
  mask: ['....', '.-1-', '.-2-', '....'],
};

describe('validateManifest — artwork validation (checklist §I)', () => {
  it('accepts a valid manifest and maps colorable cells', () => {
    const result = validateManifest(VALID);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.artwork.colorableCount).toBe(2);
      expect(result.artwork.cellToOrdinal[6]).toBe(0); // row1 col2
      expect(result.artwork.cellToOrdinal[10]).toBe(1); // row2 col2
      expect(result.artwork.cellToOrdinal[5]).toBe(-1); // outline is fixed
      expect(result.artwork.ordinalToCell[0]).toBe(6);
    }
  });

  it('rejects non-objects and wrong schema versions', () => {
    expect(validateManifest(null).ok).toBe(false);
    expect(validateManifest('nope').ok).toBe(false);
    expect(validateManifest({ ...VALID, schemaVersion: 2 }).ok).toBe(false);
  });

  it('rejects bad ids, titles and content versions', () => {
    expect(validateManifest({ ...VALID, id: 'Bad Id!' }).ok).toBe(false);
    expect(validateManifest({ ...VALID, title: '' }).ok).toBe(false);
    expect(validateManifest({ ...VALID, contentVersion: 0 }).ok).toBe(false);
  });

  it('enforces the 4..128 dimension cap before allocating arrays', () => {
    expect(validateManifest({ ...VALID, width: 129, mask: undefined }).ok).toBe(false);
    expect(validateManifest({ ...VALID, width: 2 }).ok).toBe(false);
    expect(validateManifest({ ...VALID, height: 130 }).ok).toBe(false);
  });

  it('validates width × height against mask row lengths (checklist §C)', () => {
    expect(validateManifest({ ...VALID, mask: ['....', '.-1-', '.-2-'] }).ok).toBe(false);
    expect(validateManifest({ ...VALID, mask: ['....', '.-1-', '.-2X', '....'] }).ok).toBe(false);
  });

  it('validates mask charset and palette indices (checklist §C)', () => {
    expect(validateManifest({ ...VALID, mask: ['....', '.-#-', '.-2-', '....'] }).ok).toBe(false);
    expect(validateManifest({ ...VALID, mask: ['....', '.-1-', '.-3-', '....'] }).ok).toBe(false); // palette has 0..2
    expect(
      validateManifest({ ...VALID, mask: ['....', '.-1-', '.-2-', '..0.'] }).ok,
    ).toBe(false); // index 0 (uncolored) is not addressable
  });

  it('rejects palettes that are too small or too large, or invalid hex', () => {
    expect(validateManifest({ ...VALID, palette: ['#ece2cf'] }).ok).toBe(false);
    expect(
      validateManifest({ ...VALID, palette: Array(38).fill('#ece2cf') }).ok,
    ).toBe(false);
    expect(validateManifest({ ...VALID, palette: ['red', '#e5533d'] }).ok).toBe(false);
  });

  it('rejects masks with no colorable cells', () => {
    expect(validateManifest({ ...VALID, mask: ['----', '----', '----', '----'] }).ok).toBe(false);
  });

  it('rejects invalid colors', () => {
    expect(validateManifest({ ...VALID, paperColor: 'paper' }).ok).toBe(false);
    expect(validateManifest({ ...VALID, outlineColor: '#12345' }).ok).toBe(false);
  });
});

/* ------------------------------------------------------------------------ */
/* Schema 2 — high-fidelity RLE manifests (round 6).                         */
/* ------------------------------------------------------------------------ */

const tok = (i: number, n: number) =>
  i.toString(36).padStart(2, '0') + n.toString(36).padStart(2, '0');

const VALID_RLE = {
  id: 'test-rle',
  title: 'Test RLE',
  schemaVersion: 2,
  contentVersion: 7,
  width: 4,
  height: 4,
  paperColor: '#f8f1e5',
  outlineColor: '#43364a',
  palette: ['#f8f1e5', '#e5533d', '#f2a03d', '#f6c945'],
  rle: [tok(1, 4), tok(2, 2) + tok(1, 2), tok(1, 4), tok(3, 2) + tok(2, 2)],
};

describe('validateManifest — schema 2 (RLE grids)', () => {
  it('accepts a valid RLE manifest and maps every cell', () => {
    const result = validateManifest(VALID_RLE);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.artwork.colorableCount).toBe(16);
      expect(result.artwork.cellToOrdinal.every((o) => o >= 0)).toBe(true);
      expect(result.artwork.designatedByCell[0]).toBe(1);
      expect(result.artwork.designatedByCell[4]).toBe(2);
      expect(result.artwork.designatedByCell[6]).toBe(1);
      expect(result.artwork.rle).toBe(VALID_RLE.rle);
      expect(result.artwork.mask).toBeUndefined();
    }
  });

  it('still rejects schemaVersion 2 without rle data', () => {
    expect(validateManifest({ ...VALID, schemaVersion: 2 }).ok).toBe(false);
  });

  it('rejects runs that overflow or underfill a row', () => {
    expect(validateManifest({ ...VALID_RLE, rle: [tok(1, 5), tok(1, 4), tok(1, 4), tok(1, 4)] }).ok).toBe(false);
    expect(validateManifest({ ...VALID_RLE, rle: [tok(1, 3), tok(1, 4), tok(1, 4), tok(1, 4)] }).ok).toBe(false);
  });

  it('rejects unaddressable index 0 and out-of-range indices', () => {
    expect(validateManifest({ ...VALID_RLE, rle: [tok(0, 4), tok(1, 4), tok(1, 4), tok(1, 4)] }).ok).toBe(false);
    expect(validateManifest({ ...VALID_RLE, rle: [tok(9, 4), tok(1, 4), tok(1, 4), tok(1, 4)] }).ok).toBe(false);
  });

  it('rejects malformed row strings', () => {
    expect(validateManifest({ ...VALID_RLE, rle: ['010', tok(1, 4), tok(1, 4), tok(1, 4)] }).ok).toBe(false);
    expect(validateManifest({ ...VALID_RLE, rle: ['01!4', tok(1, 4), tok(1, 4), tok(1, 4)] }).ok).toBe(false);
    expect(validateManifest({ ...VALID_RLE, rle: [tok(1, 0), tok(1, 4), tok(1, 4), tok(1, 4)] }).ok).toBe(false);
  });

  it('enforces bigger caps than schema 1 (512 dims, 256 palette)', () => {
    expect(validateManifest({ ...VALID_RLE, width: 513 }).ok).toBe(false);
    expect(validateManifest({ ...VALID_RLE, palette: Array(257).fill('#ece2cf') }).ok).toBe(false);
    const big = validateManifest({
      ...VALID_RLE,
      palette: Array(200).fill('#ece2cf'),
      rle: [tok(199, 4), tok(1, 4), tok(1, 4), tok(1, 4)],
    });
    expect(big.ok).toBe(true);
  });

  it('keeps the schema-1 palette cap', () => {
    expect(validateManifest({ ...VALID, palette: Array(38).fill('#ece2cf') }).ok).toBe(false);
  });
});
