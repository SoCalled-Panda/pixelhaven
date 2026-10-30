import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import {
  CustomArtworkRepository,
  isCustomArtworkId,
  makeCustomArtworkId,
  type CustomArtworkRecord,
} from './customArtworks';
import { validateManifest } from './manifest';

function makeManifest(id = 'custom-test') {
  return {
    id,
    title: 'My photo',
    schemaVersion: 2,
    contentVersion: 1,
    width: 4,
    height: 4,
    paperColor: '#f8f1e5',
    outlineColor: '#2b2620',
    palette: ['#f8f1e5', '#e8875f', '#43364a', '#7fb069'],
    rle: ['0104', '0104', '0204', '0304'],
  };
}

function makeRecord(overrides: Partial<CustomArtworkRecord> = {}): CustomArtworkRecord {
  return {
    id: 'custom-abc',
    title: 'Sunset beach',
    createdAt: 1730000000000,
    manifest: makeManifest('custom-abc'),
    previewDataUrl: 'data:image/png;base64,AAAA',
    sourceDataUrl: 'data:image/jpeg;base64,BBBB',
    ...overrides,
  };
}

describe('CustomArtworkRepository (IndexedDB, round 8)', () => {
  let repo: CustomArtworkRepository;

  beforeEach(() => {
    vi.stubGlobal('indexedDB', new IDBFactory());
    repo = new CustomArtworkRepository();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('round-trips a record through put + get', async () => {
    const record = makeRecord();
    expect(await repo.put(record)).toBe(true);
    const loaded = await repo.get('custom-abc');
    expect(loaded).not.toBeNull();
    expect(loaded!.title).toBe('Sunset beach');
    expect(loaded!.manifest.rle).toEqual(['0104', '0104', '0204', '0304']);
    expect(loaded!.previewDataUrl).toContain('data:image/png');
  });

  it('stores a manifest that still passes the production validator', async () => {
    await repo.put(makeRecord());
    const loaded = await repo.get('custom-abc');
    const validated = validateManifest(loaded!.manifest);
    expect(validated.ok).toBe(true);
    if (validated.ok) {
      expect(validated.artwork.colorableCount).toBe(16);
    }
  });

  it('lists every record', async () => {
    await repo.put(makeRecord());
    await repo.put(makeRecord({ id: makeCustomArtworkId(), title: 'Second' }));
    const list = await repo.list();
    expect(list).toHaveLength(2);
    expect(list.map((r) => r.title).sort()).toEqual(['Second', 'Sunset beach']);
  });

  it('rejects ids without the custom- prefix', async () => {
    expect(await repo.put(makeRecord({ id: 'floating-tree' }))).toBe(false);
    expect(await repo.get('floating-tree')).toBeNull();
    expect(await repo.list()).toHaveLength(0);
  });

  it('returns null for unknown ids', async () => {
    await repo.put(makeRecord());
    expect(await repo.get('custom-missing')).toBeNull();
  });

  it('removes records', async () => {
    await repo.put(makeRecord());
    expect(await repo.remove('custom-abc')).toBe(true);
    expect(await repo.get('custom-abc')).toBeNull();
    expect(await repo.remove('custom-abc')).toBe(true); // idempotent
  });

  it('degrades gracefully when IndexedDB is unavailable', async () => {
    vi.stubGlobal('indexedDB', undefined);
    const offline = new CustomArtworkRepository();
    expect(await offline.list()).toEqual([]);
    expect(await offline.get('custom-abc')).toBeNull();
    expect(await offline.put(makeRecord())).toBe(false);
    expect(await offline.remove('custom-abc')).toBe(false);
  });
});

describe('custom id helpers', () => {
  it('generates prefixed, manifest-safe ids', () => {
    const id = makeCustomArtworkId();
    expect(isCustomArtworkId(id)).toBe(true);
    expect(id).toMatch(/^custom-[a-z0-9]+$/);
  });

  it('makes distinct ids', () => {
    const seen = new Set(Array.from({ length: 50 }, () => makeCustomArtworkId()));
    expect(seen.size).toBe(50);
  });
});
