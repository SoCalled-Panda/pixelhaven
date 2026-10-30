import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loadCatalog, assetUrl, type Catalog } from '../data/catalog';
import { sessionRepository } from '../data/sessionRepo';
import { customArtworkRepository, type CustomArtworkRecord } from '../data/customArtworks';
import type { SessionSnapshot } from '../engine/types';
import { Button } from '../components/ui/Button';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Spinner } from '../components/ui/Spinner';
import { Modal } from '../components/ui/Modal';
import { PhotoImport } from '../components/PhotoImport';
import { PixelDonut } from '../components/Logo';
import { IconArrowRight, IconTrash } from '../components/icons';

type Status = 'not-started' | 'in-progress' | 'completed';
type Filter = 'all' | 'in-progress' | 'completed';

interface GalleryItem {
  id: string;
  title: string;
  preview: string;
  tier?: 'hd' | 'classic';
  /** Imported by the user (photo → coloring page, round 8). */
  custom?: boolean;
  status: Status;
  percent: number;
  updatedAt: number;
  createdAt: number;
}

const STATUS_LABEL: Record<Status, string> = {
  'not-started': 'Not started',
  'in-progress': 'In progress',
  completed: 'Completed',
};

function statusOf(session: SessionSnapshot | null): Status {
  if (!session) return 'not-started';
  return session.completedAt ? 'completed' : 'in-progress';
}

function percentOf(session: SessionSnapshot): number {
  if (session.cells.length === 0) return 0;
  const colored = session.cells.reduce((sum, cell) => (cell !== 0 ? sum + 1 : sum), 0);
  return Math.round((colored / session.cells.length) * 100);
}

export function HomePage() {
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Map<string, SessionSnapshot> | null>(null);
  const [customs, setCustoms] = useState<Map<string, CustomArtworkRecord> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomArtworkRecord | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setCatalogError(null);
    loadCatalog()
      .then((data) => {
        if (!cancelled) setCatalog(data);
      })
      .catch(() => {
        if (!cancelled) {
          setCatalogError('The gallery could not be loaded. Check your connection and try again.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  useEffect(() => {
    let cancelled = false;
    sessionRepository.list().then((list) => {
      if (!cancelled) setSessions(new Map(list.map((session) => [session.artworkId, session])));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    customArtworkRepository.list().then((list) => {
      if (!cancelled) setCustoms(new Map(list.map((record) => [record.id, record])));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const items = useMemo<GalleryItem[]>(() => {
    if (!catalog) return [];
    const builtIn = catalog.artworks.map((entry) => {
      const session = sessions?.get(entry.id) ?? null;
      return {
        id: entry.id,
        title: entry.title,
        preview: entry.preview,
        tier: entry.tier,
        status: statusOf(session),
        percent: session ? percentOf(session) : 0,
        updatedAt: session?.updatedAt ?? 0,
        createdAt: 0,
      };
    });
    const imported = Array.from(customs?.values() ?? []).map((record: CustomArtworkRecord) => {
      const session = sessions?.get(record.id) ?? null;
      return {
        id: record.id,
        title: record.title,
        preview: record.previewDataUrl,
        custom: true,
        status: statusOf(session),
        percent: session ? percentOf(session) : 0,
        updatedAt: session?.updatedAt ?? 0,
        createdAt: record.createdAt,
      };
    });
    const list = [...builtIn, ...imported];
    // Recently opened first, then newest import, then catalog order (§F).
    return list.sort((a, b) => {
      const aKey = a.updatedAt || a.createdAt;
      const bKey = b.updatedAt || b.createdAt;
      if (aKey && bKey) return bKey - aKey;
      if (aKey) return -1;
      if (bKey) return 1;
      return 0;
    });
  }, [catalog, sessions, customs]);

  const continueTarget = useMemo(() => {
    const inProgress = items
      .filter((item) => item.status === 'in-progress')
      .sort((a, b) => b.updatedAt - a.updatedAt);
    return inProgress[0] ?? null;
  }, [items]);

  const visible = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter((item) =>
      filter === 'completed' ? item.status === 'completed' : item.status === 'in-progress',
    );
  }, [items, filter]);

  const handleImported = (record: CustomArtworkRecord) => {
    setCustoms((prev) => {
      const next = new Map(prev ?? []);
      next.set(record.id, record);
      return next;
    });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const record = deleteTarget;
    setDeleteTarget(null);
    await customArtworkRepository.remove(record.id);
    await sessionRepository.remove(record.id);
    setCustoms((prev) => {
      const next = new Map(prev ?? []);
      next.delete(record.id);
      return next;
    });
    setSessions((prev) => {
      const next = new Map(prev ?? []);
      next.delete(record.id);
      return next;
    });
  };

  if (catalogError) {
    return (
      <main className="page">
        <div className="state-block">
          <h1>Take a deep breath…</h1>
          <p className="notfound-page__hint">{catalogError}</p>
          <Button variant="primary" onClick={() => setAttempt((n) => n + 1)}>
            Try again
          </Button>
        </div>
      </main>
    );
  }

  if (!catalog) {
    return (
      <main className="page">
        <div className="state-block" aria-live="polite">
          <Spinner large label="Opening the gallery" />
          <p>Opening the gallery…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="page home">
      <section className="home__hero">
        <PixelDonut size={64} />
        <h1>Welcome to your cozy corner</h1>
        <p className="home__tagline">
          Pick a picture, take a slow breath, and color a little. Everything saves itself —
          no account, no rush.
        </p>
        {continueTarget && (
          <Button
            variant="primary"
            size="lg"
            onClick={() => navigate(`/color/${continueTarget.id}`)}
          >
            Continue coloring {continueTarget.title} <IconArrowRight />
          </Button>
        )}
      </section>

      <section aria-label="Filter gallery" className="home__filters">
        {(
          [
            ['all', 'All'],
            ['in-progress', 'In progress'],
            ['completed', 'Completed'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={filter === value ? 'chip chip--active' : 'chip'}
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
      </section>

      {visible.length === 0 ? (
        <div className="state-block">
          <p>Nothing here yet — start a picture or add your own photo.</p>
          <div className="state-block__actions">
            <Button variant="secondary" onClick={() => setFilter('all')}>
              Show all pictures
            </Button>
          </div>
          <ul className="gallery gallery--single">
            <PhotoImport onImported={handleImported} />
          </ul>
        </div>
      ) : (
        <ul className="gallery">
          <PhotoImport onImported={handleImported} />
          {visible.map((item) => (
            <li key={item.id} className={item.custom ? 'gallery__cell gallery__cell--custom' : 'gallery__cell'}>
              <Link
                to={`/color/${item.id}`}
                className="card card--interactive artwork-card"
                aria-label={`${item.title} — ${STATUS_LABEL[item.status]}${
                  item.status === 'in-progress' ? `, ${item.percent}% colored` : ''
                }`}
              >
                <span className="artwork-card__thumb">
                  <img
                    src={item.custom ? item.preview : assetUrl(item.preview)}
                    alt=""
                    loading="lazy"
                    width={160}
                    height={160}
                  />
                  {item.custom ? (
                    <span className="artwork-card__hd" aria-label="Imported by you">
                      YOURS
                    </span>
                  ) : (
                    item.tier === 'hd' && (
                      <span className="artwork-card__hd" aria-label="High-fidelity artwork">
                        HD
                      </span>
                    )
                  )}
                </span>
                <span className="artwork-card__body">
                  <span className="artwork-card__title">{item.title}</span>
                  <span
                    className={
                      item.status === 'completed'
                        ? 'badge badge--done'
                        : item.status === 'in-progress'
                          ? 'badge badge--progress'
                          : 'badge'
                    }
                  >
                    {STATUS_LABEL[item.status]}
                    {item.status === 'in-progress' ? ` · ${item.percent}%` : ''}
                  </span>
                  {item.status === 'in-progress' && (
                    <ProgressBar value={item.percent} showPercent={false} label="" />
                  )}
                </span>
              </Link>
              {item.custom && (
                <button
                  type="button"
                  className="artwork-card__delete"
                  aria-label={`Delete ${item.title}`}
                  title={`Delete ${item.title}`}
                  onClick={() => setDeleteTarget(customs?.get(item.id) ?? null)}
                >
                  <IconTrash />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={deleteTarget !== null}
        title={`Delete “${deleteTarget?.title ?? ''}”?`}
        onClose={() => setDeleteTarget(null)}
      >
        <p>
          The coloring page made from your photo will be removed from this browser, together with
          any progress. This cannot be undone.
        </p>
        <div className="modal__actions">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
            Keep it
          </Button>
          <Button variant="danger-solid" onClick={() => void confirmDelete()}>
            Delete
          </Button>
        </div>
      </Modal>
    </main>
  );
}
