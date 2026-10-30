import { beforeEach, describe, expect, it } from 'vitest';
import { ColoringEngine } from './coloringEngine';
import { validateManifest } from '../data/manifest';
import type { SessionSnapshot } from './types';

/** 4x4 fixture: two colorable cells (grid cells 2 and 6), rest fixed. */
const RAW_MANIFEST = {
  id: 'test-dot',
  title: 'Test Dot',
  schemaVersion: 1,
  contentVersion: 1,
  width: 4,
  height: 4,
  paperColor: '#f8f1e5',
  outlineColor: '#43364a',
  palette: ['#ece2cf', '#e5533d', '#f2a03d', '#f6c945'],
  mask: ['....', '.-1-', '.-2-', '....'],
};

function makeEngine(): { engine: ColoringEngine; artwork: ReturnType<typeof validated> } {
  const artwork = validated();
  return { engine: new ColoringEngine(artwork), artwork };
}

function validated() {
  const result = validateManifest(RAW_MANIFEST);
  if (!result.ok) throw new Error(`fixture invalid: ${result.reason}`);
  return result.artwork;
}

const CELL_A = 6; // grid index of first colorable cell  (row 1, col 2)
const CELL_B = 10; // grid index of second colorable cell (row 2, col 2)

describe('ColoringEngine — commands', () => {
  it('starts fully uncolored', () => {
    const { engine } = makeEngine();
    expect(engine.progress).toEqual({
      colored: 0,
      colorable: 2,
      percent: 0,
      complete: false,
      perColor: [0, 0, 0, 0],
    });
    expect(engine.revision).toBe(0);
  });

  it('colors colorable cells and computes progress (checklist §I)', () => {
    const { engine } = makeEngine();
    expect(engine.colorCell(CELL_A, 1)).toBe(true);
    expect(engine.progress).toEqual({
      colored: 1,
      colorable: 2,
      percent: 50,
      complete: false,
      perColor: [0, 100, 0, 0],
    });
    expect(engine.getCellValue(0)).toBe(1);
    expect(engine.colorCell(CELL_B, 2)).toBe(true);
    expect(engine.progress.complete).toBe(true);
    expect(engine.progress.percent).toBe(100);
  });

  it('ignores fixed cells and out-of-bounds cells quietly', () => {
    const { engine } = makeEngine();
    expect(engine.colorCell(0, 1)).toBe(false); // paper
    expect(engine.colorCell(5, 1)).toBe(false); // outline
    expect(engine.colorCell(-1, 1)).toBe(false);
    expect(engine.colorCell(16, 1)).toBe(false);
    expect(engine.eraseCell(5)).toBe(false);
    expect(engine.revision).toBe(0);
  });

  it('ignores no-op edits (same color twice)', () => {
    const { engine } = makeEngine();
    expect(engine.colorCell(CELL_A, 1)).toBe(true);
    const revision = engine.revision;
    expect(engine.colorCell(CELL_A, 1)).toBe(false);
    expect(engine.revision).toBe(revision);
    expect(engine.canUndo).toBe(true); // only one real entry
    engine.undo();
    expect(engine.canUndo).toBe(false);
  });

  it('rejects invalid color indices', () => {
    const { engine } = makeEngine();
    expect(engine.colorCell(CELL_A, 0)).toBe(false); // reserved uncolored index
    expect(engine.colorCell(CELL_A, 99)).toBe(false);
    expect(engine.colorCell(CELL_A, 1.5)).toBe(false);
  });

  it('eraser returns cells to uncolored', () => {
    const { engine } = makeEngine();
    engine.colorCell(CELL_A, 1);
    engine.setTool('eraser');
    expect(engine.applyTool(CELL_A)).toBe(true);
    expect(engine.getCellValue(0)).toBe(0);
  });

  it('applyTool uses the brush color', () => {
    const { engine } = makeEngine();
    engine.setSelectedColorIndex(3);
    expect(engine.applyTool(CELL_B)).toBe(true);
    expect(engine.getCellValue(1)).toBe(3);
  });

  it('setSelectedColorIndex never selects the reserved index 0', () => {
    const { engine } = makeEngine();
    engine.setSelectedColorIndex(0);
    expect(engine.selectedColorIndex).toBe(1);
  });
});

describe('ColoringEngine — undo/redo (checklist §I)', () => {
  let engine: ColoringEngine;

  beforeEach(() => {
    engine = makeEngine().engine;
  });

  it('undo/redo restore exact previous colors', () => {
    engine.colorCell(CELL_A, 1);
    engine.colorCell(CELL_A, 3); // repaint
    expect(engine.getCellValue(0)).toBe(3);
    expect(engine.undo()).toBe(true);
    expect(engine.getCellValue(0)).toBe(1);
    expect(engine.undo()).toBe(true);
    expect(engine.getCellValue(0)).toBe(0);
    expect(engine.undo()).toBe(false);
    expect(engine.redo()).toBe(true);
    expect(engine.getCellValue(0)).toBe(1);
    expect(engine.redo()).toBe(true);
    expect(engine.getCellValue(0)).toBe(3);
    expect(engine.redo()).toBe(false);
  });

  it('clears the redo stack after a new edit', () => {
    engine.colorCell(CELL_A, 1);
    engine.undo();
    expect(engine.canRedo).toBe(true);
    engine.colorCell(CELL_A, 2);
    expect(engine.canRedo).toBe(false);
    expect(engine.redo()).toBe(false);
  });

  it('keeps the revision monotonic across undo/redo', () => {
    engine.colorCell(CELL_A, 1);
    const r1 = engine.revision;
    engine.undo();
    const r2 = engine.revision;
    engine.redo();
    expect(r2).toBeGreaterThan(r1);
    expect(engine.revision).toBeGreaterThan(r2);
  });

  it('reset clears cells, history and completedAt, and bumps revision', () => {
    engine.colorCell(CELL_A, 1);
    engine.colorCell(CELL_B, 2);
    expect(engine.progress.complete).toBe(true);
    expect(engine.exportSnapshot().completedAt).not.toBeNull();

    const revision = engine.revision;
    expect(engine.reset()).toBe(true);
    expect(engine.progress.colored).toBe(0);
    expect(engine.canUndo).toBe(false);
    expect(engine.canRedo).toBe(false);
    expect(engine.exportSnapshot().completedAt).toBeNull();
    expect(engine.revision).toBeGreaterThan(revision);
    expect(engine.reset()).toBe(false); // nothing to clear
  });
});

describe('ColoringEngine — snapshots (checklist §G data safety)', () => {
  let engine: ColoringEngine;
  let artwork: ReturnType<typeof validated>;

  beforeEach(() => {
    const made = makeEngine();
    engine = made.engine;
    artwork = made.artwork;
  });

  it('exports a copied buffer (mutations do not leak back)', () => {
    engine.colorCell(CELL_A, 1);
    const snap = engine.exportSnapshot();
    snap.cells[0] = 3;
    expect(engine.getCellValue(0)).toBe(1);
    expect(snap.artworkId).toBe('test-dot');
    expect(snap.contentVersion).toBe(1);
    expect(snap.schemaVersion).toBe(1);
  });

  it('restores a valid snapshot and seeds the revision', () => {
    engine.colorCell(CELL_A, 2);
    const snap = engine.exportSnapshot();
    const fresh = new ColoringEngine(artwork);
    expect(fresh.restore(snap).applied).toBe(true);
    expect(fresh.getCellValue(0)).toBe(2);
    expect(fresh.revision).toBe(snap.revision);
    // Next local edit wins compare-and-set against the stored record:
    fresh.colorCell(CELL_B, 1);
    expect(fresh.exportSnapshot().revision).toBeGreaterThan(snap.revision);
  });

  it('rejects content-version-incompatible snapshots without touching state', () => {
    engine.colorCell(CELL_A, 1);
    const stale: SessionSnapshot = {
      ...engine.exportSnapshot(),
      contentVersion: 999,
      cells: [3, 3],
    };
    const result = engine.restore(stale);
    expect(result).toEqual({ applied: false, reason: 'version' });
    expect(engine.getCellValue(0)).toBe(1);
  });

  it('rejects wrong-length buffers (shape)', () => {
    const snap = { ...engine.exportSnapshot(), cells: [1, 2, 3] };
    expect(engine.restore(snap).reason).toBe('shape');
  });

  it('rejects out-of-range palette values (range)', () => {
    const snap = { ...engine.exportSnapshot(), cells: [1, 42] };
    expect(engine.restore(snap).reason).toBe('range');
    expect(engine.restore({ ...snap, cells: [1, -2] }).reason).toBe('range');
    expect(engine.restore({ ...snap, cells: [1, 0.5] }).reason).toBe('range');
  });

  it('rejects foreign artwork ids', () => {
    const snap = { ...engine.exportSnapshot(), artworkId: 'other' };
    expect(engine.restore(snap).reason).toBe('shape');
  });

  it('tracks completedAt across export/restore', () => {
    engine.colorCell(CELL_A, 1);
    engine.colorCell(CELL_B, 2);
    const snap = engine.exportSnapshot();
    expect(snap.completedAt).not.toBeNull();
    const fresh = new ColoringEngine(artwork);
    fresh.restore(snap);
    expect(fresh.exportSnapshot().completedAt).not.toBeNull();
  });
});

describe('ColoringEngine — per-color progress (palette-bar percentages)', () => {
  it('counts only correctly placed cells per palette color', () => {
    const { engine } = makeEngine();
    // CELL_A is designated color 1, CELL_B color 2.
    engine.colorCell(CELL_A, 2); // wrong color: colored, but not done for any color
    let progress = engine.progress;
    expect(progress.colored).toBe(1);
    expect(progress.perColor).toEqual([0, 0, 0, 0]);
    engine.colorCell(CELL_A, 1); // fix it
    engine.colorCell(CELL_B, 2);
    progress = engine.progress;
    expect(progress.perColor).toEqual([0, 100, 100, 0]);
  });

  it('updates per-color stats on erase and undo', () => {
    const { engine } = makeEngine();
    engine.colorCell(CELL_A, 1);
    engine.eraseCell(CELL_A);
    expect(engine.progress.perColor).toEqual([0, 0, 0, 0]);
    engine.undo(); // restore color 1
    expect(engine.progress.perColor).toEqual([0, 100, 0, 0]);
    engine.undo(); // back to empty
    expect(engine.progress.perColor).toEqual([0, 0, 0, 0]);
  });

  it('tracks per-color stats through restore', () => {
    const { engine } = makeEngine();
    engine.colorCell(CELL_A, 1);
    const snap = engine.exportSnapshot();
    const fresh = new ColoringEngine(validated());
    fresh.restore(snap);
    expect(fresh.progress.perColor).toEqual([0, 100, 0, 0]);
  });
});

describe('ColoringEngine — events', () => {
  it('notifies subscribers with changed grid cells for partial redraw', () => {
    const { engine } = makeEngine();
    const events: unknown[] = [];
    const unsubscribe = engine.subscribe((e) => events.push(e));
    engine.colorCell(CELL_A, 1);
    unsubscribe();
    engine.colorCell(CELL_B, 1); // no longer subscribed
    expect(events).toEqual([{ kind: 'cell', changedCells: [CELL_A] }]);
  });

  it('undo/redo emit cell events for the affected cell', () => {
    const { engine } = makeEngine();
    const events: string[] = [];
    engine.subscribe((e) => events.push(e.kind));
    engine.colorCell(CELL_A, 1);
    engine.undo();
    expect(events.filter((k) => k === 'cell')).toHaveLength(2);
  });
});

/* ------------------------------------------------------------------------ */
/* Fill tool (round 6): color a whole 4-connected designated region at once. */
/* ------------------------------------------------------------------------ */

/**
 * 6x4 fixture with three regions:
 *   row0: 111111          region 1 wraps around the 2-block
 *   row1: 122221          region 2 is a 3x2 block in the middle
 *   row2: 122221          region 3 is the bottom strip
 *   row3: 333333
 */
const REGION_MANIFEST = {
  id: 'test-regions',
  title: 'Test Regions',
  schemaVersion: 1,
  contentVersion: 1,
  width: 6,
  height: 4,
  paperColor: '#f8f1e5',
  outlineColor: '#43364a',
  palette: ['#ece2cf', '#e5533d', '#f2a03d', '#f6c945'],
  mask: ['111111', '122221', '122221', '333333'],
};

function makeRegionEngine() {
  const result = validateManifest(REGION_MANIFEST);
  if (!result.ok) throw new Error(`region fixture invalid: ${result.reason}`);
  return { engine: new ColoringEngine(result.artwork), artwork: result.artwork };
}

describe('ColoringEngine — fill tool (round 6)', () => {
  it('paints the whole 4-connected designated region in one action', () => {
    const { engine } = makeRegionEngine();
    engine.setSelectedColorIndex(1);
    engine.setTool('fill');
    expect(engine.applyTool(0)).toBe(true);
    // Region 1 = row0 (6) + row1 edges (2) + row2 edges (2) = 10 cells.
    expect(engine.progress.colored).toBe(10);
    expect(engine.progress.perColor).toEqual([0, 100, 0, 0]);
    // The other regions are untouched.
    expect(engine.getCellValue(7)).toBe(0); // region 2
    expect(engine.getCellValue(18)).toBe(0); // region 3
  });

  it('does not leak across cells with a different designated color', () => {
    const { engine } = makeRegionEngine();
    engine.setSelectedColorIndex(1);
    engine.setTool('fill');
    engine.applyTool(0);
    // Every region-2 and region-3 cell is still uncolored.
    for (const cell of [7, 8, 9, 10, 13, 14, 15, 16, 18, 19, 20, 21, 22, 23]) {
      expect(engine.getCellValue(cell)).toBe(0);
    }
  });

  it('corrects wrongly-colored cells inside the region', () => {
    const { engine } = makeRegionEngine();
    engine.colorCell(2, 2); // wrong color on a region-1 cell
    engine.setSelectedColorIndex(1);
    engine.setTool('fill');
    expect(engine.applyTool(0)).toBe(true);
    expect(engine.getCellValue(2)).toBe(1);
    expect(engine.progress.perColor).toEqual([0, 100, 0, 0]);
  });

  it('refuses to fill when the selected color differs from the region', () => {
    const { engine } = makeRegionEngine();
    engine.setSelectedColorIndex(2);
    engine.setTool('fill');
    expect(engine.applyTool(0)).toBe(false); // region 1 wants color 1
    expect(engine.progress.colored).toBe(0);
    expect(engine.revision).toBe(0);
  });

  it('is a quiet no-op on fixed and out-of-bounds cells', () => {
    const { engine } = makeRegionEngine();
    engine.setSelectedColorIndex(1);
    engine.setTool('fill');
    expect(engine.applyTool(-1)).toBe(false);
    expect(engine.applyTool(999)).toBe(false);
    expect(engine.revision).toBe(0);
  });

  it('undoes an entire region fill as ONE step', () => {
    const { engine } = makeRegionEngine();
    engine.setSelectedColorIndex(1);
    engine.setTool('fill');
    engine.applyTool(0);
    expect(engine.progress.colored).toBe(10);
    expect(engine.undo()).toBe(true);
    expect(engine.progress.colored).toBe(0);
    expect(engine.progress.perColor).toEqual([0, 0, 0, 0]);
    expect(engine.canUndo).toBe(false);
    expect(engine.redo()).toBe(true);
    expect(engine.progress.colored).toBe(10);
  });

  it('emits one cell event covering all changed cells', () => {
    const { engine } = makeRegionEngine();
    engine.setSelectedColorIndex(1);
    engine.setTool('fill');
    const events: { kind: string; changedCells?: readonly number[] }[] = [];
    engine.subscribe((e) => events.push(e as never));
    engine.applyTool(0);
    const cellEvents = events.filter((e) => e.kind === 'cell');
    expect(cellEvents).toHaveLength(1);
    expect(cellEvents[0].changedCells).toHaveLength(10);
  });

  it('is a no-op when the region already holds the selected color', () => {
    const { engine } = makeRegionEngine();
    engine.setSelectedColorIndex(1);
    engine.setTool('fill');
    engine.applyTool(0);
    const revision = engine.revision;
    expect(engine.applyTool(5)).toBe(false); // same region, already correct
    expect(engine.revision).toBe(revision);
    expect(engine.canUndo).toBe(true); // history unchanged
  });

  it('works end-to-end on a schema-2 RLE artwork', () => {
    const tok = (i: number, n: number) =>
      i.toString(36).padStart(2, '0') + n.toString(36).padStart(2, '0');
    const rleManifest = {
      id: 'test-rle',
      title: 'Test RLE',
      schemaVersion: 2,
      contentVersion: 7,
      width: 4,
      height: 4,
      paperColor: '#f8f1e5',
      outlineColor: '#43364a',
      palette: ['#f8f1e5', '#e5533d', '#f2a03d', '#f6c945'],
      // row0: 1111 · row1: 2211 · row2: 1133 · row3: 3333
      rle: [tok(1, 4), tok(2, 2) + tok(1, 2), tok(1, 2) + tok(3, 2), tok(3, 4)],
    };
    const result = validateManifest(rleManifest);
    if (!result.ok) throw new Error(`rle fixture invalid: ${result.reason}`);
    const engine = new ColoringEngine(result.artwork);
    // Region 1 from cell 0 covers row0 + row1 cols 2-3 (cells 6-7).
    // Cells 8-9 are designated 1 too but NOT connected: row1's 2s sit above
    // them and 3s sit to their right.
    engine.setSelectedColorIndex(1);
    engine.setTool('fill');
    expect(engine.applyTool(0)).toBe(true);
    expect(engine.progress.colored).toBe(6);
    expect(engine.getCellValue(8)).toBe(0);
    expect(engine.getCellValue(10)).toBe(0);
    // The disconnected 1-region fills separately.
    expect(engine.applyTool(8)).toBe(true);
    expect(engine.progress.colored).toBe(8);
    expect(engine.progress.perColor).toEqual([0, 100, 0, 0]);
  });

  it('fills the tapped region on MASK artworks with fixed cells (ordinal ≠ cell)', () => {
    // Regression (round 6 QA): applyTool handed fillRegion an ORDINAL, but
    // fillRegion re-resolves it as a CELL index. On artworks with fixed
    // cells ('.'/'-') the two differ, so classic artworks refused fills (or
    // filled an alias region) even with the right color selected. This
    // fixture keeps fixed cells so ordinal ≠ cell everywhere.
    const maskedManifest = {
      id: 'test-mask-fixed',
      title: 'Test Mask Fixed',
      schemaVersion: 1,
      contentVersion: 1,
      width: 6,
      height: 4,
      paperColor: '#f8f1e5',
      outlineColor: '#43364a',
      palette: ['#ece2cf', '#e5533d', '#f2a03d', '#f6c945'],
      // row0: ..11..   row1: .-22-.   row2: 1-22-1   row3: ..33..
      mask: ['..11..', '.-22-.', '1-22-1', '..33..'],
    };
    const result = validateManifest(maskedManifest);
    if (!result.ok) throw new Error(`mask fixture invalid: ${result.reason}`);
    const artwork = result.artwork;
    const engine = new ColoringEngine(artwork);
    // Sanity: fixed cells really do shift ordinals off cell indices.
    expect(artwork.cellToOrdinal[2]).toBe(0); // cell 2 is the FIRST colorable
    expect(artwork.cellToOrdinal[3]).toBe(1);
    expect(artwork.cellToOrdinal[0]).toBe(-1); // paper
    // Colorable order: cells 2,3 → ord 0,1 · 8,9 → 2,3 · 12 → 4 · 14,15 → 5,6
    // · 17 → 7 · 20,21 → 8,9. The two region-1 cells at 12 and 17 are
    // surrounded by fixed cells: same designated color, NOT connected.

    engine.setSelectedColorIndex(1);
    engine.setTool('fill');
    // Tap the region-1 cell (2,0) — its ordinal (0) is NOT its cell index.
    expect(engine.applyTool(2)).toBe(true);
    // Exactly the two CONNECTED region-1 cells got painted (getCellValue is
    // ordinal-addressed): the disconnected 12/17 stay empty.
    expect(engine.getCellValue(0)).toBe(1);
    expect(engine.getCellValue(1)).toBe(1);
    expect(engine.getCellValue(4)).toBe(0); // isolated region-1 cell (12,2)
    // Nothing else, especially not the alias cell the ordinal used to point
    // at (ordinal 0 fed back as a cell index used to anchor the fill on the
    // WRONG region for this kind of artwork).
    expect(engine.progress.colored).toBe(2);
    expect(engine.progress.perColor).toEqual([0, 50, 0, 0]);

    // Same for a later region whose ordinal and cell diverge widely.
    engine.setSelectedColorIndex(2);
    expect(engine.applyTool(9)).toBe(true); // row1 col3, region 2 (4 cells)
    expect(engine.progress.colored).toBe(6);
    expect(engine.getCellValue(2)).toBe(2); // cell 8
    expect(engine.getCellValue(5)).toBe(2); // cell 14
    expect(engine.getCellValue(6)).toBe(2); // cell 15
    expect(engine.progress.perColor).toEqual([0, 50, 100, 0]);
  });
});
