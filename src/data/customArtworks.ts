import type { ArtworkManifest } from '../engine/types';
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
        resolve(rows.filter((row) => isCustomArtworkId(row?.id)));
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
      request.onsuccess = () => resolve((request.result as CustomArtworkRecord | undefined) ?? null);
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
