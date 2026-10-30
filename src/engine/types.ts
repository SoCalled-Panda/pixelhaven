/** Core engine types — deliberately React-free (architecture §2). */

export interface ArtworkManifest {
  id: string;
  title: string;
  schemaVersion: number;
  contentVersion: number;
  width: number;
  height: number;
  paperColor: string;
  outlineColor: string;
  /** Index 0 is reserved: the "uncolored" cell appearance. */
  palette: string[];
  /**
   * Schema 1: `height` rows of `width` chars — '.' paper, '-' outline,
   * base-36 digit = colorable palette index.
   */
  mask?: string[];
  /**
   * Schema 2 (high-fidelity sets): `height` run-length rows. Each row is a
   * sequence of 4-char tokens — 2 base-36 chars palette index + 2 base-36
   * chars run length (1..1295). Index 0 is not addressable, so every cell is
   * colorable and there are no fixed paper/outline cells.
   */
  rle?: string[];
}

export interface ValidatedArtwork {
  id: string;
  title: string;
  contentVersion: number;
  width: number;
  height: number;
  paperColor: string;
  outlineColor: string;
  palette: readonly string[];
  /** Schema 1 only — raw mask rows ('.', '-', base-36 digits). */
  mask?: readonly string[];
  /** Schema 2 only — raw RLE rows (4-char tokens). */
  rle?: readonly string[];
  /** Grid cell index → ordinal among colorable cells, or -1 for fixed cells. */
  cellToOrdinal: Int32Array;
  /** Ordinal among colorable cells → grid cell index. */
  ordinalToCell: Int32Array;
  colorableCount: number;
  /** Grid cell → designated paint-by-numbers palette index, or -1 for fixed cells. */
  designatedByCell: Int16Array;
}

/**
 * Painting tools.
 *  - brush: paint one cell per tap/drag (the original mechanic).
 *  - fill:  paint every 4-connected cell sharing the tapped cell's designated
 *           color in one action (round 6 — "color adjacent pixels at once").
 *  - eraser: return one cell to the uncolored state.
 */
export type Tool = 'brush' | 'fill' | 'eraser';

/** The durable shape stored in IndexedDB and in export files. */
export interface SessionSnapshot {
  artworkId: string;
  contentVersion: number;
  schemaVersion: number;
  /** One entry per colorable cell (ordinal order); 0 = uncolored. */
  cells: number[];
  /** Monotonic token used as optimistic-concurrency guard (checklist §G). */
  revision: number;
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
}

export interface Progress {
  colored: number;
  colorable: number;
  percent: number;
  complete: boolean;
  /**
   * Percent (0–100) of each palette color placed CORRECTLY, by palette index
   * (index 0 unused / always 0). Powers the per-swatch progress captions in
   * the palette bar (reference-app parity).
   */
  perColor: number[];
}

export interface EngineEvent {
  kind: 'cell' | 'history' | 'color' | 'tool' | 'reset' | 'restore';
  /** Grid cell indices whose pixels changed — used for partial canvas redraws. */
  changedCells?: readonly number[];
}
