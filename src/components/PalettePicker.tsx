import { useMemo, useState } from 'react';
import type { Progress } from '../engine/types';
import { colorName, swatchInkColor } from '../lib/colorUtils';
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
        <p className="palette-search__empty">No colors match "{trimmed}".</p>
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