import type { SessionSnapshot } from '../engine/types';

/**
 * Exported save-file format (checklist §G: export save / import with
 * schema validation). Versioned envelope around a session snapshot; the
 * artwork-specific checks (content version, cell count, palette range)
 * happen in `ColoringEngine.validateSnapshot` when the file is applied.
 */

export interface SaveFileV1 {
  type: 'pixelhaven-save';
  schemaVersion: 1;
  exportedAt: string;
  session: SessionSnapshot;
}

export type ImportCheck =
  | { ok: true; session: SessionSnapshot }
  | { ok: false; reason: string };

/** Allocation guard before any array work (architecture §7). */
const MAX_JSON_CHARS = 3_000_000;
const MAX_CELLS = 512 * 512;

export function serializeSaveFile(session: SessionSnapshot): string {
  const file: SaveFileV1 = {
    type: 'pixelhaven-save',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    session,
  };
  return JSON.stringify(file, null, 2);
}

export function parseSaveFile(json: string): ImportCheck {
  if (json.length > MAX_JSON_CHARS) {
    return { ok: false, reason: 'File is too large to be a PixelHaven save.' };
  }
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { ok: false, reason: 'That file is not valid JSON.' };
  }
  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, reason: 'That file is not a PixelHaven save file.' };
  }
  const file = raw as Record<string, unknown>;
  if (file.type !== 'pixelhaven-save') {
    return { ok: false, reason: 'That file is not a PixelHaven save file.' };
  }
  if (file.schemaVersion !== 1) {
    return { ok: false, reason: 'This save file uses an incompatible format version.' };
  }
  const session = file.session;
  if (typeof session !== 'object' || session === null) {
    return { ok: false, reason: 'Save file is missing its session data.' };
  }
  const s = session as Record<string, unknown>;

  if (typeof s.artworkId !== 'string' || !/^[a-z0-9-]+$/.test(s.artworkId)) {
    return { ok: false, reason: 'Save file names an unknown artwork.' };
  }
  if (!Number.isInteger(s.contentVersion) || (s.contentVersion as number) < 1) {
    return { ok: false, reason: 'Save file has an invalid content version.' };
  }
  if (s.schemaVersion !== 1) {
    return { ok: false, reason: 'This save file uses an incompatible format version.' };
  }
  if (!Array.isArray(s.cells)) {
    return { ok: false, reason: 'Save file has no coloring data.' };
  }
  if (s.cells.length > MAX_CELLS) {
    return { ok: false, reason: 'Save file coloring data is too large.' };
  }
  for (const v of s.cells) {
    if (!Number.isInteger(v) || (v as number) < 0 || (v as number) > 255) {
      return { ok: false, reason: 'Save file coloring data is corrupted.' };
    }
  }
  if (!Number.isInteger(s.revision) || (s.revision as number) < 0) {
    return { ok: false, reason: 'Save file has an invalid revision.' };
  }

  const now = Date.now();
  const parsed: SessionSnapshot = {
    artworkId: s.artworkId,
    contentVersion: s.contentVersion as number,
    schemaVersion: 1,
    cells: s.cells as number[],
    revision: s.revision as number,
    createdAt: typeof s.createdAt === 'number' ? s.createdAt : now,
    updatedAt: typeof s.updatedAt === 'number' ? s.updatedAt : now,
    completedAt: typeof s.completedAt === 'number' ? s.completedAt : null,
  };
  return { ok: true, session: parsed };
}

/** Browser download helper (no-op safety in non-browser environments). */
export function downloadSaveFile(json: string, artworkId: string): void {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `pixelhaven-${artworkId}-save.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
