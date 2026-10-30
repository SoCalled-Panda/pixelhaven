import { useCallback, useEffect, useRef, useState } from 'react';
import { ColoringEngine } from '../engine/coloringEngine';
import type { Progress, SessionSnapshot, Tool, ValidatedArtwork } from '../engine/types';
import { sessionRepository } from '../data/sessionRepo';

export type SaveState = 'idle' | 'pending' | 'saving' | 'saved' | 'error' | 'conflict';

const SAVE_DEBOUNCE_MS = 700;

export interface IncompatibleState {
  reason: 'version' | 'shape' | 'range' | 'schema';
  /** Preserved old record, offered for download before a "start fresh". */
  snapshotJson: string;
}

export interface ColoringSession {
  engine: ColoringEngine;
  /** False until the stored session (or a fresh start) has been applied. */
  restoring: boolean;
  incompatible: IncompatibleState | null;
  resolveIncompatible: (mode: 'fresh') => Promise<void>;
  progress: Progress;
  saveState: SaveState;
  selectedColor: number;
  tool: Tool;
  canUndo: boolean;
  canRedo: boolean;
  applyAtCell: (cellIndex: number) => boolean;
  undo: () => void;
  redo: () => void;
  resetAll: () => void;
  selectColor: (index: number) => void;
  selectTool: (tool: Tool) => void;
  importSnapshot: (snapshot: SessionSnapshot) => boolean;
}

/**
 * Glue between the coloring engine, React state and IndexedDB
 * (architecture §4: React never owns the grid; the engine reports changes
 * and application code schedules persistence).
 *
 * - Debounced (700 ms) writes, serialized through a single write queue.
 * - Snapshots copy the cell buffer before the async write (checklist §G).
 * - Only *dirty* state is written; pending writes flush on `pagehide`,
 *   `visibilitychange` and route change — nothing relies on a write
 *   happening during tab close.
 * - Saves are compare-and-set on the revision; conflicts surface in the UI.
 * - Restores (initial load, other-tab sync) never schedule a write — the
 *   restored revision equals the stored one and would tie in the CAS.
 */
export function useColoringSession(artwork: ValidatedArtwork): ColoringSession {
  const engineRef = useRef<ColoringEngine | null>(null);
  if (engineRef.current === null || engineRef.current.artwork !== artwork) {
    engineRef.current = new ColoringEngine(artwork);
  }
  const engine = engineRef.current;

  const [restoring, setRestoring] = useState(true);
  const [incompatible, setIncompatible] = useState<IncompatibleState | null>(null);
  const [progress, setProgress] = useState(engine.progress);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [selectedColor, setSelectedColor] = useState(engine.selectedColorIndex);
  const [tool, setToolState] = useState<Tool>(engine.tool);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const saveTimerRef = useRef<number | null>(null);
  const writeQueueRef = useRef<Promise<void>>(Promise.resolve());
  const dirtyRef = useRef(false);
  const storedRevisionRef = useRef(0);
  const incompatibleRef = useRef<IncompatibleState | null>(null);
  incompatibleRef.current = incompatible;

  /* --------------------------------------------------------- restore once */

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await sessionRepository.load(artwork.id);
      if (cancelled) return;
      if (stored) {
        const check = engine.validateSnapshot(stored);
        if (!check.applied) {
          // Preserve the old record; let the user decide (architecture §6).
          setIncompatible({
            reason: check.reason ?? 'shape',
            snapshotJson: JSON.stringify(stored),
          });
          setRestoring(false);
          return;
        }
        engine.restore(stored);
        storedRevisionRef.current = stored.revision;
        setProgress(engine.progress);
      }
      setRestoring(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [artwork, engine]);

  /* ----------------------------------------------------------- save cycle */

  const flushSave = useCallback(() => {
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (!dirtyRef.current || incompatibleRef.current) return;
    dirtyRef.current = false;
    const snapshot = engine.exportSnapshot(); // buffer copied before the await
    setSaveState('saving');
    writeQueueRef.current = writeQueueRef.current.then(async () => {
      const result = await sessionRepository.save(snapshot);
      if (result.ok) {
        storedRevisionRef.current = snapshot.revision;
        setSaveState('saved');
      } else if (result.reason === 'conflict') {
        dirtyRef.current = true; // local progress is newer in spirit; retry later
        setSaveState('conflict');
      } else {
        dirtyRef.current = true; // quota/unavailable — keep trying on next edit
        setSaveState('error');
      }
    });
  }, [engine]);

  const scheduleSave = useCallback(() => {
    dirtyRef.current = true;
    setSaveState('pending');
    if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      saveTimerRef.current = null;
      flushSave();
    }, SAVE_DEBOUNCE_MS);
  }, [flushSave]);

  // Flush pending writes on tab hide / page leave / unmount (never rely on
  // a write during tab close — checklist §G).
  useEffect(() => {
    const flushOnHide = () => {
      if (document.visibilityState === 'hidden') flushSave();
    };
    window.addEventListener('pagehide', flushSave);
    document.addEventListener('visibilitychange', flushOnHide);
    return () => {
      window.removeEventListener('pagehide', flushSave);
      document.removeEventListener('visibilitychange', flushOnHide);
      flushSave();
    };
  }, [flushSave]);

  // Multi-tab courtesy: on focus, pull in changes made elsewhere when we have
  // no newer local state of our own.
  useEffect(() => {
    const onFocus = async () => {
      if (incompatibleRef.current) return;
      const stored = await sessionRepository.load(artwork.id);
      if (!stored) return;
      const ours = engine.exportSnapshot();
      if (stored.revision > storedRevisionRef.current && ours.revision <= storedRevisionRef.current) {
        if (engine.validateSnapshot(stored).applied) {
          engine.restore(stored);
          storedRevisionRef.current = stored.revision;
          setProgress(engine.progress);
        }
      }
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [artwork.id, engine]);

  /* ------------------------------------------------------ engine events */

  useEffect(() => {
    const unsubscribe = engine.subscribe((event) => {
      if (event.kind === 'cell' || event.kind === 'reset') {
        setProgress(engine.progress);
        scheduleSave();
      } else if (event.kind === 'restore') {
        // State synced from storage/import: not a local edit, no write.
        setProgress(engine.progress);
      }
      if (event.kind === 'color') setSelectedColor(engine.selectedColorIndex);
      if (event.kind === 'tool') setToolState(engine.tool);
      setCanUndo(engine.canUndo);
      setCanRedo(engine.canRedo);
    });
    return unsubscribe;
  }, [engine, scheduleSave]);

  /* ------------------------------------------------------------- actions */

  const applyAtCell = useCallback((cellIndex: number) => engine.applyTool(cellIndex), [engine]);
  const undo = useCallback(() => engine.undo(), [engine]);
  const redo = useCallback(() => engine.redo(), [engine]);
  const resetAll = useCallback(() => engine.reset(), [engine]);
  const selectColor = useCallback((index: number) => engine.setSelectedColorIndex(index), [engine]);
  const selectTool = useCallback((next: Tool) => engine.setTool(next), [engine]);

  /**
   * Apply an imported save file. The engine's revision is seeded above the
   * stored revision so the imported state wins its next compare-and-set.
   */
  const importSnapshot = useCallback(
    (imported: SessionSnapshot): boolean => {
      if (!engine.validateSnapshot(imported).applied) return false;
      const seeded: SessionSnapshot = {
        ...imported,
        revision: Math.max(imported.revision, storedRevisionRef.current + 1),
      };
      engine.restore(seeded);
      scheduleSave();
      return true;
    },
    [engine, scheduleSave],
  );

  const resolveIncompatible = useCallback(
    async (mode: 'fresh') => {
      if (mode === 'fresh') {
        await sessionRepository.remove(artwork.id);
        storedRevisionRef.current = 0;
      }
      setIncompatible(null);
      setSaveState('idle');
    },
    [artwork.id],
  );

  return {
    engine,
    restoring,
    incompatible,
    resolveIncompatible,
    progress,
    saveState,
    selectedColor,
    tool,
    canUndo,
    canRedo,
    applyAtCell,
    undo,
    redo,
    resetAll,
    selectColor,
    selectTool,
    importSnapshot,
  };
}
