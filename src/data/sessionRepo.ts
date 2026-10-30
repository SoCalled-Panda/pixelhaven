import type { SessionSnapshot } from '../engine/types';

const DB_NAME = 'pixelhaven';
const DB_VERSION = 2;
export const STORE_SESSIONS = 'sessions';
export const STORE_CUSTOM = 'custom-artworks';

/**
 * Open a fresh connection to the shared database. Both IndexedDB modules
 * (sessions + custom artworks) call this and cache the handle per instance
 * — multiple concurrent connections to one version are safe, and instance
 * level caching keeps tests isolated (fresh factories per test).
 */
export function openPixelHavenDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB is unavailable'));
  }
  const request = indexedDB.open(DB_NAME, DB_VERSION);
  return new Promise<IDBDatabase>((resolve, reject) => {
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_SESSIONS)) {
        db.createObjectStore(STORE_SESSIONS, { keyPath: 'artworkId' });
      }
      if (!db.objectStoreNames.contains(STORE_CUSTOM)) {
        db.createObjectStore(STORE_CUSTOM, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
  });
}

export type SaveResult =
  | { ok: true }
  | { ok: false; reason: 'conflict' | 'unavailable' | 'quota' | 'error' };

/**
 * One of the two modules that touch IndexedDB (architecture §2) — the other
 * is `customArtworks.ts`, which shares this database file.
 *
 * - Schema v2: `sessions` (keyed by artworkId) + `custom-artworks` (v8 round).
 * - Upgrades: `onupgradeneeded` creates missing stores idempotently; future
 *   versions add stores/migrations inside the same switch on `DB_VERSION`.
 * - Stale-write protection: `save()` is a compare-and-set on the stored
 *   `revision` inside a single readwrite transaction, so an older tab can
 *   never overwrite newer progress (checklist §G).
 */
export class SessionRepository {
  private dbPromise: Promise<IDBDatabase> | null = null;

  protected open(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = openPixelHavenDb().catch((error) => {
        this.dbPromise = null; // allow retry after a transient failure
        throw error;
      });
    }
    return this.dbPromise;
  }

  /** Resolve a stored session, or null when absent / storage unavailable. */
  async load(artworkId: string): Promise<SessionSnapshot | null> {
    let db: IDBDatabase;
    try {
      db = await this.open();
    } catch {
      return null;
    }
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_SESSIONS, 'readonly');
      const request = tx.objectStore(STORE_SESSIONS).get(artworkId);
      request.onsuccess = () => resolve((request.result as SessionSnapshot | undefined) ?? null);
      request.onerror = () => resolve(null);
    });
  }

  /** All stored sessions (gallery statuses). Empty list when storage is down. */
  async list(): Promise<SessionSnapshot[]> {
    let db: IDBDatabase;
    try {
      db = await this.open();
    } catch {
      return [];
    }
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_SESSIONS, 'readonly');
      const request = tx.objectStore(STORE_SESSIONS).getAll();
      request.onsuccess = () => resolve((request.result as SessionSnapshot[] | undefined) ?? []);
      request.onerror = () => resolve([]);
    });
  }

  /**
   * Optimistic-concurrency write: the snapshot is accepted only when it is
   * at least as new as what is stored. Snapshots are produced by
   * `ColoringEngine.exportSnapshot()`, which copies the buffer before the
   * async write.
   */
  async save(snapshot: SessionSnapshot): Promise<SaveResult> {
    let db: IDBDatabase;
    try {
      db = await this.open();
    } catch {
      return { ok: false, reason: 'unavailable' };
    }

    return new Promise<SaveResult>((resolve) => {
      let settled = false;
      const done = (result: SaveResult) => {
        if (!settled) {
          settled = true;
          resolve(result);
        }
      };

      let tx: IDBTransaction;
      try {
        tx = db.transaction(STORE_SESSIONS, 'readwrite');
      } catch {
        done({ ok: false, reason: 'error' });
        return;
      }

      const store = tx.objectStore(STORE_SESSIONS);
      const getReq = store.get(snapshot.artworkId);

      getReq.onsuccess = () => {
        const existing = getReq.result as SessionSnapshot | undefined;
        // Accept only strictly newer revisions. A tie means two writers
        // diverged from the same base (e.g. two tabs) — that is a conflict.
        if (existing && existing.revision >= snapshot.revision) {
          done({ ok: false, reason: 'conflict' });
          return;
        }
        try {
          store.put(snapshot);
        } catch {
          done({ ok: false, reason: 'error' });
        }
      };
      getReq.onerror = () => done({ ok: false, reason: 'error' });

      tx.oncomplete = () => done({ ok: true });
      tx.onabort = () => {
        done(tx.error?.name === 'QuotaExceededError' ? { ok: false, reason: 'quota' } : { ok: false, reason: 'error' });
      };
    });
  }

  /** Remove one artwork's session (used by the "start fresh" recovery path). */
  async remove(artworkId: string): Promise<boolean> {
    let db: IDBDatabase;
    try {
      db = await this.open();
    } catch {
      return false;
    }
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_SESSIONS, 'readwrite');
      const request = tx.objectStore(STORE_SESSIONS).delete(artworkId);
      request.onsuccess = () => resolve(true);
      request.onerror = () => resolve(false);
    });
  }
}

/** App-wide singleton; tests construct fresh instances instead. */
export const sessionRepository = new SessionRepository();
