import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  convertPhotoToArtwork,
  loadImageSource,
  sourceThumbnailDataUrl,
  type ConvertedArtwork,
} from '../lib/photoPbn';
import {
  customArtworkRepository,
  makeCustomArtworkId,
  type CustomArtworkRecord,
} from '../data/customArtworks';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { Spinner } from './ui/Spinner';
import { IconImage, IconPlus } from './icons';

type Phase =
  | { kind: 'idle' }
  | { kind: 'converting'; step: string; sourceUrl: string | null }
  | { kind: 'review'; source: CanvasImageSource; sourceUrl: string; converted: ConvertedArtwork }
  | { kind: 'error'; message: string };

const MAX_TITLE = 60;

/** "sunsetbeach.jpg" → "Sunsetbeach"; falls back to a friendly default. */
function titleFromFileName(name: string): string {
  const base = name.replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!base) return 'My photo';
  const titled = base.slice(0, MAX_TITLE).replace(/\b\w/g, (c) => c.toUpperCase());
  return titled;
}

/**
 * "Add your photo" gallery cell + import wizard (round 8): pick an image,
 * the app converts it into a paint-by-number board with the same pipeline
 * used for the built-in HD set, shows a side-by-side review, then saves it
 * to IndexedDB and opens the coloring page. No upload anywhere — the photo
 * never leaves the browser.
 */
export function PhotoImport({ onImported }: { onImported: (record: CustomArtworkRecord) => void }) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [title, setTitle] = useState('My photo');
  const [saving, setSaving] = useState(false);

  const openPicker = () => inputRef.current?.click();

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setPhase({ kind: 'error', message: 'That file is not an image. Try a JPG, PNG or WebP photo.' });
      return;
    }
    setPhase({ kind: 'converting', step: 'Reading your photo…', sourceUrl: null });
    try {
      const source = await loadImageSource(file);
      const sourceUrl = sourceThumbnailDataUrl(source);
      setPhase({ kind: 'converting', step: 'Mixing your palette…', sourceUrl });
      // Give the spinner one painted frame before the heavy math starts.
      await new Promise((resolve) => setTimeout(resolve, 30));
      const converted = await convertPhotoToArtwork(source, {
        id: makeCustomArtworkId(),
        title: titleFromFileName(file.name),
      });
      setTitle(titleFromFileName(file.name));
      setPhase({ kind: 'review', source, sourceUrl, converted });
    } catch (error) {
      setPhase({
        kind: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Something went wrong while converting that photo.',
      });
    }
  };

  const startColoring = async () => {
    if (phase.kind !== 'review') return;
    setSaving(true);
    const finalTitle = title.trim().slice(0, MAX_TITLE) || 'My photo';
    const { converted, sourceUrl } = phase;
    const record: CustomArtworkRecord = {
      id: converted.manifest.id,
      title: finalTitle,
      createdAt: Date.now(),
      // Keep the manifest's internal title in sync with the chosen name so
      // the coloring page header matches the gallery card.
      manifest: { ...converted.manifest, title: finalTitle },
      previewDataUrl: converted.previewDataUrl,
      sourceDataUrl: sourceUrl,
    };
    const ok = await customArtworkRepository.put(record);
    setSaving(false);
    if (!ok) {
      setPhase({ kind: 'error', message: 'Your browser storage is full or unavailable, so the picture could not be saved.' });
      return;
    }
    onImported(record);
    setPhase({ kind: 'idle' });
    navigate(`/color/${record.id}`);
  };

  const modalOpen = phase.kind !== 'idle';

  return (
    <li className="import-cell">
      <button type="button" className="card card--interactive import-cell__button" onClick={openPicker}>
        <span className="import-cell__icon">
          <IconPlus />
        </span>
        <span className="import-cell__title">Add your photo</span>
        <span className="import-cell__hint">Turn any picture into a coloring page</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        aria-label="Choose a photo to convert"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = ''; // allow re-picking the same file
          void handleFile(file);
        }}
      />

      <Modal
        open={modalOpen}
        wide={phase.kind === 'review'}
        title={
          phase.kind === 'review'
            ? 'Your coloring page is ready'
            : phase.kind === 'error'
              ? 'Hmm, that did not work'
              : 'Making your coloring page'
        }
        onClose={() => {
          if (phase.kind === 'converting' || saving) return; // not cancellable mid-flight
          setPhase({ kind: 'idle' });
        }}
      >
        {phase.kind === 'converting' && (
          <div className="import-progress" aria-live="polite">
            {phase.sourceUrl ? (
              <img src={phase.sourceUrl} alt="" className="import-progress__thumb" />
            ) : (
              <span className="import-progress__thumb import-progress__thumb--placeholder">
                <IconImage />
              </span>
            )}
            <Spinner large label={phase.step} />
            <p>{phase.step}</p>
          </div>
        )}

        {phase.kind === 'review' && (
          <div className="import-review">
            <div className="import-review__compare">
              <figure>
                <img src={phase.sourceUrl} alt="The photo you picked" />
                <figcaption>Your photo</figcaption>
              </figure>
              <span className="import-review__arrow" aria-hidden="true">
                →
              </span>
              <figure>
                <img src={phase.converted.previewDataUrl} alt="The paint-by-number version" />
                <figcaption>Your coloring page</figcaption>
              </figure>
            </div>
            <p className="import-review__stats">
              {phase.converted.usedColors} colors · {phase.converted.regions} regions · 256×256 · HD
            </p>
            <label className="import-review__field">
              <span>Name your picture</span>
              <input
                type="text"
                value={title}
                maxLength={MAX_TITLE}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="My photo"
              />
            </label>
            <div className="modal__actions import-review__actions">
              <Button
                variant="secondary"
                disabled={saving}
                onClick={() => {
                  setPhase({ kind: 'idle' });
                  openPicker();
                }}
              >
                Pick another photo
              </Button>
              <Button variant="primary" loading={saving} onClick={() => void startColoring()}>
                Start coloring
              </Button>
            </div>
          </div>
        )}

        {phase.kind === 'error' && (
          <div>
            <p>{phase.message}</p>
            <div className="modal__actions">
              <Button variant="primary" onClick={openPicker}>
                Try another photo
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </li>
  );
}
