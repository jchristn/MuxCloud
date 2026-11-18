import type { AccountEvent } from '../types';

/** The subset of WebSocket the events client needs, so any host can supply one. */
export interface SocketLike {
  onopen: ((event: unknown) => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onclose: ((event: { code: number; reason?: string }) => void) | null;
  onerror: ((event: unknown) => void) | null;
  close(code?: number, reason?: string): void;
  send(data: string): void;
}

export type EventsConnectionState = 'connecting' | 'open' | 'closed';

export interface EventsClientOptions {
  /**
   * Produce the URL to connect to. Browsers return `wss://host/v1.0/events` (the session cookie authenticates);
   * mobile requests a ticket first and returns `.../v1.0/events?ticket=...`.
   */
  getUrl: () => string | Promise<string>;
  /** Create a socket for a URL. Browsers pass `(url) => new WebSocket(url)`. */
  socketFactory: (url: string) => SocketLike;
  onEvent: (event: AccountEvent) => void;
  onStateChange?: (state: EventsConnectionState) => void;
  /** Called on close code 4401: the session is no longer valid; the client stops reconnecting. */
  onUnauthorized?: () => void;
  /** Timer functions, injectable for tests. */
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
  /** Reconnect backoff cap in milliseconds. Default 30000. */
  maxDelayMs?: number;
}

/**
 * Client for the account events socket (WEBSOCKETS_API.md section 2). Reconnects with exponential backoff
 * (1 s doubling to 30 s), stops on 4401, ignores unknown message types. Host agnostic.
 */
export class EventsClient {
  private readonly options: EventsClientOptions;
  private socket: SocketLike | null = null;
  private attempt = 0;
  private timer: unknown = null;
  private stopped = true;
  private state: EventsConnectionState = 'closed';

  constructor(options: EventsClientOptions) {
    this.options = options;
  }

  get connectionState(): EventsConnectionState {
    return this.state;
  }

  start(): void {
    if (!this.stopped) return;
    this.stopped = false;
    void this.connect();
  }

  stop(): void {
    this.stopped = true;
    this.cancelTimer();
    const socket = this.socket;
    this.socket = null;
    if (socket) {
      socket.onclose = null;
      socket.close(1000, 'client stopped');
    }
    this.setState('closed');
  }

  private setState(state: EventsConnectionState): void {
    if (this.state === state) return;
    this.state = state;
    this.options.onStateChange?.(state);
  }

  private cancelTimer(): void {
    if (this.timer !== null) {
      (this.options.clearTimer ?? ((h) => clearTimeout(h as ReturnType<typeof setTimeout>)))(this.timer);
      this.timer = null;
    }
  }

  private async connect(): Promise<void> {
    if (this.stopped) return;
    this.setState('connecting');
    let url: string;
    try {
      url = await this.options.getUrl();
    } catch {
      this.scheduleReconnect();
      return;
    }
    if (this.stopped) return;
    let socket: SocketLike;
    try {
      socket = this.options.socketFactory(url);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.socket = socket;
    socket.onopen = () => {
      this.attempt = 0;
      this.setState('open');
    };
    socket.onmessage = (message) => {
      const event = parseEvent(message.data);
      if (!event) return;
      if (event.type === 'ping') {
        try {
          socket.send(JSON.stringify({ type: 'pong' }));
        } catch {
          // A failed pong is not fatal; the close handler reconnects if the socket is gone.
        }
        return;
      }
      this.options.onEvent(event);
    };
    socket.onerror = () => {
      // The close event follows and drives reconnection.
    };
    socket.onclose = (event) => {
      if (this.socket !== socket) return;
      this.socket = null;
      this.setState('closed');
      if (event.code === 4401) {
        this.stopped = true;
        this.options.onUnauthorized?.();
        return;
      }
      this.scheduleReconnect();
    };
  }

  private scheduleReconnect(): void {
    if (this.stopped) return;
    this.attempt++;
    const delay = Math.min(this.options.maxDelayMs ?? 30_000, 1000 * Math.pow(2, Math.min(this.attempt - 1, 10)));
    const setTimer = this.options.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
    this.timer = setTimer(() => {
      this.timer = null;
      void this.connect();
    }, delay);
  }
}

const KNOWN = new Set([
  'server.connected',
  'machine.online',
  'machine.offline',
  'machine.updated',
  'machine.removed',
  'subscription.updated',
  'ping',
]);

/** Parse one events-socket frame. Unknown types and malformed frames return null. */
export function parseEvent(data: unknown): AccountEvent | null {
  if (typeof data !== 'string') return null;
  try {
    const parsed = JSON.parse(data) as { type?: unknown };
    if (!parsed || typeof parsed.type !== 'string' || !KNOWN.has(parsed.type)) return null;
    return parsed as AccountEvent;
  } catch {
    return null;
  }
}
