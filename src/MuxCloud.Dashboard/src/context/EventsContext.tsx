import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { api } from '../apiClient';
import { EventsClient, type EventsConnectionState, type SocketLike } from '../lib/eventsSocket';
import type { AccountEvent } from '../types';
import { useAuth } from './AuthContext';

type Listener = (event: AccountEvent) => void;

interface EventsValue {
  state: EventsConnectionState;
  subscribe: (listener: Listener) => () => void;
}

const EventsContext = createContext<EventsValue | null>(null);

/** One account events socket per signed-in tab (WEBSOCKETS_API.md section 2). The session cookie authenticates it. */
export function EventsProvider({ children }: { children: ReactNode }) {
  const { status, setEntitlements, reload } = useAuth();
  const [state, setState] = useState<EventsConnectionState>('closed');
  const listeners = useRef(new Set<Listener>());

  useEffect(() => {
    if (status !== 'authenticated') return;
    const client = new EventsClient({
      getUrl: () => api.wsUrl('/v1.0/events', undefined, window.location.origin),
      socketFactory: (url) => new WebSocket(url) as unknown as SocketLike,
      onEvent: (event) => {
        if (event.type === 'subscription.updated') setEntitlements(event.entitlements);
        for (const listener of listeners.current) listener(event);
      },
      onStateChange: setState,
      onUnauthorized: () => void reload(),
    });
    client.start();
    return () => client.stop();
  }, [status, setEntitlements, reload]);

  const subscribe = useCallback((listener: Listener) => {
    listeners.current.add(listener);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);

  const value = useMemo(() => ({ state, subscribe }), [state, subscribe]);
  return <EventsContext.Provider value={value}>{children}</EventsContext.Provider>;
}

export function useEvents(): EventsValue {
  const value = useContext(EventsContext);
  if (!value) throw new Error('useEvents must be used inside EventsProvider');
  return value;
}

/** Subscribe to account events for the lifetime of a component. */
export function useAccountEvents(listener: Listener): void {
  const { subscribe } = useEvents();
  const latest = useRef(listener);
  latest.current = listener;
  useEffect(() => subscribe((event) => latest.current(event)), [subscribe]);
}
