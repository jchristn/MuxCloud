import { describe, expect, it, vi } from 'vitest';
import { EventsClient, parseEvent, type SocketLike } from './eventsSocket';

class FakeSocket implements SocketLike {
  onopen: ((e: unknown) => void) | null = null;
  onmessage: ((e: { data: unknown }) => void) | null = null;
  onclose: ((e: { code: number; reason?: string }) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  sent: string[] = [];
  closed = false;
  constructor(public url: string) {}
  close() {
    this.closed = true;
  }
  send(data: string) {
    this.sent.push(data);
  }
}

describe('EventsClient', () => {
  it('delivers events, answers pings, and ignores junk', async () => {
    const sockets: FakeSocket[] = [];
    const onEvent = vi.fn();
    const client = new EventsClient({ getUrl: () => 'ws://x/v1.0/events', socketFactory: (u) => { const s = new FakeSocket(u); sockets.push(s); return s; }, onEvent });
    client.start();
    await Promise.resolve();
    const s = sockets[0];
    s.onopen?.({});
    expect(client.connectionState).toBe('open');
    s.onmessage?.({ data: JSON.stringify({ type: 'machine.removed', timestampUtc: 't', machineId: 'mch_1' }) });
    s.onmessage?.({ data: JSON.stringify({ type: 'ping', timestampUtc: 't' }) });
    s.onmessage?.({ data: 'not json' });
    s.onmessage?.({ data: JSON.stringify({ type: 'future.thing' }) });
    expect(onEvent).toHaveBeenCalledTimes(1);
    expect(s.sent).toEqual([JSON.stringify({ type: 'pong' })]);
    client.stop();
    expect(s.closed).toBe(true);
  });

  it('reconnects with backoff and stops on 4401', async () => {
    const timers: Array<{ fn: () => void; ms: number }> = [];
    const sockets: FakeSocket[] = [];
    const onUnauthorized = vi.fn();
    const client = new EventsClient({
      getUrl: () => 'ws://x',
      socketFactory: (u) => { const s = new FakeSocket(u); sockets.push(s); return s; },
      onEvent: () => undefined,
      onUnauthorized,
      setTimer: (fn, ms) => { timers.push({ fn, ms }); return timers.length; },
      clearTimer: () => undefined,
    });
    client.start();
    await Promise.resolve();
    sockets[0].onclose?.({ code: 1006 });
    expect(timers[0].ms).toBe(1000);
    timers[0].fn();
    await Promise.resolve();
    sockets[1].onclose?.({ code: 1006 });
    expect(timers[1].ms).toBe(2000);
    timers[1].fn();
    await Promise.resolve();
    sockets[2].onclose?.({ code: 4401 });
    expect(onUnauthorized).toHaveBeenCalled();
    expect(timers.length).toBe(2);
  });

  it('parses known types only', () => {
    expect(parseEvent(JSON.stringify({ type: 'machine.online', machine: { id: 'm' } }))?.type).toBe('machine.online');
    expect(parseEvent(42)).toBeNull();
  });
});
