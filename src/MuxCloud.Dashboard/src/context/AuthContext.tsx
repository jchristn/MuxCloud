import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ApiError, authApi } from '../api';
import { api } from '../apiClient';
import type { Entitlements, MeResponse, User } from '../types';

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

interface AuthValue {
  status: AuthStatus;
  user: User | null;
  entitlements: Entitlements | null;
  sessionId: string | null;
  /** True when the session ended on its own (expired or revoked) rather than by signing out. */
  expired: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  reload: () => Promise<void>;
  setUser: (user: User) => void;
  setEntitlements: (entitlements: Entitlements) => void;
  /** Clear local state after the account was deleted. */
  clear: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

function deviceName(): string {
  const ua = navigator.userAgent;
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /Firefox\//.test(ua)
      ? 'Firefox'
      : /Chrome\//.test(ua)
        ? 'Chrome'
        : /Safari\//.test(ua)
          ? 'Safari'
          : 'Browser';
  const os = /Windows/.test(ua)
    ? 'Windows'
    : /Mac OS X/.test(ua)
      ? 'macOS'
      : /Android/.test(ua)
        ? 'Android'
        : /iPhone|iPad/.test(ua)
          ? 'iOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : '';
  return os ? browser + ' on ' + os : browser;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [me, setMe] = useState<MeResponse | null>(null);
  const [expired, setExpired] = useState(false);

  const reload = useCallback(async () => {
    try {
      const result = await authApi.me(api);
      setMe(result);
      setStatus('authenticated');
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        setMe(null);
        setStatus('anonymous');
        return;
      }
      // Network or server failure: treat as signed out but keep the reason visible on the login page.
      setMe(null);
      setStatus('anonymous');
    }
  }, []);

  useEffect(() => {
    api.configure({
      onUnauthorized: () => {
        setMe((current) => {
          if (current) setExpired(true);
          return null;
        });
        setStatus('anonymous');
      },
    });
    void reload();
  }, [reload]);

  const login = useCallback(
    async (email: string, password: string) => {
      await authApi.login(api, { email, password, client: 'web', deviceName: deviceName() });
      setExpired(false);
      await reload();
    },
    [reload],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout(api);
    } catch {
      // Signing out locally is what matters; the server session expires on its own.
    }
    setMe(null);
    setExpired(false);
    setStatus('anonymous');
  }, []);

  const setUser = useCallback((user: User) => setMe((current) => (current ? { ...current, user } : current)), []);
  const setEntitlements = useCallback(
    (entitlements: Entitlements) => setMe((current) => (current ? { ...current, entitlements } : current)),
    [],
  );
  const clear = useCallback(() => {
    setMe(null);
    setStatus('anonymous');
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      status,
      user: me?.user ?? null,
      entitlements: me?.entitlements ?? null,
      sessionId: me?.sessionId ?? null,
      expired,
      login,
      logout,
      reload,
      setUser,
      setEntitlements,
      clear,
    }),
    [status, me, expired, login, logout, reload, setUser, setEntitlements, clear],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
