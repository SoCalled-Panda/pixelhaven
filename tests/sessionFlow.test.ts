import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { ColoringEngine } from '../src/engine/coloringEngine';
import { validateManifest } from '../src/data/manifest';
import { SessionRepository } from '../src/data/sessionRepo';
import { parseSaveFile, serializeSaveFile } from '../src/data/saveFile';

/**
 * Integration: load artwork → color → save → "refresh" → restore.
 * Exercises the full local persistence loop the PRD acceptance criteria
 * describe, without a browser (fake-indexeddb provides the IDB semantics).
 */

const RAW_MANIFEST = {
  id: 'warm-heart',
  title: 'Warm Heart',
  schemaVersion: 1,
  contentVersion: 1,
  width: 8,
  height: 8,
  paperColor: '#f8f1e5',
  outlineColor: '#43364a',
  palette: ['#ece2cf', '#e5533d', '#f2a03d', '#f6c945', '#8fbf5f'],
  mask: [
    '--------',
    '-111111-',
    '-111111-',
    '-112211-',
    '-112211-',
    '-111111-',
    '-111111-',
    '--------',
  ],
};

function makeArtwork() {
  const result = validateManifest(RAW_MANIFEST);
  if (!result.ok) throw new Error(`fixture invalid: ${result.reason}`);
  return result.artwork;
}

beforeEach(() => {
  // Fresh database per test (records must never leak between cases).
  vi.stubGlobal('indexedDB', new IDBFactory());
});

/** Grid index → colorable ordinal (cells are NOT ordinals!). */
function ordinalOf(artwork: ReturnType<typeof makeArtwork>, cell: number): number {
  return artwork.cellToOrdinal[cell];
}

/** Grid indices of the colorable cells, row-major from the mask above. */
const COLORABLE = [9, 10, 11, 12, 17, 18, 19, 20, 25, 26, 27, 28, 33, 34, 35, 36, 41, 42, 43, 44];

describe('session flow: load → color → save → restore (checklist §I)', () => {
  it('restores progress after a simulated refresh', async () => {
    const artwork = makeArtwork();
    const repo = new SessionRepository();

    // First visit: color several cells with mixed tools.
    const engine = new ColoringEngine(artwork);
    engine.colorCell(COLORABLE[0], 1);
    engine.colorCell(COLORABLE[1], 2);
    engine.colorCell(COLORABLE[2], 3);
    engine.setTool('eraser');
    expect(engine.applyTool(COLORABLE[2])).toBe(true);
    engine.setTool('brush');
    expect(engine.applyTool(COLORABLE[3])).toBe(true);
    const saved = engine.exportSnapshot();
    expect((await repo.save(saved)).ok).toBe(true);

    // "Refresh": a brand-new engine restores from storage.
    const reopened = new ColoringEngine(artwork);
    const stored = await repo.load(artwork.id);
    expect(stored).not.toBeNull();
    expect(reopened.restore(stored!).applied).toBe(true);

    expect(reopened.progress.colored).toBe(3);
    expect(reopened.getCellValue(ordinalOf(artwork, COLORABLE[0]))).toBe(1);
    expect(reopened.getCellValue(ordinalOf(artwork, COLORABLE[1]))).toBe(2);
    expect(reopened.getCellValue(ordinalOf(artwork, COLORABLE[2]))).toBe(0); // erased
    expect(reopened.getCellValue(ordinalOf(artwork, COLORABLE[3]))).toBe(1);
  });

  it('handles multiple rapid edits — every save bumps the revision, last write wins', async () => {
    const artwork = makeArtwork();
    const repo = new SessionRepository();
    const engine = new ColoringEngine(artwork);

    // 6 quick edits with a save after each (like the debounced writer would).
    let previousRevision = 0;
    for (let i = 0; i < 6; i++) {
      engine.colorCell(COLORABLE[i], (i % 4) + 1);
      const snap = engine.exportSnapshot();
      expect(snap.revision).toBeGreaterThan(previousRevision);
      previousRevision = snap.revision;
      expect((await repo.save(snap)).ok).toBe(true);
    }
    const stored = await repo.load(artwork.id);
    expect(stored!.revision).toBe(previousRevision);
    expect(stored!.cells.filter((c) => c !== 0)).toHaveLength(6);
  });

  it('prevents a stale tab from overwriting newer progress', async () => {
    const artwork = makeArtwork();
    const repo = new SessionRepository();

    const tabA = new ColoringEngine(artwork);
    const tabB = new ColoringEngine(artwork);

    tabA.colorCell(COLORABLE[0], 1);
    expect((await repo.save(tabA.exportSnapshot())).ok).toBe(true);

    // Tab B loaded BEFORE tab A's edit → its revision is 0 → must lose.
    tabB.colorCell(COLORABLE[1], 2);
    const result = await repo.save(tabB.exportSnapshot());
    expect(result).toEqual({ ok: false, reason: 'conflict' });
    expect((await repo.load(artwork.id))!.cells[0]).toBe(1); // A's edit intact

    // After reloading the stored state, tab B is back in the game.
    const stored = (await repo.load(artwork.id))!;
    expect(tabB.restore(stored).applied).toBe(true);
    tabB.colorCell(COLORABLE[4], 4);
    expect((await repo.save(tabB.exportSnapshot())).ok).toBe(true);
  });

  it('export file → import file round-trip across engines', () => {
    const artwork = makeArtwork();
    const engine = new ColoringEngine(artwork);
    engine.colorCell(COLORABLE[0], 1);
    engine.colorCell(COLORABLE[5], 2);
    const json = serializeSaveFile(engine.exportSnapshot());

    const imported = parseSaveFile(json);
    expect(imported.ok).toBe(true);
    if (!imported.ok) return;

    const fresh = new ColoringEngine(artwork);
    expect(fresh.restore(imported.session).applied).toBe(true);
    expect(fresh.progress.colored).toBe(2);
    expect(fresh.getCellValue(ordinalOf(artwork, COLORABLE[5]))).toBe(2);
  });

  it('rejects imported sessions that do not match the artwork (PRD data safety)', async () => {
    const artwork = makeArtwork();
    const repo = new SessionRepository();
    const engine = new ColoringEngine(artwork);
    engine.colorCell(COLORABLE[0], 1);
    await repo.save(engine.exportSnapshot());

    // Tamper: bump contentVersion as if the artwork changed underneath.
    const stored = (await repo.load(artwork.id))!;
    const tampered = { ...stored, contentVersion: 2 };

    const guardian = new ColoringEngine(artwork);
    const result = guardian.restore(tampered);
    expect(result.applied).toBe(false);
    expect(guardian.progress.colored).toBe(0); // nothing applied
    // The old record is preserved, not deleted (architecture §6):
    expect((await repo.load(artwork.id))!.cells[0]).toBe(1);
  });
});
