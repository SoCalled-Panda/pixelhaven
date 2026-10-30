import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './ui/Button';
import { IconArrowRight } from './icons';

export interface CompletionOverlayProps {
  title: string;
  onDismiss: () => void;
  onBackToGallery: () => void;
}

const PIECE_COUNT = 26;
const PIECE_COLORS = ['#e5533d', '#f2a03d', '#f6c945', '#8fbf5f', '#5fa8d3', '#d96a9c'];

/**
 * Cozy completion celebration (checklist E "completion state/animation" and
 * J "small personal surprise"). Pixel confetti is CSS-only and disabled by
 * `prefers-reduced-motion` (styles), where it degrades to a calm banner.
 */
export function CompletionOverlay({ title, onDismiss, onBackToGallery }: CompletionOverlayProps) {
  const pieces = useMemo(
    () =>
      Array.from({ length: PIECE_COUNT }, (_, i) => ({
        left: `${(i * 37 + 11) % 100}%`,
        delay: `${((i * 13) % 20) / 10}s`,
        duration: `${2.4 + ((i * 7) % 12) / 10}s`,
        color: PIECE_COLORS[i % PIECE_COLORS.length],
      })),
    [],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onDismiss]);

  return createPortal(
    <div className="completion" role="alert" aria-live="polite">
      <div className="completion__confetti" aria-hidden="true">
        {pieces.map((piece, index) => (
          <i
            key={index}
            style={{
              left: piece.left,
              backgroundColor: piece.color,
              animationDelay: piece.delay,
              animationDuration: piece.duration,
            }}
          />
        ))}
      </div>
      <div className="completion__card">
        <svg viewBox="0 0 16 16" width="64" height="64" shapeRendering="crispEdges" aria-hidden="true">
          <g fill="#43364a">
            <rect x="2" y="1" width="4" height="1" />
            <rect x="10" y="1" width="4" height="1" />
            <rect x="1" y="2" width="1" height="7" />
            <rect x="14" y="2" width="1" height="7" />
            <rect x="1" y="9" width="2" height="2" />
            <rect x="13" y="9" width="2" height="2" />
            <rect x="3" y="11" width="2" height="2" />
            <rect x="11" y="11" width="2" height="2" />
            <rect x="5" y="13" width="6" height="1" />
          </g>
          <rect x="2" y="2" width="12" height="7" fill="#e5533d" />
          <rect x="3" y="9" width="10" height="2" fill="#e5533d" />
          <rect x="5" y="11" width="6" height="2" fill="#e5533d" />
          <rect x="2" y="2" width="2" height="2" fill="#f6c945" />
        </svg>
        <h2>Beautiful!</h2>
        <p>
          You finished <strong>{title}</strong>. Take a moment to enjoy it — it also has a
          special place in your gallery now.
        </p>
        <div className="modal__actions">
          <Button variant="ghost" onClick={onDismiss}>
            Keep admiring it
          </Button>
          <Button variant="primary" onClick={onBackToGallery}>
            Back to gallery <IconArrowRight />
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
