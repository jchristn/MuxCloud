import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_PREFS, loadPrefs, savePrefs, type Prefs } from '@/storage/prefs';

interface PrefsValue {
  prefs: Prefs;
  loaded: boolean;
  update: (patch: Partial<Prefs>) => void;
}

const PrefsContext = createContext<PrefsValue>({ prefs: DEFAULT_PREFS, loaded: false, update: () => undefined });

/** Loads non-secret preferences once and persists every change. */
export function PrefsProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    void loadPrefs().then((p) => {
      if (!alive) return;
      setPrefs(p);
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const update = useCallback((patch: Partial<Prefs>) => {
    setPrefs((current) => {
      const next = { ...current, ...patch };
      void savePrefs(next);
      return next;
    });
  }, []);

  const value = useMemo(() => ({ prefs, loaded, update }), [prefs, loaded, update]);
  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs(): PrefsValue {
  return useContext(PrefsContext);
}
