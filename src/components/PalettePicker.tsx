import type { Progress } from '../engine/types';

export interface PalettePickerProps {
  palette: readonly string[];
  /** Selected palette index (1-based; 0 is the reserved uncolored index). */
  selected: number;
  onSelect: (index: number) => void;
  /** Per-color percent placed correctly (palette index → 0–100). */
  perColor?: Progress['perColor'];
}

/**
 * Perceived luminance of a hex color — picks a readable number-badge ink.
 * (0.2126/0.7152/0.0722 = WCAG relative luminance weights.)
 */
function swatchInkColor(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.58 ? 'rgba(46, 36, 52, 0.75)' : 'rgba(255, 251, 242, 0.92)';
}

/**
 * Palette selection (checklist §E): one button per colorable color,
 * selected swatch clearly ringed, every swatch labelled for screen readers.
 * Each swatch shows its paint-by-numbers number so the digits on the canvas
 * can be matched to a color at a glance (review feedback round 1), plus a
 * per-color progress caption ("22%") under the swatch, matching the
 * reference coloring apps (review feedback round 5).
 * Index 0 is the reserved "uncolored" appearance and is never offered.
 */
export function PalettePicker({ palette, selected, onSelect, perColor }: PalettePickerProps) {
  // High-fidelity sets ship 100+ colors — switch to a compact, scrollable
  // grid so the studio controls stay usable (round 6).
  const dense = palette.length > 40;
  return (
    <div
      className={dense ? 'palette palette--dense' : 'palette'}
      role="group"
      aria-label="Color palette"
    >
      {palette.map((color, index) => {
        if (index === 0) return null; // reserved uncolored index
        const isActive = selected === index;
        const pct = perColor?.[index] ?? null;
        const done = pct === 100;
        const caption = pct === null ? null : done ? '✓' : `${pct}%`;
        return (
          <div className="palette__item" key={`${index}-${color}`}>
            <button
              type="button"
              className={isActive ? 'palette__swatch palette__swatch--active' : 'palette__swatch'}
              style={{ backgroundColor: color }}
              aria-pressed={isActive}
              aria-label={`Use color ${index}${pct === null ? '' : `, ${pct}% placed`}`}
              title={`Use color ${index}${pct === null ? '' : ` · ${pct}% placed`}`}
              onClick={() => onSelect(index)}
            >
              <span
                className="palette__num"
                style={{ color: swatchInkColor(color) }}
                aria-hidden="true"
              >
                {index}
              </span>
            </button>
            {caption !== null && (
              <span
                className={done ? 'palette__pct palette__pct--done' : 'palette__pct'}
                aria-hidden="true"
              >
                {caption}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
