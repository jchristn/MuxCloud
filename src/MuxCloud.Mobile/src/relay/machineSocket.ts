import type { SocketLike } from '@dashboard/lib';
import type { MuxWsFrame } from '@/types/mux';

export type MachineSocketState = 'connecting' | 'open' | 'closed';

export interface MachineSocketOptions {
  /** URL for one connection attempt: `wss://host/m/{id}/v1.0/ws?ticket=...` (a fresh ticket each time). */
  getUrl: () => Promise<string>;
  socketFactory: (url: string) => SocketLike;
  /** What to subscribe to once open: a session's runs, or every session change (`all`). */
  subscription: { sessionId?: string; runId?: string; all?: boolean };
  onFrame: (frame: MuxWsFrame) => void;
  onStateChange?: (state: MachineSocketState) => void;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
  /** Reconnect cap in milliseconds. Default 30000. */
  maxDelayMs?: number;
}

/**
 * A machine's own mux WebSocket (`/v1.0/ws`) through the relay (WEBSOCKETS_API.md section 3). Subscribes once open,
 * reconnects with backoff (1 s doubling to 30 s) because the relayed socket closes whenever the machine's tunnel
 * drops, and sends approvals. Frames are mux's canonical run events plus `approval_requested` / `approval_resolved`.
 */
export class MachineSocket {
  private readonly options: MachineSocketOptions;
  private socket: SocketLike | null = null;
  private stopped = true;
  private attempt = 0;
  private timer: unknown = null;
  private state: MachineSocketState = 'closed';

  constructor(options: MachineSocketOptions) {
    this.options = options;
  }

  get connectionState(): MachineSocketState {
    return this.state;
  }

  start(): void {
    if (!this.stopped) return;
    this.stopped = false;
    void this.connect();
  }

  stop(): void {
    this.stopped = true;
    if (this.timer !== null) {
      (this.options.clearTimer ?? ((h) => clearTimeout(h as ReturnType<typeof setTimeout>)))(this.timer);
      this.timer = null;
    }
    const socket = this.socket;
    this.socket = null;
    if (socket) {
      socket.onclose = null;
      try {
        socket.close(1000, 'client stopped');
      } catch {
        // Already closed.
      }
    }
    this.setState('closed');
  }

  /** Approve or deny a pending tool call (mux WS action `approve`). Returns false when the socket is not open. */
  approve(runId: string, toolCallId: string, decision: string): boolean {
    return this.send({ action: 'approve', runId, toolCallId, decision });
  }

  private send(message: object): boolean {
    if (!this.socket || this.state !== 'open') return false;
    try {
      this.socket.send(JSON.stringify(message));
      return true;
    } catch {
      return false;
    }
  }

  private setState(state: MachineSocketState): void {
    if (this.state === state) return;
    this.state = state;
    this.options.onStateChange?.(state);
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
      const sub = this.options.subscription;
      this.send({ action: 'subscribe', ...sub });
      // A session subscription can also carry global session-list changes.
      if (sub.sessionId && sub.all) this.send({ action: 'subscribe', all: true });
    };
    socket.onmessage = (message) => {
      const frame = parseFrame(message.data);
      if (frame) this.options.onFrame(frame);
    };
    socket.onerror = () => {
      // The close event follows and drives reconnection.
    };
    socket.onclose = () => {
      if (this.socket !== socket) return;
      this.socket = null;
      this.setState('closed');
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

/** Parse a mux WebSocket frame; anything without an `eventType` is ignored. */
export function parseFrame(data: unknown): MuxWsFrame | null {
  if (typeof data !== 'string') return null;
  try {
    const parsed = JSON.parse(data) as MuxWsFrame;
    return parsed && typeof parsed.eventType === 'string' ? parsed : null;
  } catch {
    return null;
  }
}
