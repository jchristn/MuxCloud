import React, { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from 'react';
import * as Device from 'expo-device';
import { AuthController, type AuthState } from '@/auth/AuthController';
import { secureTokenStorage } from '@/auth/tokens';
import { currentLanguage } from '@/i18n/runtime';
import { usePrefs } from './PrefsContext';

interface AuthValue {
  auth: AuthController;
  state: AuthState;
}

const AuthContext = createContext<AuthValue | null>(null);

function deviceName(): string {
  const name = Device.deviceName || Device.modelName || 'Mobile device';
  return ('Mux app on ' + name).slice(0, 100);
}

/** One AuthController per server URL. Changing the server URL swaps controllers (each server keeps its own tokens). */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { prefs } = usePrefs();
  const auth = useMemo(
    () =>
      new AuthController({
        serverUrl: prefs.serverUrl,
        storage: secureTokenStorage,
        deviceName: deviceName(),
        getLocale: () => currentLanguage(),
      }),
    [prefs.serverUrl],
  );
  const subscribe = useMemo(() => (listener: () => void) => auth.subscribe(listener), [auth]);
  const state: AuthState = useSyncExternalStore(subscribe, () => auth.getState());

  useEffect(() => {
    void auth.restore();
  }, [auth]);

  const value = useMemo(() => ({ auth, state }), [auth, state]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
