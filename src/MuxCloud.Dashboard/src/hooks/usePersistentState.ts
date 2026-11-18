import { useCallback, useState } from 'react';

/** State mirrored to localStorage. Storage failures fall back to in-memory state. */
export function usePersistentState<T>(key: string, initial: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? initial : (JSON.parse(raw) as T);
    } catch {
      return initial;
    }
  });
  const set = useCallback(
    (next: T) => {
      setValue(next);
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // Not persisted.
      }
    },
    [key],
  );
  return [value, set];
}
