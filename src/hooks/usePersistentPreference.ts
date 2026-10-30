import { useCallback, useState } from 'react';

/**
 * Small preferences only (architecture §4): volume, selected track, etc.
 * localStorage failures (private mode, disabled) degrade silently — the
 * preference simply does not persist.
 */
export function usePersistentPreference(
  key: string,
  fallback: string,
): [string, (next: string) => void] {
  const storageKey = `pixelhaven:${key}`;

  const [value, setValue] = useState<string>(() => {
    try {
      return localStorage.getItem(storageKey) ?? fallback;
    } catch {
      return fallback;
    }
  });

  const update = useCallback(
    (next: string) => {
      setValue(next);
      try {
        localStorage.setItem(storageKey, next);
      } catch {
        // Preference persistence is best-effort.
      }
    },
    [storageKey],
  );

  return [value, update];
}
