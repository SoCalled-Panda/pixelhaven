import { indexOf, type GridSpec } from './grid';

/**
 * Pure pan/zoom math for dense grids (checklist §C: pan/zoom is required
 * before publishing artwork denser than the touch-first size).
 *
 * Coordinate conventions:
 *  - `scale`  = on-screen CSS pixels per grid cell (float ≥ minScale)
 *  - `panX/Y` = board top-left in canvas CSS-pixel space
 *  - all functions are side-effect free and unit tested.
 */

export interface View {
  scale: number;
  panX: number;
  panY: number;
}

/** CSS pixels of shell chrome (padding/border) the renderer subtracts. */
export interface Viewport {
  width: number;
  height: number;
}

export function boardSize(grid: GridSpec, scale: number): { width: number; height: number } {
  return { width: grid.width * scale, height: grid.height * scale };
}

/** Largest scale at which the whole board fits the viewport, centered. */
export function computeFitScale(viewport: Viewport, grid: GridSpec): number {
  const safeW = Math.max(1, viewport.width);
  const safeH = Math.max(1, viewport.height);
  return Math.min(safeW / grid.width, safeH / grid.height);
}

export function fitView(viewport: Viewport, grid: GridSpec): View {
  const scale = computeFitScale(viewport, grid);
  const { width, height } = boardSize(grid, scale);
  return {
    scale,
    panX: (viewport.width - width) / 2,
    panY: (viewport.height - height) / 2,
  };
}

/**
 * Keep the board covering the viewport when it is larger than it, and
 * centered when it is smaller. Prevents panning the artwork off-screen.
 */
export function clampView(view: View, viewport: Viewport, grid: GridSpec): View {
  const { width, height } = boardSize(grid, view.scale);
  const clampPan = (pan: number, board: number, viewportSize: number): number => {
    if (board <= viewportSize) return (viewportSize - board) / 2;
    return Math.min(0, Math.max(viewportSize - board, pan));
  };
  return {
    scale: view.scale,
    panX: clampPan(view.panX, width, viewport.width),
    panY: clampPan(view.panY, height, viewport.height),
  };
}

/**
 * Zoom by `factor` keeping the point (mx,my) stationary on screen, clamped
 * to [minScale, maxScale] and then pan-clamped.
 */
export function zoomViewAt(
  view: View,
  mx: number,
  my: number,
  factor: number,
  minScale: number,
  maxScale: number,
  viewport: Viewport,
  grid: GridSpec,
): View {
  const scale = Math.min(maxScale, Math.max(minScale, view.scale * factor));
  const k = scale / view.scale;
  return clampView(
    {
      scale,
      panX: mx - (mx - view.panX) * k,
      panY: my - (my - view.panY) * k,
    },
    viewport,
    grid,
  );
}

/** Map a client-space point to a grid cell under the current view. */
export function cellFromView(
  view: View,
  rect: { left: number; top: number },
  grid: GridSpec,
  clientX: number,
  clientY: number,
): number | null {
  const px = clientX - rect.left - view.panX;
  const py = clientY - rect.top - view.panY;
  if (px < 0 || py < 0) return null;
  const x = Math.floor(px / view.scale);
  const y = Math.floor(py / view.scale);
  if (x < 0 || y < 0 || x >= grid.width || y >= grid.height) return null;
  return indexOf(grid, x, y);
}

/** Pan the view so that a cell is comfortably visible (keyboard cursor). */
export function revealCell(
  view: View,
  cell: number,
  grid: GridSpec,
  viewport: Viewport,
  margin = 48,
): View {
  const x = (cell % grid.width) * view.scale;
  const y = Math.floor(cell / grid.width) * view.scale;
  let { panX, panY } = view;

  if (x < -panX + margin) panX = -(x - margin);
  if (x + view.scale > -panX + viewport.width - margin) {
    panX = -(x + view.scale - viewport.width + margin);
  }
  if (y < -panY + margin) panY = -(y - margin);
  if (y + view.scale > -panY + viewport.height - margin) {
    panY = -(y + view.scale - viewport.height + margin);
  }
  return clampView({ scale: view.scale, panX, panY }, viewport, grid);
}
