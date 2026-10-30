import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CanvasRenderer } from '../engine/renderer';
import { xOf, yOf } from '../engine/grid';
import { validateManifest } from '../data/manifest';
import { loadCatalog, loadManifest } from '../data/catalog';
import { customArtworkRepository, isCustomArtworkId } from '../data/customArtworks';
import { downloadSaveFile, parseSaveFile, serializeSaveFile } from '../data/saveFile';
import type { ValidatedArtwork } from '../engine/types';
import { useColoringSession } from '../hooks/useColoringSession';
import { PalettePicker } from '../components/PalettePicker';
import { ReferencePreview } from '../components/ReferencePreview';
import { SaveStatus } from '../components/SaveStatus';
import { CompletionOverlay } from '../components/CompletionOverlay';
import { Button } from '../components/ui/Button';
import { IconButton } from '../components/ui/IconButton';
import { Modal } from '../components/ui/Modal';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Spinner } from '../components/ui/Spinner';
import { useToast } from '../components/ui/Toast';
import {
  IconArrowLeft,
  IconDownload,
  IconEraser,
  IconFill,
  IconFit,
  IconMinus,
  IconMove,
  IconPlus,
  IconRedo,
  IconTrash,
  IconUndo,
  IconUpload,
} from '../components/icons';

type PageState =
  | { phase: 'loading' }
  | { phase: 'unavailable'; message: string }
  | { phase: 'ready'; artwork: ValidatedArtwork; previewUrl: string };

const INCOMPATIBLE_REASON_TEXT: Record<string, string> = {
  version: 'the picture was updated after the save was made',
  shape: 'the saved data is damaged',
  range: 'the saved data contains invalid colors',
  schema: 'the saved data uses an unsupported format',
};

export function ColoringPage() {
  const { artworkId } = useParams<{ artworkId: string }>();
  const navigate = useNavigate();
  const [state, setState] = useState<PageState>({ phase: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ phase: 'loading' });
    (async () => {
      const unavailable = (message: string) => {
        if (!cancelled) setState({ phase: 'unavailable', message });
      };
      if (!artworkId) {
        unavailable('This picture is not in the gallery.');
        return;
      }
      try {
        // Imported artworks (round 8) live in IndexedDB, not the static catalog.
        const custom = isCustomArtworkId(artworkId)
          ? await customArtworkRepository.get(artworkId)
          : null;
        if (custom) {
          const customResult = validateManifest(custom.manifest);
          if (!customResult.ok || customResult.artwork.id !== artworkId) {
            unavailable('This imported picture has invalid data and cannot be opened.');
            return;
          }
          if (!cancelled) {
            setState({
              phase: 'ready',
              artwork: customResult.artwork,
              previewUrl: custom.previewDataUrl || custom.sourceDataUrl,
            });
          }
          return;
        }
        const catalog = await loadCatalog();
        const entry = catalog.artworks.find((item) => item.id === artworkId);
        if (!entry) {
          unavailable(
            isCustomArtworkId(artworkId)
              ? 'This imported picture was removed from this browser, or was made on another device.'
              : 'This picture is not in the gallery.',
          );
          return;
        }
        const raw = await loadManifest(entry.manifest);
        const result = validateManifest(raw);
        if (!result.ok) {
          unavailable('This artwork has invalid data and cannot be opened.');
          return;
        }
        if (result.artwork.id !== artworkId) {
          unavailable('This artwork has invalid data and cannot be opened.');
          return;
        }
        if (!cancelled) setState({ phase: 'ready', artwork: result.artwork, previewUrl: entry.preview });
      } catch {
        unavailable('This artwork could not be loaded. Check your connection and try again.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [artworkId, attempt]);

  if (state.phase === 'loading') {
    return (
      <main className="page">
        <div className="state-block" aria-live="polite">
          <Spinner large label="Preparing your canvas" />
          <p>Preparing your canvas…</p>
        </div>
      </main>
    );
  }

  if (state.phase === 'unavailable') {
    return (
      <main className="page">
        <div className="state-block">
          <p className="notfound-page__code" aria-hidden="true">
            · · ·
          </p>
          <h1>This artwork is taking a break</h1>
          <p className="notfound-page__hint">{state.message}</p>
          <div className="state-block__actions">
            <Button variant="secondary" onClick={() => setAttempt((n) => n + 1)}>
              Try again
            </Button>
            <Button variant="primary" onClick={() => navigate('/')}>
              Back to the gallery
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <Studio
      key={state.artwork.id}
      artwork={state.artwork}
      previewUrl={state.previewUrl}
      onExit={() => navigate('/')}
    />
  );
}

/* ------------------------------------------------------------------------ */

function Studio({
  artwork,
  previewUrl,
  onExit,
}: {
  artwork: ValidatedArtwork;
  previewUrl: string;
  onExit: () => void;
}) {
  const session = useColoringSession(artwork);
  const { showToast } = useToast();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastCellRef = useRef<number | null>(null);
  const wasCompleteRef = useRef(session.progress.complete);
  const [resetOpen, setResetOpen] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [cursor, setCursor] = useState<number | null>(null);
  // Move tool: while on, primary drags pan the view instead of painting
  // (review feedback round 1 — discoverable panning without right-click).
  const [panMode, setPanMode] = useState(false);

  /* ------------------------------------------------- pointer gestures */

  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const gestureRef = useRef<'paint' | 'pan' | 'pinch' | null>(null);
  const pinchRef = useRef<{ dist: number; cx: number; cy: number } | null>(null);
  const panLastRef = useRef<{ x: number; y: number } | null>(null);

  // Native (non-passive) wheel + Safari gesture listeners so page zoom/scroll
  // never hijacks the canvas.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      rendererRef.current?.zoomAtPoint(
        event.clientX,
        event.clientY,
        event.deltaY < 0 ? 1.15 : 1 / 1.15,
      );
    };
    const onGesture = (event: Event) => event.preventDefault();
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('gesturestart', onGesture);
    canvas.addEventListener('gesturechange', onGesture);
    return () => {
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('gesturestart', onGesture);
      canvas.removeEventListener('gesturechange', onGesture);
    };
  }, []);

  const zoomCenter = (factor: number) => {
    const renderer = rendererRef.current;
    const canvas = canvasRef.current;
    if (!renderer || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    renderer.zoomAtPoint(rect.left + rect.width / 2, rect.top + rect.height / 2, factor);
  };

  /* renderer lifecycle */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new CanvasRenderer(canvas, artwork, session.engine);
    rendererRef.current = renderer;
    renderer.attach();
    if (import.meta.env.DEV) {
      // Debug handle for browser-console probes; stripped from production.
      (window as unknown as Record<string, unknown>).__phRenderer = renderer;
    }
    return () => {
      renderer.dispose();
      rendererRef.current = null;
      if (import.meta.env.DEV) {
        delete (window as unknown as Record<string, unknown>).__phRenderer;
      }
    };
  }, [artwork, session.engine]);

  /* keyboard cursor overlay */
  useEffect(() => {
    rendererRef.current?.setCursor(cursor);
  }, [cursor]);

  /* fill-tool region preview lives only while the fill tool is active */
  useEffect(() => {
    if (session.tool !== 'fill') rendererRef.current?.setFillPreview(null);
  }, [session.tool]);

  /* completion celebration — only on a transition made during this visit */
  useEffect(() => {
    const complete = session.progress.complete;
    if (complete && !wasCompleteRef.current) setCelebrating(true);
    wasCompleteRef.current = complete;
  }, [session.progress.complete]);

  /* -------------------------------------------------------------- pointer */

  const onPointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    // Second finger lands → switch to pinch (cancels any paint stroke).
    if (pointersRef.current.size === 2) {
      const [p1, p2] = [...pointersRef.current.values()];
      gestureRef.current = 'pinch';
      pinchRef.current = {
        dist: Math.hypot(p1.x - p2.x, p1.y - p2.y),
        cx: (p1.x + p2.x) / 2,
        cy: (p1.y + p2.y) / 2,
      };
      renderer.setHover(null);
      return;
    }

    // Right mouse button always pans (left = paint).
    if (event.pointerType === 'mouse' && event.button === 2) {
      gestureRef.current = 'pan';
      panLastRef.current = { x: event.clientX, y: event.clientY };
      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
      return;
    }
    if (event.pointerType === 'mouse' && event.button !== 0) {
      pointersRef.current.delete(event.pointerId);
      return;
    }

    // Move tool: primary pointer pans (mouse, pen, or touch).
    if (panMode) {
      gestureRef.current = 'pan';
      panLastRef.current = { x: event.clientX, y: event.clientY };
      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
      return;
    }

    // Primary pointer paints (or flood-fills).
    gestureRef.current = 'paint';
    event.currentTarget.setPointerCapture(event.pointerId);
    const cell = renderer.cellFromClientPoint(event.clientX, event.clientY);
    if (cell !== null) {
      const applied = session.applyAtCell(cell);
      renderer.setHover(cell);
      if (
        !applied &&
        session.tool === 'fill' &&
        artwork.designatedByCell[cell] >= 1
      ) {
        showToast({
          message: 'Pick this area\u2019s number in the palette first, then tap it to fill.',
          tone: 'info',
        });
      }
      lastCellRef.current = cell;
    }
    event.preventDefault();
  };

  const onPointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    if (pointersRef.current.has(event.pointerId)) {
      pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    }

    // Fill-tool preview follows the pointer while idle or mid-fill-tap so the
    // whole to-be-painted region is visible BEFORE the click (round 6).
    if (
      session.tool === 'fill' &&
      (gestureRef.current === null || gestureRef.current === 'paint')
    ) {
      renderer.setFillPreview(renderer.cellFromClientPoint(event.clientX, event.clientY));
    }

    switch (gestureRef.current) {
      case 'pinch': {
        if (pointersRef.current.size < 2 || !pinchRef.current) break;
        const [p1, p2] = [...pointersRef.current.values()];
        const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        const cx = (p1.x + p2.x) / 2;
        const cy = (p1.y + p2.y) / 2;
        const previous = pinchRef.current;
        if (previous.dist > 0 && dist > 0) {
          renderer.applyPan(cx - previous.cx, cy - previous.cy);
          renderer.zoomAtPoint(cx, cy, dist / previous.dist);
        }
        pinchRef.current = { dist, cx, cy };
        break;
      }
      case 'pan': {
        if (panLastRef.current) {
          renderer.applyPan(
            event.clientX - panLastRef.current.x,
            event.clientY - panLastRef.current.y,
          );
        }
        panLastRef.current = { x: event.clientX, y: event.clientY };
        break;
      }
      case 'paint': {
        const cell = renderer.cellFromClientPoint(event.clientX, event.clientY);
        if (cell !== lastCellRef.current) {
          renderer.setHover(cell);
          // Fill is a click-only tool — dragging with it must not smear
          // fills across every region the pointer crosses.
          if (cell !== null && session.tool !== 'fill') session.applyAtCell(cell);
          lastCellRef.current = cell;
        }
        break;
      }
      default:
        break;
    }
  };

  const endPointer = (event: PointerEvent<HTMLCanvasElement>) => {
    pointersRef.current.delete(event.pointerId);
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // capture already released — nothing to do
    }
    if (pointersRef.current.size === 0) {
      gestureRef.current = null;
      pinchRef.current = null;
      panLastRef.current = null;
      lastCellRef.current = null;
    } else if (pointersRef.current.size === 1 && gestureRef.current === 'pinch') {
      // One finger left after a pinch → keep panning (no accidental paints).
      gestureRef.current = 'pan';
      pinchRef.current = null;
      const [p] = [...pointersRef.current.values()];
      panLastRef.current = { x: p.x, y: p.y };
    }
  };

  /* ------------------------------------------------------------- keyboard */

  const moveCursor = (dx: number, dy: number) => {
    setCursor((previous) => {
      const start = previous ?? artwork.ordinalToCell[0] ?? 0;
      const x = xOf(start, artwork.width);
      const y = yOf(start, artwork.width);
      const nx = Math.min(artwork.width - 1, Math.max(0, x + dx));
      const ny = Math.min(artwork.height - 1, Math.max(0, y + dy));
      const next = ny * artwork.width + nx;
      rendererRef.current?.reveal(next);
      return next;
    });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLCanvasElement>) => {
    switch (event.key) {
      case 'ArrowLeft':
        moveCursor(-1, 0);
        event.preventDefault();
        break;
      case 'ArrowRight':
        moveCursor(1, 0);
        event.preventDefault();
        break;
      case 'ArrowUp':
        moveCursor(0, -1);
        event.preventDefault();
        break;
      case 'ArrowDown':
        moveCursor(0, 1);
        event.preventDefault();
        break;
      case 'Enter':
      case ' ':
        if (cursor !== null) session.applyAtCell(cursor);
        event.preventDefault();
        break;
      case 'Backspace':
      case 'Delete':
        if (cursor !== null) session.engine.eraseCell(cursor);
        event.preventDefault();
        break;
      case '+':
      case '=':
        zoomCenter(1.3);
        event.preventDefault();
        break;
      case '-':
      case '_':
        zoomCenter(1 / 1.3);
        event.preventDefault();
        break;
      case '0':
        rendererRef.current?.fit();
        event.preventDefault();
        break;
      case 'm':
      case 'M':
        setPanMode((value) => !value);
        event.preventDefault();
        break;
      case 'f':
      case 'F':
        session.selectTool(session.tool === 'fill' ? 'brush' : 'fill');
        event.preventDefault();
        break;
      case 'b':
      case 'B':
        session.selectTool('brush');
        event.preventDefault();
        break;
      case 'e':
      case 'E':
        session.selectTool('eraser');
        event.preventDefault();
        break;
      default:
        break;
    }
  };

  /* ------------------------------------------------------ import / export */

  const handleExport = () => {
    downloadSaveFile(serializeSaveFile(session.engine.exportSnapshot()), artwork.id);
    showToast({ message: 'Save file downloaded.', tone: 'success' });
  };

  const handleImportFile = async (file: File) => {
    let text: string;
    try {
      text = await file.text();
    } catch {
      showToast({ message: 'That file could not be read.', tone: 'error' });
      return;
    }
    const parsed = parseSaveFile(text);
    if (!parsed.ok) {
      showToast({ message: parsed.reason, tone: 'error' });
      return;
    }
    if (parsed.session.artworkId !== artwork.id) {
      showToast({ message: 'That save file belongs to a different picture.', tone: 'error' });
      return;
    }
    const check = session.engine.validateSnapshot(parsed.session);
    if (!check.applied) {
      showToast(
        check.reason === 'version'
          ? { message: 'That save is from an older version of this picture.', tone: 'error' as const }
          : { message: 'That save file is damaged and cannot be used.', tone: 'error' as const },
      );
      return;
    }
    session.importSnapshot(parsed.session);
    showToast({ message: 'Save file imported.', tone: 'success' });
  };

  /* ---------------------------------------------------------------- render */

  const { progress } = session;

  return (
    <main className="page studio">
      <header className="studio__header">
        <IconButton icon={<IconArrowLeft />} label="Back to gallery" onClick={onExit} />
        <div className="studio__title">
          <h1>{artwork.title}</h1>
          <SaveStatus state={session.saveState} />
        </div>
        <span className="studio__percent" aria-hidden="true">
          {progress.percent === 0 && progress.colored > 0
            ? '<1%'
            : `${progress.percent}%`}
        </span>
      </header>

      <div className="studio__canvas-wrap">
        <div className="studio__canvas-shell">
          {session.restoring && (
            <div className="studio__restoring">
              <Spinner large label="Restoring your progress" />
            </div>
          )}
          <canvas
            ref={canvasRef}
            className={
              panMode ? 'studio__canvas studio__canvas--pan' : 'studio__canvas'
            }
            tabIndex={0}
            role="application"
            aria-label={`${artwork.title} coloring canvas, ${artwork.width} by ${artwork.height} cells. Pinch or scroll to zoom, drag to color, use the fill tool to color a whole area at once, use the move tool or right-drag to pan. Numbers show which color belongs in each cell. Or use arrow keys to choose a cell, Enter to color it, Backspace to erase it.`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endPointer}
            onPointerCancel={endPointer}
            onPointerLeave={() => {
              rendererRef.current?.setHover(null);
              rendererRef.current?.setFillPreview(null);
            }}
            onContextMenu={(event) => event.preventDefault()}
            onKeyDown={onKeyDown}
          />
          {/* Finished-picture reference card, top-left (reference-app parity). */}
          <ReferencePreview src={previewUrl} title={artwork.title} />
          <div className="studio__zoom" role="group" aria-label="Zoom and move controls">
            <IconButton
              icon={<IconMove />}
              label="Move around the picture"
              active={panMode}
              pressed={panMode}
              onClick={() => setPanMode((value) => !value)}
            />
            <IconButton icon={<IconPlus />} label="Zoom in" onClick={() => zoomCenter(1.3)} />
            <IconButton icon={<IconMinus />} label="Zoom out" onClick={() => zoomCenter(1 / 1.3)} />
            <IconButton
              icon={<IconFit />}
              label="Fit whole picture"
              onClick={() => rendererRef.current?.fit()}
            />
          </div>
        </div>
        <p className="studio__hint">
          Drag to paint · bucket fills a whole area · hand tool or right-drag to move · pinch or
          scroll to zoom · numbers match the palette
        </p>
        <div className="studio__progress">
          <ProgressBar label="Colored" value={progress.colored} max={progress.colorable} />
        </div>
      </div>

      <div className="studio__controls">
        <PalettePicker
          palette={artwork.palette}
          selected={session.selectedColor}
          onSelect={session.selectColor}
          perColor={progress.perColor}
        />
        <div className="studio__tools" role="group" aria-label="Tools">
          <IconButton
            icon={<IconFill />}
            label="Fill a whole area"
            active={session.tool === 'fill'}
            pressed={session.tool === 'fill'}
            onClick={() => session.selectTool(session.tool === 'fill' ? 'brush' : 'fill')}
          />
          <IconButton
            icon={<IconEraser />}
            label="Eraser"
            active={session.tool === 'eraser'}
            pressed={session.tool === 'eraser'}
            onClick={() => session.selectTool(session.tool === 'eraser' ? 'brush' : 'eraser')}
          />
          <IconButton icon={<IconUndo />} label="Undo" onClick={session.undo} disabled={!session.canUndo} />
          <IconButton icon={<IconRedo />} label="Redo" onClick={session.redo} disabled={!session.canRedo} />
          <IconButton icon={<IconTrash />} label="Reset picture…" onClick={() => setResetOpen(true)} />
        </div>
        <div className="studio__tools" role="group" aria-label="Save file actions">
          <IconButton icon={<IconDownload />} label="Export save file" onClick={handleExport} />
          <IconButton
            icon={<IconUpload />}
            label="Import save file"
            onClick={() => fileInputRef.current?.click()}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            aria-hidden="true"
            tabIndex={-1}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleImportFile(file);
              event.target.value = ''; // allow re-selecting the same file
            }}
          />
        </div>
      </div>

      {/* Reset confirmation (PRD: reset requires confirmation) */}
      <Modal
        open={resetOpen}
        title="Start this picture over?"
        onClose={() => setResetOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setResetOpen(false)}>
              Keep my progress
            </Button>
            <Button
              variant="danger-solid"
              onClick={() => {
                session.resetAll();
                setResetOpen(false);
                showToast({ message: 'Picture reset.', tone: 'info' });
              }}
            >
              Reset picture
            </Button>
          </>
        }
      >
        <p>
          This clears every color on <strong>{artwork.title}</strong> and saves the empty canvas.
          It cannot be undone — your other pictures are not affected.
        </p>
      </Modal>

      {/* Incompatible stored save: preserved, explained, never auto-applied */}
      <Modal
        open={session.incompatible !== null}
        title="Saved progress can't be loaded"
        onClose={() => undefined}
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                if (session.incompatible) {
                  downloadSaveFile(session.incompatible.snapshotJson, artwork.id);
                }
              }}
            >
              Download old save
            </Button>
            <Button variant="secondary" onClick={onExit}>
              Back to gallery
            </Button>
            <Button
              variant="danger-solid"
              onClick={() => {
                void session.resolveIncompatible('fresh');
                showToast({ message: 'Started fresh. The old save was removed.', tone: 'info' });
              }}
            >
              Start fresh
            </Button>
          </>
        }
      >
        <p>
          The saved progress for this picture can&apos;t be applied because{' '}
          {session.incompatible
            ? INCOMPATIBLE_REASON_TEXT[session.incompatible.reason]
            : 'it is not compatible'}
          .
        </p>
        <p>You can keep a copy of the old save before starting over — the choice is yours.</p>
      </Modal>

      {celebrating && (
        <CompletionOverlay
          title={artwork.title}
          onDismiss={() => setCelebrating(false)}
          onBackToGallery={onExit}
        />
      )}
    </main>
  );
}
