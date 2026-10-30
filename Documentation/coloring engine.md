# Coloring Engine Specification

## 1. Responsibilities
- Maintain the color grid.
- Map pointer position to a logical cell.
- Validate whether a cell can be edited.
- Apply color/erase commands.
- Undo and redo committed commands.
- Render the grid.
- Calculate completion.
- Report state changes for the application layer to persist.

The engine should not import React or access IndexedDB directly.

## 2. Types
```ts
export interface ArtworkDefinition {
  id: string;
  contentVersion: number;
  width: number;
  height: number;
  palette: string[];
  colorableMask: Uint8Array;
  initialColors: Uint8Array;
}

export interface ColorCommand {
  index: number;
  previousColor: number;
  nextColor: number;
}

export type Tool = "paint" | "erase";
```

## 3. Grid model
Use a flat typed array. `index = y * width + x`. Validate that `x` and `y` are in bounds before accessing a cell.

## 4. Paint operation
1. Convert pointer coordinates to grid coordinates using `floor`.
2. Reject out-of-bounds coordinates.
3. Reject fixed cells.
4. Determine desired color based on active tool.
5. If old and new colors match, do nothing.
6. Push a command to undo history.
7. Clear redo history.
8. Apply change.
9. Redraw changed cell.
10. Mark session dirty.

## 5. Undo/redo
Undo restores `previousColor` and moves the command to redo. Redo applies `nextColor` and returns the command to undo. A new edit after undo clears the redo stack. Group drag painting into one transaction if drag-to-paint is added.

## 6. Rendering
- Use logical grid dimensions independent of CSS display size.
- Account for device pixel ratio for sharp display.
- Avoid image smoothing for pixel-art assets when scaling.
- Redraw only changed cell(s) for ordinary taps.
- Full redraw on resize, artwork load, palette changes that affect all cells, or context restoration.
- Avoid React rerendering the full cell grid for every tap.

## 7. Pointer coordinates
Map CSS pointer coordinates to grid coordinates using the canvas bounding rectangle. A coordinate on the right or bottom edge is out of bounds; do not clamp it into the last cell. If letterboxing, zoom, or pan is introduced, include the transform in coordinate conversion. Use Pointer Events for mouse, pen, and touch; handle `pointercancel`.

For artwork larger than the touch-first grid limit, the studio viewport must allow pan and zoom before painting. Keep viewport transforms separate from logical grid coordinates so rendering and input use the same transform.

## 8. Completion
`completion = coloredColorableCells / totalColorableCells`. A colorable cell counts as colored when its color index is not the uncolored index. Guard against a zero-cell artwork.

## 9. Performance target
For a small grid (e.g. 32×32 or 64×64), a full render is usually acceptable during early development. Prefer simple correct behavior first, then use cell-level redraws where helpful. Avoid premature optimization.
