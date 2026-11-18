/**
 * Color utility functions for PixelHaven.
 *
 * Functions for color manipulation, naming, and matching used across the
 * painting engine and UI components.
 */

/**
 * Convert a hex color string (#RRGGBB) to an [r, g, b] array.
 */
export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/**
 * Linear mix of two hex colors, t in [0,1].
 */
export function mix(a: string, b: string, t: number): string {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return rgbToHex([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
}

/** Lighten (f > 0) toward white or darken (f < 0) toward black. */
export function shade(hex: string, f: number): string {
  const target = f >= 0 ? [255, 255, 255] : [0, 0, 0];
  return mix(hex, rgbToHex(target), Math.abs(f));
}

/**
 * Convert an [r, g, b] array to a hex color string (#RRGGBB).
 */
export function rgbToHex([r, g, b]: [number, number, number]): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

/**
 * Rough color-name classifier so the palette search can understand words like
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
  if (hue < 305) return 'purple';
  return 'pink';
}

/**
 * Perceived luminance of a hex color — picks a readable number-badge ink.
 * (0.2126/0.7152/0.0722 = WCAG relative luminance weights.)
 */
export function swatchInkColor(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.58 ? 'rgba(46, 36, 52, 0.75)' : 'rgba(255, 251, 242, 0.92)';
}