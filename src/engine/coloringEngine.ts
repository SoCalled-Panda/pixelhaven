import type { EngineEvent, Progress, SessionSnapshot, Tool, ValidatedArtwork } from './types';

interface HistoryEntry {
  /** One entry may cover a single cell (brush/eraser) or a whole flood-filled
   * region (fill tool) — undo/redo always replays the entry atomically.
   * Every operation paints its cells with ONE target value, so `after` is a
   * scalar while `before` keeps each cell's prior value. */
  ordinals: Int32Array;
  before: Uint8Array;
  after: number;
}

export interface RestoreResult {
  applied: boolean;
  reason?: 'version' | 'shape' | 'range' | 'schema';
}

const SCHEMA_VERSION = 1;

/** Map a history entry's ordinals to grid cell indices for renderer events. */
function historyChangedCells(artwork: ValidatedArtwork, ordinals: Int32Array): number[] {
  const cells: number[] = [];
  for (let i = 0; i < ordinals.length; i++) {
    cells.push(artwork.ordinalToCell[ordinals[i]]);
  }
  return cells;
}

/**
 * Framework-independent coloring engine (architecture §2/§4):
 *  - owns grid colors (flat Uint8Array over colorable cells only),
 *  - tool + selected color,
 *  - undo/redo command history (in-memory for MVP),
 *  - a monotonic revision used as the optimistic-concurrency token.
 *
 * It emits events; persistence is scheduled by application code, never here.
 */
export class ColoringEngine {
  readonly artwork: ValidatedArtwork;

  private cells: Uint8Array;
  /** Designated (paint-by-numbers) palette index per colorable ordinal. */
  private readonly designatedByOrdinal: Uint8Array;
  private selectedColor = 1;
  private toolState: Tool = 'brush';
  private undoStack: HistoryEntry[] = [];
  private redoStack: HistoryEntry[] = [];
  private readonly listeners = new Set<(event: EngineEvent) => void>();
  private revisionCounter = 0;
  private readonly createdAt: number;
  private completedAt: number | null = null;

  constructor(artwork: ValidatedArtwork) {
    this.artwork = artwork;
    this.cells = new Uint8Array(artwork.colorableCount);
    // The designated palette index per ordinal drives the paint-by-numbers
    // rules and the per-color progress stats (palette-bar percentages).
    this.designatedByOrdinal = new Uint8Array(artwork.colorableCount);
    let ordinal = 0;
    for (let cell = 0; cell < artwork.cellToOrdinal.length; cell++) {
      if (artwork.cellToOrdinal[cell] < 0) continue;
      this.designatedByOrdinal[ordinal] = artwork.designatedByCell[cell];
      ordinal++;
    }
    this.createdAt = Date.now();
  }

  /* ------------------------------------------------------------- getters */

  get revision(): number {
    return this.revisionCounter;
  }

  get tool(): Tool {
    return this.toolState;
  }

  get selectedColorIndex(): number {
    return this.selectedColor;
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /** Raw palette index of a colorable cell (0 = uncolored). */
  getCellValue(ordinal: number): number {
    return this.cells[ordinal] ?? 0;
  }

  get progress(): Progress {
    let colored = 0;
    const paletteSize = this.artwork.palette.length;
    const total = new Uint32Array(paletteSize);
    const done = new Uint32Array(paletteSize);
    for (let i = 0; i < this.cells.length; i++) {
      const designated = this.designatedByOrdinal[i];
      total[designated]++;
      const value = this.cells[i];
      if (value !== 0) {
        colored++;
        if (value === designated) done[designated]++;
      }
    }
    const colorable = this.cells.length;
    const percent = colorable > 0 ? Math.round((colored / colorable) * 100) : 0;
    const perColor: number[] = new Array(paletteSize).fill(0);
    for (let c = 1; c < paletteSize; c++) {
      perColor[c] = total[c] > 0 ? Math.round((done[c] / total[c]) * 100) : 0;
    }
    return { colored, colorable, percent, complete: colorable > 0 && colored === colorable, perColor };
  }

  /* -------------------------------------------------------------- inputs */

  setSelectedColorIndex(index: number): void {
    if (!Number.isInteger(index) || index < 1 || index >= this.artwork.palette.length) {
      return; // 0 is the reserved uncolored index — never selectable.
    }
    if (this.selectedColor === index) return;
    this.selectedColor = index;
    this.emit({ kind: 'color' });
  }

  setTool(tool: Tool): void {
    if (this.toolState === tool) return;
    this.toolState = tool;
    this.emit({ kind: 'tool' });
  }

  /**
   * Apply the active tool to a grid cell. Out-of-bounds or fixed cells are
   * quiet no-ops (PRD acceptance: tapping a fixed cell does nothing).
   *
   * fill: paints the whole 4-connected region sharing the tapped cell's
   * designated color — but only when the selected color matches it, so the
   * paint-by-numbers rule is never bypassed (round 6).
   */
  applyTool(cellIndex: number): boolean {
    const ordinal = this.ordinalAt(cellIndex);
    if (ordinal < 0) return false;
    if (this.toolState === 'eraser') return this.commit(ordinal, 0);
    // fillRegion expects a GRID CELL index (it resolves the ordinal itself).
    // Passing the ordinal here broke every artwork that has fixed cells —
    // the whole classic set — because ordinal ≠ cell there (round 6 fix).
    if (this.toolState === 'fill') return this.fillRegion(cellIndex);
    return this.commit(ordinal, this.selectedColor);
  }

  /**
   * Flood-fill the region under `cellIndex` with the selected color.
   * The region is the set of colorable cells 4-connected to the tapped cell
   * that share its DESIGNATED palette index (wrongly-colored or empty cells
   * inside it are corrected/covered too, exactly like painting them one by
   * one). One tap → one undo entry, one persistence-affecting revision.
   */
  fillRegion(cellIndex: number): boolean {
    const start = this.ordinalAt(cellIndex);
    if (start < 0) return false;
    const target = this.designatedByOrdinal[start];
    if (target < 1 || this.selectedColor !== target) return false;

    const { width, height, cellToOrdinal, ordinalToCell } = this.artwork;
    const visited = new Uint8Array(this.cells.length);
    const queue = new Int32Array(this.cells.length);
    let head = 0;
    let tail = 0;
    queue[tail++] = start;
    visited[start] = 1;
    const ordinals: number[] = [];
    const before: number[] = [];
    while (head < tail) {
      const ordinal = queue[head++];
      if (this.cells[ordinal] !== this.selectedColor) {
        ordinals.push(ordinal);
        before.push(this.cells[ordinal]);
      }
      const cell = ordinalToCell[ordinal];
      const x = cell % width;
      const y = (cell - x) / width;
      const tryVisit = (neighborCell: number) => {
        const neighborOrdinal = cellToOrdinal[neighborCell];
        if (neighborOrdinal < 0 || visited[neighborOrdinal]) return;
        if (this.designatedByOrdinal[neighborOrdinal] !== target) return;
        visited[neighborOrdinal] = 1;
        queue[tail++] = neighborOrdinal;
      };
      if (x > 0) tryVisit(cell - 1);
      if (x < width - 1) tryVisit(cell + 1);
      if (y > 0) tryVisit(cell - width);
      if (y < height - 1) tryVisit(cell + width);
    }
    if (ordinals.length === 0) return false;

    const after = this.selectedColor;
    for (let i = 0; i < ordinals.length; i++) {
      this.cells[ordinals[i]] = after;
    }
    this.pushHistory(Int32Array.from(ordinals), Uint8Array.from(before), after);
    return true;
  }

  /** Explicit color command (keyboard actions, tests). */
  colorCell(cellIndex: number, colorIndex: number = this.selectedColor): boolean {
    const ordinal = this.ordinalAt(cellIndex);
    if (ordinal < 0) return false;
    if (!Number.isInteger(colorIndex) || colorIndex < 1 || colorIndex >= this.artwork.palette.length) {
      return false;
    }
    return this.commit(ordinal, colorIndex);
  }

  /** Return a cell to the uncolored state. */
  eraseCell(cellIndex: number): boolean {
    const ordinal = this.ordinalAt(cellIndex);
    if (ordinal < 0) return false;
    return this.commit(ordinal, 0);
  }

  /* ------------------------------------------------------------- history */

  undo(): boolean {
    const entry = this.undoStack.pop();
    if (!entry) return false;
    for (let i = 0; i < entry.ordinals.length; i++) {
      this.cells[entry.ordinals[i]] = entry.before[i];
    }
    this.redoStack.push(entry);
    this.revisionCounter++;
    this.emitCell(historyChangedCells(this.artwork, entry.ordinals));
    return true;
  }

  redo(): boolean {
    const entry = this.redoStack.pop();
    if (!entry) return false;
    for (let i = 0; i < entry.ordinals.length; i++) {
      this.cells[entry.ordinals[i]] = entry.after;
    }
    this.undoStack.push(entry);
    this.revisionCounter++;
    this.emitCell(historyChangedCells(this.artwork, entry.ordinals));
    return true;
  }

  /**
   * Clear all colorable cells. History is cleared too (a reset is confirmed
   * up front), and the revision bumps so the reset always beats any stored
   * previous state when persisted.
   */
  reset(): boolean {
    const changed: number[] = [];
    for (let i = 0; i < this.cells.length; i++) {
      if (this.cells[i] !== 0) {
        this.cells[i] = 0;
        changed.push(this.artwork.ordinalToCell[i]);
      }
    }
    if (changed.length === 0) return false;
    this.undoStack = [];
    this.redoStack = [];
    this.completedAt = null;
    this.revisionCounter++;
    this.emit({ kind: 'reset', changedCells: changed });
    return true;
  }

  /* --------------------------------------------------------- persistence */

  /**
   * Copy the state out. The cells array is copied *now* so asynchronous
   * writers always snapshot the buffer before the write (checklist §G).
   */
  exportSnapshot(): SessionSnapshot {
    return {
      artworkId: this.artwork.id,
      contentVersion: this.artwork.contentVersion,
      schemaVersion: SCHEMA_VERSION,
      cells: Array.from(this.cells),
      revision: this.revisionCounter,
      createdAt: this.createdAt,
      updatedAt: Date.now(),
      completedAt: this.completedAt,
    };
  }

  /**
   * Check a snapshot against this artwork without touching state.
   * Rejects content-version mismatches and malformed buffers (PRD §10
   * data-safety: invalid data is rejected, never silently applied).
   */
  validateSnapshot(snapshot: SessionSnapshot): RestoreResult {
    if (snapshot.schemaVersion !== SCHEMA_VERSION) return { applied: false, reason: 'schema' };
    if (snapshot.artworkId !== this.artwork.id) return { applied: false, reason: 'shape' };
    if (snapshot.contentVersion !== this.artwork.contentVersion) {
      return { applied: false, reason: 'version' };
    }
    if (!Array.isArray(snapshot.cells) || snapshot.cells.length !== this.artwork.colorableCount) {
      return { applied: false, reason: 'shape' };
    }
    const max = this.artwork.palette.length;
    for (const v of snapshot.cells) {
      if (!Number.isInteger(v) || v < 0 || v >= max) return { applied: false, reason: 'range' };
    }
    return { applied: true };
  }

  /**
   * Apply a previously stored snapshot. On success, history is cleared (it
   * refers to in-memory pre-restore state) and the revision is seeded from
   * the snapshot so the next local edit produces revision+1 and wins any
   * compare-and-set against the stored record.
   */
  restore(snapshot: SessionSnapshot): RestoreResult {
    const check = this.validateSnapshot(snapshot);
    if (!check.applied) return check;
    for (let i = 0; i < snapshot.cells.length; i++) {
      this.cells[i] = snapshot.cells[i];
    }
    this.undoStack = [];
    this.redoStack = [];
    this.completedAt = snapshot.completedAt ?? null;
    this.revisionCounter = Math.max(0, Math.trunc(snapshot.revision) || 0);
    this.emit({ kind: 'restore', changedCells: Array.from(this.artwork.ordinalToCell) });
    return { applied: true };
  }

  /* ------------------------------------------------------------ plumbing */

  subscribe(listener: (event: EngineEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private ordinalAt(cellIndex: number): number {
    if (!Number.isInteger(cellIndex) || cellIndex < 0 || cellIndex >= this.artwork.cellToOrdinal.length) {
      return -1;
    }
    return this.artwork.cellToOrdinal[cellIndex];
  }

  private commit(ordinal: number, target: number): boolean {
    const before = this.cells[ordinal];
    if (before === target) return false; // no-op edits are ignored
    this.cells[ordinal] = target;
    this.pushHistory(Int32Array.of(ordinal), Uint8Array.of(before), target);
    return true;
  }

  /**
   * Record a single- or multi-cell edit as ONE history entry, bump the
   * revision (persistence token) and report every changed grid cell.
   */
  private pushHistory(ordinals: Int32Array, before: Uint8Array, after: number): void {
    this.undoStack.push({ ordinals, before, after });
    this.redoStack = []; // a new edit clears the redo stack
    this.revisionCounter++;
    if (this.completedAt === null && this.progress.complete) {
      this.completedAt = Date.now();
    }
    this.emitCell(historyChangedCells(this.artwork, ordinals));
  }

  private emitCell(changedCells: number[]): void {
    this.emit({ kind: 'cell', changedCells });
  }

  private emit(event: EngineEvent): void {
    for (const listener of this.listeners) listener(event);
  }
}
