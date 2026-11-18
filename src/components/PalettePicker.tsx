import { useMemo, useState } from 'react';
import type { Progress } from '../engine/types';
import { IconClose, IconSearch } from './icons';

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
 * Rough color-name classifier so the palette search understands words like
 * "red", "teal" or "brown" without shipping a full color dictionary. Returns
 * one of a small fixed vocabulary — good enough for filtering, not naming.
 */
export function colorName(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 510;
  const delta = max - min;
  const saturation = max === 0 ? 0 : delta / max;
  if (lightness >= 0.93 && saturation <= 0.08) return 'white';
  if (lightness <= 0.1) return 'black';
  if (saturation <= 0.14) return lightness > 0.55 ? 'light gray' : 'gray';
  let hue = 0;
  if (max === r) hue = 60 * (((g - b) / delta) % 6);
  else if (max === g) hue = 60 * ((b - r) / delta + 2);
  else hue = 60 * ((r - g) / delta + 4);
  if (hue < 0) hue += 360;
  if (hue < 15 || hue >= 345) return 'red';
  if (hue < 42) return lightness < 0.45 ? 'brown' : 'orange';
  if (hue < 68) return 'yellow';
  if (hue < 168) return 'green';
  if (hue < 205) return 'teal';
  if (hue < 262) return 'blue';
  if (hue < 305) return 'purple';
  return 'pink';
}

/** Search matches the paint-by-numbers number, a hex prefix, or a name. */
function colorMatches(query: string, index: number, color: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (/^\d+$/.test(q)) return String(index).startsWith(q);
  const hex = color.toLowerCase();
  return hex.startsWith(q.startsWith('#') ? q : `#${q}`) || colorName(color).includes(q);
}

/**
 * Palette selection (checklist §E): one button per colorable color,
 * selected swatch clearly ringed, every swatch labelled for screen readers.
 * Each swatch shows its paint-by-numbers number so the digits on the canvas
 * can be matched to a color at a glance (review feedback round 1), plus a
 * per-color progress caption ("22%") under the swatch, matching the
 * reference coloring apps (review feedback round 5).
 * Index 0 is the reserved "uncolored" appearance and is never offered.
 * A compact search (review round 10) sits next to the numbered swatches so
 * 100+ color HD sets can be filtered by number, name or #hex.
 */
export function PalettePicker({ palette, selected, onSelect, perColor }: PalettePickerProps) {
  // High-fidelity sets ship 100+ colors — switch to a compact, scrollable
  // grid so the studio controls stay usable (round 6).
  const dense = palette.length > 40;
  const [query, setQuery] = useState('');
  const trimmed = query.trim();

  const visible = useMemo(
    () =>
      palette
        .map((color, index) => ({ color, index }))
        .filter(({ color, index }) => index !== 0 && colorMatches(trimmed, index, color)),
    [palette, trimmed],
  );

  return (
    <div
      className={dense ? 'palette palette--dense-wrap' : 'palette-wrap'}
      role="group"
      aria-label="Color palette"
    >
      <div className="palette-search">
        <span className="palette-search__icon" aria-hidden="true">
          <IconSearch />
        </span>
        <input
          type="text"
          className="palette-search__input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setQuery('');
              event.currentTarget.blur();
            }
          }}
          placeholder="Search: 12, red, #a1b2…"
          aria-label="Search colors by number, name or hex"
        />
        {trimmed && (
          <>
            <span className="palette-search__count" aria-live="polite">
              {visible.length} of {palette.length - 1}
            </span>
            <button
              type="button"
              className="palette-search__clear"
              aria-label="Clear color search"
              onClick={() => setQuery('')}
            >
              <IconClose />
            </button>
          </>
        )}
      </div>

      {trimmed && visible.length === 0 ? (
        <p className="palette-search__empty">No colors match “{trimmed}”.</p>
      ) : (
        <div className={dense ? 'palette palette--dense' : 'palette'}>
          {visible.map(({ color, index }) => {
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
      )}
    </div>
  );
}
