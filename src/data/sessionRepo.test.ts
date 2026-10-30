import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { SessionRepository } from './sessionRepo';
import type { SessionSnapshot } from '../engine/types';

function makeSnapshot(overrides: Partial<SessionSnapshot> = {}): SessionSnapshot {
  return {
    artworkId: 'warm-heart',
    contentVersion: 1,
    schemaVersion: 1,
    cells: [0, 1, 0, 2],
    revision: 3,
    createdAt: 1000,
    updatedAt: 2000,
    completedAt: null,
    ...overrides,
  };
}

describe('SessionRepository (IndexedDB, checklist §G)', () => {
  let repo: SessionRepository;

  beforeEach(() => {
    // Fresh database per test so records never leak between cases.
    vi.stubGlobal('indexedDB', new IDBFactory());
    repo = new SessionRepository();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('round-trips a snapshot through save + load', async () => {
    const snap = makeSnapshot();
    expect(await repo.save(snap)).toEqual({ ok: true });
    const loaded = await repo.load('warm-heart');
    expect(loaded).not.toBeNull();
    expect(loaded!.cells).toEqual([0, 1, 0, 2]);
    expect(loaded!.revision).toBe(3);
  });

  it('load returns null for unknown artworks', async () => {
    expect(await repo.load('does-not-exist')).toBeNull();
  });

  it('save overwrites when the new revision is strictly higher', async () => {
    await repo.save(makeSnapshot({ revision: 5 }));
    expect(await repo.save(makeSnapshot({ revision: 6, cells: [1, 1, 1, 1] }))).toEqual({ ok: true });
    const loaded = await repo.load('warm-heart');
    expect(loaded!.revision).toBe(6);
    expect(loaded!.cells).toEqual([1, 1, 1, 1]);
  });

  it('treats an equal revision as a diverged-writers conflict', async () => {
    await repo.save(makeSnapshot({ revision: 5, cells: [1, 1, 1, 1] }));
    const tie = await repo.save(makeSnapshot({ revision: 5, cells: [2, 2, 2, 2] }));
    expect(tie).toEqual({ ok: false, reason: 'conflict' });
    expect((await repo.load('warm-heart'))!.cells).toEqual([1, 1, 1, 1]);
  });

  it('refuses stale writes — optimistic concurrency (checklist §G)', async () => {
    await repo.save(makeSnapshot({ revision: 10, cells: [1, 1, 1, 1] }));
    const stale = await repo.save(makeSnapshot({ revision: 7, cells: [0, 0, 0, 0] }));
    expect(stale).toEqual({ ok: false, reason: 'conflict' });
    // Newer progress is intact:
    const loaded = await repo.load('warm-heart');
    expect(loaded!.revision).toBe(10);
    expect(loaded!.cells).toEqual([1, 1, 1, 1]);
  });

  it('keeps different artworks in separate records', async () => {
    await repo.save(makeSnapshot({ artworkId: 'warm-heart' }));
    await repo.save(makeSnapshot({ artworkId: 'pond-duck', cells: [1] }));
    const all = await repo.list();
    expect(all).toHaveLength(2);
    expect((await repo.load('pond-duck'))!.cells).toEqual([1]);
  });

  it('remove deletes exactly one artwork session', async () => {
    await repo.save(makeSnapshot());
    await repo.save(makeSnapshot({ artworkId: 'pond-duck' }));
    expect(await repo.remove('warm-heart')).toBe(true);
    expect(await repo.load('warm-heart')).toBeNull();
    expect(await repo.load('pond-duck')).not.toBeNull();
  });

  describe('when IndexedDB is unavailable', () => {
    beforeEach(() => {
      vi.stubGlobal('indexedDB', undefined);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('load/list degrade to empty results', async () => {
      const brokenRepo = new SessionRepository();
      expect(await brokenRepo.load('warm-heart')).toBeNull();
      expect(await brokenRepo.list()).toEqual([]);
    });

    it('save reports an "unavailable" result instead of throwing', async () => {
      const brokenRepo = new SessionRepository();
      const result = await brokenRepo.save(makeSnapshot());
      expect(result).toEqual({ ok: false, reason: 'unavailable' });
    });

    it('remove reports failure without throwing', async () => {
      const brokenRepo = new SessionRepository();
      expect(await brokenRepo.remove('warm-heart')).toBe(false);
    });
  });
});
