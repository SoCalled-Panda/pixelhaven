import { describe, expect, it } from 'vitest';
import { parseSaveFile, serializeSaveFile } from './saveFile';
import type { SessionSnapshot } from '../engine/types';

const SNAPSHOT: SessionSnapshot = {
  artworkId: 'warm-heart',
  contentVersion: 1,
  schemaVersion: 1,
  cells: [1, 0, 0, 3],
  revision: 12,
  createdAt: 1700000000000,
  updatedAt: 1700000100000,
  completedAt: null,
};

describe('save file export/import (checklist §G)', () => {
  it('round-trips serialize → parse', () => {
    const parsed = parseSaveFile(serializeSaveFile(SNAPSHOT));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.session).toEqual(SNAPSHOT);
    }
  });

  it('rejects invalid JSON and foreign file types', () => {
    expect(parseSaveFile('{not json').ok).toBe(false);
    expect(parseSaveFile('[]').ok).toBe(false);
    const foreign = parseSaveFile(
      JSON.stringify({ type: 'other-app-save', schemaVersion: 1, session: {} }),
    );
    expect(foreign.ok).toBe(false);
  });

  it('rejects incompatible schema versions', () => {
    const json = JSON.stringify({ ...JSON.parse(serializeSaveFile(SNAPSHOT)), schemaVersion: 2 });
    expect(parseSaveFile(json).ok).toBe(false);
  });

  it('rejects missing/corrupt coloring data', () => {
    expect(parseSaveFile(JSON.stringify({ type: 'pixelhaven-save', schemaVersion: 1, session: {} })).ok).toBe(false);
    expect(
      parseSaveFile(
        JSON.stringify({ type: 'pixelhaven-save', schemaVersion: 1, session: { ...SNAPSHOT, cells: 'nope' } }),
      ).ok,
    ).toBe(false);
    expect(
      parseSaveFile(
        JSON.stringify({ type: 'pixelhaven-save', schemaVersion: 1, session: { ...SNAPSHOT, cells: [1, -3] } }),
      ).ok,
    ).toBe(false);
    expect(
      parseSaveFile(
        JSON.stringify({ type: 'pixelhaven-save', schemaVersion: 1, session: { ...SNAPSHOT, cells: [1, 2.5] } }),
      ).ok,
    ).toBe(false);
  });

  it('rejects unknown artwork ids and bad revisions', () => {
    expect(
      parseSaveFile(
        JSON.stringify({ type: 'pixelhaven-save', schemaVersion: 1, session: { ...SNAPSHOT, artworkId: 'DROP TABLE' } }),
      ).ok,
    ).toBe(false);
    expect(
      parseSaveFile(
        JSON.stringify({ type: 'pixelhaven-save', schemaVersion: 1, session: { ...SNAPSHOT, revision: -1 } }),
      ).ok,
    ).toBe(false);
  });

  it('caps input size before parsing (allocation guard)', () => {
    expect(parseSaveFile('"' + 'x'.repeat(3_100_000) + '"').ok).toBe(false);
    const bigCells = JSON.stringify({
      type: 'pixelhaven-save',
      schemaVersion: 1,
      session: { ...SNAPSHOT, cells: Array(513 * 513).fill(1) },
    });
    expect(parseSaveFile(bigCells).ok).toBe(false);
  });

  it('fills in missing timestamps leniently', () => {
    const json = JSON.stringify({
      type: 'pixelhaven-save',
      schemaVersion: 1,
      session: { ...SNAPSHOT, createdAt: undefined, updatedAt: undefined, completedAt: undefined },
    });
    const parsed = parseSaveFile(json);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.session.createdAt).toBeGreaterThan(0);
      expect(parsed.session.completedAt).toBeNull();
    }
  });
});
