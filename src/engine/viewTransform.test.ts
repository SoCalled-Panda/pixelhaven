import { describe, expect, it } from 'vitest';
import {
  cellFromView,
  clampView,
  computeFitScale,
  fitView,
  revealCell,
  zoomViewAt,
} from './viewTransform';

const grid = { width: 64, height: 64 };
const viewport = { width: 512, height: 512 };

describe('viewTransform — fit', () => {
  it('fits the whole 64×64 board into the viewport', () => {
    const view = fitView(viewport, grid);
    expect(view.scale).toBe(8);
    expect(view.panX).toBe(0);
    expect(view.panY).toBe(0);
  });

  it('centers the board when the viewport is wider than tall', () => {
    const view = fitView({ width: 600, height: 300 }, grid);
    expect(view.scale).toBeCloseTo(300 / 64);
    expect(view.panX).toBeCloseTo((600 - 64 * view.scale) / 2);
    expect(view.panY).toBe(0);
  });

  it('computeFitScale handles degenerate viewports', () => {
    expect(computeFitScale({ width: 0, height: 0 }, grid)).toBe(1 / 64);
  });
});

describe('viewTransform — clamp (pan bounds)', () => {
  it('centers when the board is smaller than the viewport', () => {
    const view = clampView({ scale: 4, panX: -500, panY: 999 }, viewport, grid);
    expect(view.panX).toBe((512 - 256) / 2);
    expect(view.panY).toBe((512 - 256) / 2);
  });

  it('locks panning inside the board when zoomed in', () => {
    const view = clampView({ scale: 16, panX: 300, panY: -2000 }, viewport, grid);
    expect(view.panX).toBe(0); // 300 pushed right → clamped to 0
    expect(view.panY).toBe(512 - 1024); // bottom limit
  });
});

describe('viewTransform — zoom at a point', () => {
  it('keeps the zoom anchor stationary on screen', () => {
    const view = fitView(viewport, grid);
    const mx = 300;
    const my = 200;
    // Board point under the cursor before zoom:
    const bx = (mx - view.panX) / view.scale;
    const by = (my - view.panY) / view.scale;

    const zoomed = zoomViewAt(view, mx, my, 2, 8, 64, viewport, grid);
    expect(zoomed.scale).toBe(16);
    const bxAfter = (mx - zoomed.panX) / zoomed.scale;
    const byAfter = (my - zoomed.panY) / zoomed.scale;
    expect(bxAfter).toBeCloseTo(bx);
    expect(byAfter).toBeCloseTo(by);
  });

  it('clamps scale to the allowed range', () => {
    const view = fitView(viewport, grid);
    expect(zoomViewAt(view, 0, 0, 100, 8, 32, viewport, grid).scale).toBe(32);
    expect(zoomViewAt({ ...view, scale: 16 }, 0, 0, 0.01, 8, 32, viewport, grid).scale).toBe(8);
  });
});

describe('viewTransform — cell under pointer with pan/zoom', () => {
  it('maps screen points through scale and pan', () => {
    const view = { scale: 16, panX: -256, panY: -256 }; // board 1024, panned up-left
    // (320 + 256) / 16 = 36 → cell (36, 36)
    expect(cellFromView(view, { left: 0, top: 0 }, grid, 320, 320)).toBe(36 * 64 + 36);
  });

  it('returns null off-board and clamps correctly after zoom', () => {
    const base = fitView(viewport, grid); // scale 8, pan 0
    expect(cellFromView(base, { left: 0, top: 0 }, grid, 0, 0)).toBe(0);
    expect(cellFromView(base, { left: 0, top: 0 }, grid, 511, 511)).toBe(63 * 64 + 63);
    expect(cellFromView(base, { left: 0, top: 0 }, grid, 512, 10)).toBeNull();
    expect(cellFromView(base, { left: 0, top: 0 }, grid, 10, -1)).toBeNull();

    const zoomed = zoomViewAt(base, 256, 256, 2, 8, 64, viewport, grid);
    // Point at viewport center still maps to the center cell (31,31)/(32,32):
    const cell = cellFromView(zoomed, { left: 0, top: 0 }, grid, 255, 255);
    expect(cell).not.toBeNull();
    expect(cell! % 64).toBeLessThan(33);
  });
});

describe('viewTransform — revealCell (keyboard cursor)', () => {
  it('keeps a cell near the edge visible when zoomed in', () => {
    const view = { scale: 24, panX: 0, panY: 0 }; // viewport shows top-left corner
    const bottomRight = 63 * 64 + 63;
    const revealed = revealCell(view, bottomRight, grid, viewport);
    const x = (63 * revealed.scale) + revealed.panX;
    const y = (63 * revealed.scale) + revealed.panY;
    expect(x).toBeLessThanOrEqual(viewport.width);
    expect(x).toBeGreaterThan(viewport.width - 24 - 48); // within one cell + margin
    expect(y).toBeLessThanOrEqual(viewport.height);
  });
});
