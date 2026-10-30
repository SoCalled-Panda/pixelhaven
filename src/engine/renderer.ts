import { xOf, yOf } from './grid';
import type { ColoringEngine } from './coloringEngine';
import type { EngineEvent, ValidatedArtwork } from './types';
import {
  cellFromView,
  clampView,
  computeFitScale,
  fitView,
  revealCell,
  zoomViewAt,
  type View,
} from './viewTransform';

/** Offscreen cache resolution per cell — the board is painted once at this size. */
export const BASE_CELL_PX = 8;
/** Zoom-out floor: never smaller than the fit scale (whole board visible). */
export const MAX_ZOOM_PX = 64;
/** Grid lines only make sense when cells are big enough to read them. */
export const GRID_LINE_MIN_SCALE = 14;
/** Paint-by-numbers digits appear once cells are large enough to read them. */
export const NUMBER_MIN_SCALE = 18;
/** Below that, tiny swatch dots still hint the target color per cell. */
export const DOT_MIN_SCALE = 10;

export interface CanvasRendererOptions {
  gridLines?: boolean;
  hoverHighlight?: boolean;
}

/**
 * Canvas 2D renderer for grids of any size (architecture §5):
 *  - the full board lives in an offscreen cache painted at BASE_CELL_PX/cell;
 *  - the visible canvas draws the cache through a pan/zoom view transform,
 *    so panning and zooming are a single `drawImage` (60 fps on big grids);
 *  - cell edits partially repaint the offscreen cache, then coalesce a
 *    main-canvas frame via requestAnimationFrame;
 *  - device-pixel-ratio aware; image smoothing disabled for crisp pixels.
 */
export class CanvasRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly board: HTMLCanvasElement;
  private readonly bctx: CanvasRenderingContext2D;
  private readonly artwork: ValidatedArtwork;
  private readonly engine: ColoringEngine;
  private readonly options: Required<CanvasRendererOptions>;
  private unsubscribe: (() => void) | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private view: View = { scale: BASE_CELL_PX, panX: 0, panY: 0 };
  private cssWidth = 0;
  private cssHeight = 0;
  private hoverCell: number | null = null;
  private cursorCell: number | null = null;
  private fillPreviewCell: number | null = null;
  private fillPreviewRegion: Int32Array | null = null;
  private frameQueued = false;
  /** Grid cell → designated palette index (paint-by-numbers), or -1 for fixed cells. */
  private readonly designatedByCell: Int16Array;

  constructor(
    canvas: HTMLCanvasElement,
    artwork: ValidatedArtwork,
    engine: ColoringEngine,
    options: CanvasRendererOptions = {},
  ) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.ctx = ctx;
    this.board = document.createElement('canvas');
    this.board.width = artwork.width * BASE_CELL_PX;
    this.board.height = artwork.height * BASE_CELL_PX;
    const bctx = this.board.getContext('2d');
    if (!bctx) throw new Error('Offscreen 2D context unavailable');
    this.bctx = bctx;
    this.artwork = artwork;
    this.engine = engine;
    this.options = { gridLines: true, hoverHighlight: true, ...options };
    // Designated palette index per cell comes pre-parsed with the validated
    // artwork (works for both the classic mask and the RLE grid formats) and
    // powers the paint-by-numbers overlay + fill-tool region preview.
    this.designatedByCell = artwork.designatedByCell;
  }

  attach(): void {
    this.unsubscribe = this.engine.subscribe((event) => this.onEngineEvent(event));
    this.resizeObserver = new ResizeObserver(() => this.relayout());
    // Observe the wrap (grandparent) — a stable, full-width box the canvas
    // sizes against; observing the shell would feed back through max-width.
    const wrap = this.canvas.parentElement?.parentElement;
    if (wrap) this.resizeObserver.observe(wrap);
    window.addEventListener('resize', this.relayout);
    this.relayout();
  }

  dispose(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    window.removeEventListener('resize', this.relayout);
  }

  /* ---------------------------------------------------------- view API */

  getView(): View {
    return this.view;
  }

  fit(): void {
    this.view = fitView(this.viewport, this.artwork);
    this.scheduleFrame();
  }

  /** Zoom by `factor` keeping the client point stationary. */
  zoomAtPoint(clientX: number, clientY: number, factor: number): void {
    const rect = this.canvas.getBoundingClientRect();
    const minScale = computeFitScale(this.viewport, this.artwork);
    const maxScale = Math.max(MAX_ZOOM_PX, minScale * 12);
    this.view = zoomViewAt(
      this.view,
      clientX - rect.left,
      clientY - rect.top,
      factor,
      minScale,
      maxScale,
      this.viewport,
      this.artwork,
    );
    this.scheduleFrame();
  }

  applyPan(dx: number, dy: number): void {
    this.view = clampView(
      { scale: this.view.scale, panX: this.view.panX + dx, panY: this.view.panY + dy },
      this.viewport,
      this.artwork,
    );
    this.scheduleFrame();
  }

  /** Pan (keeping zoom) so a cell becomes comfortably visible. */
  reveal(cell: number): void {
    this.view = revealCell(this.view, cell, this.artwork, this.viewport);
    this.scheduleFrame();
  }

  /** Cell index under a client point, or null when off-board. */
  cellFromClientPoint(clientX: number, clientY: number): number | null {
    const rect = this.canvas.getBoundingClientRect();
    return cellFromView(this.view, rect, this.artwork, clientX, clientY);
  }

  setHover(cellIndex: number | null): void {
    if (this.hoverCell === cellIndex) return;
    this.hoverCell = cellIndex;
    this.scheduleFrame();
  }

  /**
   * Fill-tool region preview (round 6): while the fill tool is active the
   * hovered cell's whole 4-connected designated region is highlighted so
   * users see exactly what one tap will paint. `null` clears the preview.
   */
  setFillPreview(cellIndex: number | null): void {
    if (this.fillPreviewCell === cellIndex) return;
    this.fillPreviewCell = cellIndex;
    this.fillPreviewRegion = null; // recomputed lazily on the next frame
    this.scheduleFrame();
  }

  setCursor(cellIndex: number | null): void {
    if (this.cursorCell === cellIndex) return;
    this.cursorCell = cellIndex;
    this.scheduleFrame();
  }

  /* ------------------------------------------------------- internals */

  private get viewport(): { width: number; height: number } {
    return { width: this.cssWidth, height: this.cssHeight };
  }

  /**
   * Size the visible canvas to the shell's inner box. Height gets a cozy
   * 3:2-ish viewport so tall views still leave room for the palette.
   */
  private relayout = (): void => {
    const shell = this.canvas.parentElement;
    const wrap = shell?.parentElement;
    if (!shell || !wrap) return;
    const cs = window.getComputedStyle(shell);
    const chrome =
      parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight) +
      parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth);
    const width = Math.max(0, wrap.clientWidth - chrome);
    if (width === 0) return;
    const height = Math.round(Math.min(540, Math.max(320, width * 0.72)));

    if (width === this.cssWidth && height === this.cssHeight && this.canvas.width > 0) {
      return;
    }
    this.cssWidth = width;
    this.cssHeight = height;
    shell.style.maxWidth = `${width + chrome}px`;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.renderBoardCache();
    this.view = fitView(this.viewport, this.artwork);
    this.renderMain();
  };

  private onEngineEvent = (event: EngineEvent): void => {
    if (event.kind === 'cell' && event.changedCells) {
      for (const cell of event.changedCells) {
        this.paintCellOffscreen(cell);
      }
      this.scheduleFrame();
    } else {
      // reset / restore / anything structural → repaint the cache too
      this.renderBoardCache();
      this.scheduleFrame();
    }
  };

  private scheduleFrame(): void {
    if (this.frameQueued) return;
    this.frameQueued = true;
    requestAnimationFrame(() => {
      this.frameQueued = false;
      this.renderMain();
    });
  }

  private paintCellOffscreen(cell: number): void {
    const a = this.artwork;
    const x = xOf(cell, a.width);
    const y = yOf(cell, a.width);
    const ordinal = a.cellToOrdinal[cell];
    if (ordinal >= 0) {
      this.bctx.fillStyle = a.palette[this.engine.getCellValue(ordinal)];
    } else {
      // Fixed cells exist only in the classic mask format ('.' paper,
      // '-' outline); RLE boards have none.
      const ch = a.mask ? a.mask[y][x] : '.';
      this.bctx.fillStyle = ch === '-' ? a.outlineColor : a.paperColor;
    }
    this.bctx.fillRect(x * BASE_CELL_PX, y * BASE_CELL_PX, BASE_CELL_PX, BASE_CELL_PX);
  }

  private renderBoardCache(): void {
    const a = this.artwork;
    this.bctx.fillStyle = a.paperColor;
    this.bctx.fillRect(0, 0, this.board.width, this.board.height);
    for (let cell = 0; cell < a.cellToOrdinal.length; cell++) {
      this.paintCellOffscreen(cell);
    }
  }

  private renderMain(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const { width: vw, height: vh } = this.viewport;
    if (vw === 0 || vh === 0) return;

    const backingWidth = Math.max(1, Math.round(vw * dpr));
    const backingHeight = Math.max(1, Math.round(vh * dpr));
    if (this.canvas.width !== backingWidth || this.canvas.height !== backingHeight) {
      this.canvas.width = backingWidth;
      this.canvas.height = backingHeight;
    }
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = false;

    // Paper backdrop (also covers panned-in empty margins).
    this.ctx.fillStyle = this.artwork.paperColor;
    this.ctx.fillRect(0, 0, vw, vh);

    const a = this.artwork;
    const boardW = a.width * this.view.scale;
    const boardH = a.height * this.view.scale;
    this.ctx.drawImage(this.board, this.view.panX, this.view.panY, boardW, boardH);

    if (this.options.gridLines && this.view.scale >= GRID_LINE_MIN_SCALE) {
      this.paintGridLines(vw, vh);
    }
    if (this.view.scale >= DOT_MIN_SCALE) this.paintNumberOverlay(vw, vh);
    if (this.hoverCell !== null) this.paintHoverOverlay();
    if (this.fillPreviewCell !== null) this.paintFillPreview();
    if (this.cursorCell !== null) this.paintCursorOverlay();
  }

  /**
   * Highlight the region the fill tool would paint: every 4-connected cell
   * sharing the hovered cell's designated palette index. The region is
   * computed once per hovered cell and cached until the hover target changes.
   */
  private paintFillPreview(): void {
    const a = this.artwork;
    if (this.fillPreviewRegion === null) {
      this.fillPreviewRegion = computeRegion(a, this.fillPreviewCell!);
    }
    const { scale, panX, panY } = this.view;
    const path = new Path2D();
    const region = this.fillPreviewRegion;
    for (let i = 0; i < region.length; i++) {
      const cell = region[i];
      const x = panX + xOf(cell, a.width) * scale;
      const y = panY + yOf(cell, a.width) * scale;
      path.rect(x, y, scale, scale);
    }
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.32)';
    this.ctx.fill(path);
    this.ctx.strokeStyle = 'rgba(67, 54, 74, 0.55)';
    this.ctx.lineWidth = 1.5;
    this.ctx.stroke(path);
  }

  /**
   * Paint-by-numbers overlay (review feedback round 1):
   *  - uncolored cells show their designated number (zoomed in) or a small
   *    swatch dot in the target color (zoomed out);
   *  - cells filled with the WRONG color keep their designated number on top
   *    in high contrast, so mistakes are easy to spot and fix.
   */
  private paintNumberOverlay(vw: number, vh: number): void {
    const a = this.artwork;
    const { scale, panX, panY } = this.view;
    const firstCol = Math.max(0, Math.floor(-panX / scale));
    const lastCol = Math.min(a.width - 1, Math.ceil((vw - panX) / scale));
    const firstRow = Math.max(0, Math.floor(-panY / scale));
    const lastRow = Math.min(a.height - 1, Math.ceil((vh - panY) / scale));
    const showNumbers = scale >= NUMBER_MIN_SCALE;
    const fontPx = Math.max(8, Math.round(scale * 0.5));
    if (showNumbers) {
      this.ctx.font = `600 ${fontPx}px system-ui, sans-serif`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
    }
    for (let row = firstRow; row <= lastRow; row++) {
      for (let col = firstCol; col <= lastCol; col++) {
        const cell = row * a.width + col;
        const designated = this.designatedByCell[cell];
        if (designated < 1) continue;
        const value = this.engine.getCellValue(a.cellToOrdinal[cell]);
        const cx = panX + col * scale + scale / 2;
        const cy = panY + row * scale + scale / 2 + 0.5;
        if (value === 0) {
          if (showNumbers) {
            this.ctx.fillStyle = 'rgba(67, 54, 74, 0.58)';
            this.ctx.fillText(String(designated), cx, cy);
          } else {
            // Crisp mini-swatch: pixel-art friendly and cheaper than arcs.
            const dot = Math.max(2, Math.round(scale * 0.22));
            this.ctx.fillStyle = a.palette[designated];
            this.ctx.fillRect(cx - dot / 2, cy - dot / 2, dot, dot);
          }
        } else if (value !== designated && showNumbers) {
          this.ctx.lineWidth = Math.max(2, fontPx * 0.2);
          this.ctx.strokeStyle = 'rgba(255, 251, 242, 0.95)';
          this.ctx.strokeText(String(designated), cx, cy);
          this.ctx.fillStyle = 'rgba(67, 54, 74, 0.95)';
          this.ctx.fillText(String(designated), cx, cy);
        }
      }
    }
  }

  private paintGridLines(vw: number, vh: number): void {
    const a = this.artwork;
    const { scale, panX, panY } = this.view;
    const firstCol = Math.max(0, Math.floor(-panX / scale));
    const lastCol = Math.min(a.width, Math.ceil((vw - panX) / scale));
    const firstRow = Math.max(0, Math.floor(-panY / scale));
    const lastRow = Math.min(a.height, Math.ceil((vh - panY) / scale));

    this.ctx.strokeStyle = 'rgba(67, 54, 74, 0.14)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    for (let col = firstCol; col <= lastCol; col++) {
      const x = Math.round(panX + col * scale) + 0.5;
      this.ctx.moveTo(x, Math.max(0, panY));
      this.ctx.lineTo(x, Math.min(vh, panY + a.height * scale));
    }
    for (let row = firstRow; row <= lastRow; row++) {
      const y = Math.round(panY + row * scale) + 0.5;
      this.ctx.moveTo(Math.max(0, panX), y);
      this.ctx.lineTo(Math.min(vw, panX + a.width * scale), y);
    }
    this.ctx.stroke();
  }

  private paintHoverOverlay(): void {
    if (!this.options.hoverHighlight) return;
    const { scale, panX, panY } = this.view;
    const x = panX + xOf(this.hoverCell!, this.artwork.width) * scale;
    const y = panY + yOf(this.hoverCell!, this.artwork.width) * scale;
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.30)';
    this.ctx.fillRect(x, y, scale, scale);
    this.ctx.strokeStyle = 'rgba(67, 54, 74, 0.85)';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x + 1, y + 1, scale - 2, scale - 2);
  }

  private paintCursorOverlay(): void {
    const { scale, panX, panY } = this.view;
    const x = panX + xOf(this.cursorCell!, this.artwork.width) * scale;
    const y = panY + yOf(this.cursorCell!, this.artwork.width) * scale;
    this.ctx.strokeStyle = '#b04f2c';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([4, 2]);
    this.ctx.strokeRect(x + 1.5, y + 1.5, scale - 3, scale - 3);
    this.ctx.setLineDash([]);
  }
}

/**
 * Flood-collect the 4-connected cells sharing `startCell`'s designated
 * palette index (pure geometry over the validated artwork — no engine state,
 * so the preview is stable regardless of what is already painted).
 */
function computeRegion(artwork: ValidatedArtwork, startCell: number): Int32Array {
  const { width, height, cellToOrdinal, designatedByCell } = artwork;
  const target = designatedByCell[startCell];
  if (target < 1) return Int32Array.of(startCell);
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;
  queue[tail++] = startCell;
  visited[startCell] = 1;
  const region: number[] = [];
  while (head < tail) {
    const cell = queue[head++];
    region.push(cell);
    const x = cell % width;
    const y = (cell - x) / width;
    const tryVisit = (neighbor: number) => {
      if (visited[neighbor] || cellToOrdinal[neighbor] < 0) return;
      if (designatedByCell[neighbor] !== target) return;
      visited[neighbor] = 1;
      queue[tail++] = neighbor;
    };
    if (x > 0) tryVisit(cell - 1);
    if (x < width - 1) tryVisit(cell + 1);
    if (y > 0) tryVisit(cell - width);
    if (y < height - 1) tryVisit(cell + width);
  }
  return Int32Array.from(region);
}
