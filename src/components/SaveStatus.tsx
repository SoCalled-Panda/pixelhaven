import type { SaveState } from '../hooks/useColoringSession';

const LABELS: Record<SaveState, string> = {
  idle: 'Autosave ready',
  pending: 'Changes pending…',
  saving: 'Saving…',
  saved: 'Saved',
  error: 'Save failed — progress kept in memory',
  conflict: 'Updated in another tab',
};

/** Tiny non-intrusive save-status indicator (checklist §E). */
export function SaveStatus({ state }: { state: SaveState }) {
  return (
    <span className={`save-status save-status--${state}`}>
      <span className="save-status__dot" aria-hidden="true" />
      {LABELS[state]}
    </span>
  );
}
