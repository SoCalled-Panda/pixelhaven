import type { ArtworkManifest } from '../engine/types';
import { PHOTO_PAPER } from '../lib/photoPbn';
import { openPixelHavenDb, STORE_CUSTOM } from './sessionRepo';

/**
 * A user-imported artwork (photo → paint-by-number, round 8). The record is
 * self-contained: the manifest is stored inline, so the coloring page needs
 * no network round trip for custom boards and gallery previews are plain
 * data URLs.
 */
export interface CustomArtworkRecord {
  id: string;
  title: string;
  createdAt: number;
  /** Inline schema-2 manifest produced by the photo pipeline. */
  manifest: ArtworkManifest;
  /** PNG data URL of the finished paint-by-number target. */
  previewDataUrl: string;
  /** Small JPEG snapshot of the original photo (may be empty). */
  sourceDataUrl: string;
}

/** Custom ids must satisfy the manifest id rule AND carry the prefix. */
export const CUSTOM_ID_PREFIX = 'custom-';

export function isCustomArtworkId(id: string): boolean {
  return id.startsWith(CUSTOM_ID_PREFIX);
}

/**
 * Round-10 paper migration: records stored before this round carry a
 * mood-derived paper tone (often brown or cream) sampled from the photo.
 * The board now always sits on white, so rewrite `paperColor` and the
 * reserved palette slot 0 on read, then persist the fix. Slot 0 is the
 * uncolored/paper appearance only, so no colored cell changes hue.
 * Returns null when the record is already on white paper.
 */
function migrateWhitePaper(record: CustomArtworkRecord): CustomArtworkRecord | null {
  const manifest = record?.manifest;
  if (!manifest || manifest.schemaVersion !== 2 || !Array.isArray(manifest.palette)) {
    return null;
  }
  if (manifest.paperColor === PHOTO_PAPER && manifest.palette[0] === PHOTO_PAPER) {
    return null;
  }
  return {
    ...record,
    manifest: {
      ...manifest,
      paperColor: PHOTO_PAPER,
      palette: manifest.palette.map((color, index) => (index === 0 ? PHOTO_PAPER : color)),
    },
  };
}

let idSequence = 0;

export function makeCustomArtworkId(): string {
  // Timestamp + in-session counter + random salt: unique within a session
  // (the counter never repeats), effectively unique across restarts.
  idSequence = (idSequence + 1) % 46656;
  const salt = crypto.getRandomValues(new Uint16Array(1))[0].toString(36).padStart(2, '0');
  return `${CUSTOM_ID_PREFIX}${Date.now().toString(36)}${idSequence.toString(36).padStart(3, '0')}${salt}`;
}

/**
 * Repository for the `custom-artworks` object store. Opens its own connection
 * to the same database file (same versioned schema) as SessionRepository, and
 * degrades the same way: every method resolves rather than rejects when
 * storage is unavailable.
 */
export class CustomArtworkRepository {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private open(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = openPixelHavenDb().catch((error) => {
        this.dbPromise = null; // allow retry after a transient failure
        throw error;
      });
    }
    return this.dbPromise;
  }

  async list(): Promise<CustomArtworkRecord[]> {
    let db: IDBDatabase;
    try {
      db = await this.open();
    } catch {
      return [];
    }
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_CUSTOM, 'readonly');
      const request = tx.objectStore(STORE_CUSTOM).getAll();
      request.onsuccess = () => {
        const rows = (request.result as CustomArtworkRecord[] | undefined) ?? [];
        const out: CustomArtworkRecord[] = [];
        for (const row of rows) {
          if (!isCustomArtworkId(row?.id)) continue;
          const fixed = migrateWhitePaper(row);
          if (fixed) void this.put(fixed); // persist the migration, best effort
          out.push(fixed ?? row);
        }
        resolve(out);
      };
      request.onerror = () => resolve([]);
    });
  }

  async get(id: string): Promise<CustomArtworkRecord | null> {
    if (!isCustomArtworkId(id)) return null;
    let db: IDBDatabase;
    try {
      db = await this.open();
    } catch {
      return null;
    }
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_CUSTOM, 'readonly');
      const request = tx.objectStore(STORE_CUSTOM).get(id);
      request.onsuccess = () => {
        const row = (request.result as CustomArtworkRecord | undefined) ?? null;
        const fixed = row ? migrateWhitePaper(row) : null;
        if (fixed) void this.put(fixed); // persist the migration, best effort
        resolve(fixed ?? row);
      };
      request.onerror = () => resolve(null);
    });
  }

  async put(record: CustomArtworkRecord): Promise<boolean> {
    if (!isCustomArtworkId(record?.id)) return false;
    let db: IDBDatabase;
    try {
      db = await this.open();
    } catch {
      return false;
    }
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_CUSTOM, 'readwrite');
      tx.objectStore(STORE_CUSTOM).put(record);
      tx.oncomplete = () => resolve(true);
      tx.onabort = () => resolve(false);
      tx.onerror = () => resolve(false);
    });
  }

  async remove(id: string): Promise<boolean> {
    let db: IDBDatabase;
    try {
      db = await this.open();
    } catch {
      return false;
    }
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_CUSTOM, 'readwrite');
      tx.objectStore(STORE_CUSTOM).delete(id);
      tx.oncomplete = () => resolve(true);
      tx.onabort = () => resolve(false);
      tx.onerror = () => resolve(false);
    });
  }
}

/** App-wide singleton; tests construct fresh instances instead. */
export const customArtworkRepository = new CustomArtworkRepository();
