import { describe, expect, it } from 'vitest';
import { cellCount, inBounds, indexOf, xOf, yOf } from './grid';

const grid = { width: 16, height: 16 };

describe('grid — flat indexing', () => {
  it('computes cell count', () => {
    expect(cellCount(grid)).toBe(256);
    expect(cellCount({ width: 4, height: 4 })).toBe(16);
  });

  it('indexes row-major (y * width + x)', () => {
    expect(indexOf(grid, 0, 0)).toBe(0);
    expect(indexOf(grid, 5, 0)).toBe(5);
    expect(indexOf(grid, 0, 1)).toBe(16);
    expect(indexOf(grid, 15, 15)).toBe(255);
  });

  it('round-trips index <-> coordinates across boundaries', () => {
    for (const [x, y] of [
      [0, 0],
      [15, 0],
      [0, 15],
      [15, 15],
      [7, 9],
    ] as const) {
      const index = indexOf(grid, x, y);
      expect(xOf(index, grid.width)).toBe(x);
      expect(yOf(index, grid.width)).toBe(y);
    }
  });

  it('bounds-checks corners and edges', () => {
    expect(inBounds(grid, 0, 0)).toBe(true);
    expect(inBounds(grid, 15, 15)).toBe(true);
    expect(inBounds(grid, -1, 0)).toBe(false);
    expect(inBounds(grid, 0, -1)).toBe(false);
    expect(inBounds(grid, 16, 0)).toBe(false);
    expect(inBounds(grid, 0, 16)).toBe(false);
  });
});
