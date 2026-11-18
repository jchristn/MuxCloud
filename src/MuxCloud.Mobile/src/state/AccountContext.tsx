import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { authApi, machinesApi } from '@dashboard/api';
import { applyMachineEvent, sortMachines, type EventsConnectionState } from '@dashboard/lib';
import type { AccountEvent, Entitlements, Machine } from '@dashboard/types';
import { createAccountEvents } from './accountEvents';
import { useAuth } from './AuthContext';

interface AccountValue {
  machines: Machine[];
  loading: boolean;
  error: unknown;
  entitlements: Entitlements | null;
  liveState: EventsConnectionState;
  refresh: () => Promise<void>;
  machine: (id: string) => Machine | undefined;
  /** Subscribe to every account event (approvals inbox, push deep links). */
  onEvent: (listener: (event: AccountEvent) => void) => () => void;
}

const AccountContext = createContext<AccountValue | null>(null);

/**
 * Signed-in account state: the machine list (loaded once, then kept live by `/v1.0/events`), entitlements from
 * `/auth/me`, and a fan-out of account events. The events socket pauses while the app is in the background.
 */
export function AccountProvider({ children }: { children: React.ReactNode }) {
  const { auth, state } = useAuth();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);
  const [liveState, setLiveState] = useState<EventsConnectionState>('closed');
  const listeners = useRef(new Set<(event: AccountEvent) => void>());
  const signedIn = state.status === 'signedIn';

  const refresh = useCallback(async () => {
    try {
      const [page, me] = await Promise.all([machinesApi.list(auth.client, { pageSize: 1000 }), authApi.me(auth.client)]);
      setMachines(sortMachines(page.items));
      setEntitlements(me.entitlements);
      setError(null);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => {
    if (!signedIn) return;
    void Promise.resolve().then(refresh);
    const events = createAccountEvents(auth, {
      onEvent: (event) => {
        if (event.type === 'subscription.updated') setEntitlements(event.entitlements);
        else if (event.type === 'server.connected') void refresh();
        else setMachines((current) => sortMachines(applyMachineEvent(current, event)));
        for (const listener of listeners.current) listener(event);
      },
      onStateChange: setLiveState,
    });
    events.start();
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        events.start();
        void refresh();
      } else if (next === 'background') {
        events.stop();
      }
    });
    return () => {
      sub.remove();
      events.stop();
    };
  }, [auth, signedIn, refresh]);

  const onEvent = useCallback((listener: (event: AccountEvent) => void) => {
    listeners.current.add(listener);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);

  const value = useMemo<AccountValue>(
    () => ({
      machines: signedIn ? machines : [],
      loading: signedIn ? loading : true,
      error: signedIn ? error : null,
      entitlements: signedIn ? entitlements : null,
      liveState,
      refresh,
      machine: (id: string) => (signedIn ? machines.find((m) => m.id === id) : undefined),
      onEvent,
    }),
    [signedIn, machines, loading, error, entitlements, liveState, refresh, onEvent],
  );
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount(): AccountValue {
  const value = useContext(AccountContext);
  if (!value) throw new Error('useAccount must be used inside AccountProvider');
  return value;
}
