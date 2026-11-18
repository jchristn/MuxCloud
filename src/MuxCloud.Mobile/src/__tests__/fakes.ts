import type { SocketLike } from '@dashboard/lib';
import type { XhrLike } from '@/lib/sseTransport';

/** A scriptable XMLHttpRequest for transport tests. */
export class FakeXhr implements XhrLike {
  readyState = 0;
  status = 0;
  responseText = '';
  onprogress: ((event: unknown) => void) | null = null;
  onreadystatechange: (() => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  method = '';
  url = '';
  headers: Record<string, string> = {};
  body: string | null | undefined;
  aborted = false;

  open(method: string, url: string): void {
    this.method = method;
    this.url = url;
    this.readyState = 1;
  }

  setRequestHeader(name: string, value: string): void {
    this.headers[name] = value;
  }

  send(body?: string | null): void {
    this.body = body;
  }

  abort(): void {
    this.aborted = true;
  }

  respond(status: number): void {
    this.status = status;
    this.readyState = 3;
  }

  push(text: string): void {
    this.responseText += text;
    this.onprogress?.({});
  }

  finish(): void {
    this.readyState = 4;
    this.onreadystatechange?.();
  }

  fail(): void {
    this.status = 0;
    this.readyState = 4;
    this.onerror?.({});
    this.onreadystatechange?.();
  }
}

/** A scriptable WebSocket. */
export class FakeSocket implements SocketLike {
  static created: FakeSocket[] = [];
  onopen: ((event: unknown) => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onclose: ((event: { code: number; reason?: string }) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  sent: string[] = [];
  closed = false;

  constructor(public url: string) {
    FakeSocket.created.push(this);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.closed = true;
  }

  open(): void {
    this.onopen?.({});
  }

  message(data: unknown): void {
    this.onmessage?.({ data: typeof data === 'string' ? data : JSON.stringify(data) });
  }

  drop(code = 1006): void {
    this.onclose?.({ code });
  }
}

/** A JSON fetch fake keyed by "METHOD path". Each route returns a list of responses consumed in order. */
export function fakeFetch(routes: Record<string, { status: number; body?: unknown }[]>) {
  const calls: { method: string; url: string; headers: Record<string, string>; body: unknown }[] = [];
  const impl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method ?? 'GET').toUpperCase();
    const path = url.replace(/^https?:\/\/[^/]+/, '').split('?')[0];
    const headers = (init?.headers ?? {}) as Record<string, string>;
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ method, url, headers, body });
    const queue = routes[method + ' ' + path];
    if (!queue || queue.length === 0) throw new Error('No fake route for ' + method + ' ' + path);
    const next = queue.length > 1 ? queue.shift()! : queue[0];
    const text = next.body === undefined ? '' : JSON.stringify(next.body);
    return new Response(text, { status: next.status, headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;
  return { impl, calls };
}
