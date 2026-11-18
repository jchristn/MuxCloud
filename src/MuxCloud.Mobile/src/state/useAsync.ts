import { useCallback, useEffect, useRef, useState } from 'react';

export interface AsyncState<T> {
  data: T | null;
  error: unknown;
  loading: boolean;
  /** Load again; resolves when that load finishes. */
  reload: () => Promise<void>;
  setData: (data: T | null) => void;
}

/**
 * Run a loader on mount, whenever its dependencies change, and on reload(). Results of superseded loads are dropped.
 * State only changes in promise callbacks, never synchronously inside the effect.
 */
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);
  const waiters = useRef<(() => void)[]>([]);

  useEffect(() => {
    let alive = true;
    const settle = () => {
      const pending = waiters.current;
      waiters.current = [];
      for (const resolve of pending) resolve();
    };
    void Promise.resolve()
      .then(() => {
        if (alive) setLoading(true);
        return loader();
      })
      .then(
        (result) => {
          if (!alive) return;
          setData(result);
          setError(null);
          setLoading(false);
          settle();
        },
        (e: unknown) => {
          if (!alive) return;
          setError(e);
          setLoading(false);
          settle();
        },
      );
    return () => {
      alive = false;
    };
    // The caller's dependency list decides when to reload, exactly like useEffect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const reload = useCallback(
    () =>
      new Promise<void>((resolve) => {
        waiters.current.push(resolve);
        setNonce((n) => n + 1);
      }),
    [],
  );

  return { data, error, loading, reload, setData };
}
