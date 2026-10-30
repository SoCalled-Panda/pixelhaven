import { usePersistentPreference } from '../hooks/usePersistentPreference';
import { IconClose, IconImage } from './icons';

interface ReferencePreviewProps {
  /** URL of the finished-picture preview (preview.svg from the catalog). */
  src: string;
  title: string;
}

/**
 * Floating "finished picture" card over the canvas, top-left corner —
 * parity with the reference coloring apps (review feedback round 5):
 * a small thumbnail shows what the completed artwork looks like, so
 * colorers always have the target in view. Dismissible; the choice is
 * remembered per browser (best-effort localStorage).
 */
export function ReferencePreview({ src, title }: ReferencePreviewProps) {
  const [preference, setPreference] = usePersistentPreference('reference-preview', 'open');
  const open = preference === 'open';

  if (open) {
    return (
      <aside className="ref-preview" aria-label="Finished picture reference">
        <div className="ref-preview__bar">
          <span className="ref-preview__label">reference</span>
          <button
            type="button"
            className="ref-preview__close"
            aria-label="Hide the finished picture"
            title="Hide the finished picture"
            onClick={() => setPreference('closed')}
          >
            <IconClose />
          </button>
        </div>
        <img src={src} alt={`Finished version of ${title}`} draggable={false} />
      </aside>
    );
  }

  return (
    <button
      type="button"
      className="ref-preview__reopen"
      aria-label="Show the finished picture"
      title="Show the finished picture"
      onClick={() => setPreference('open')}
    >
      <IconImage />
    </button>
  );
}
