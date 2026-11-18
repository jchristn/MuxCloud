import { SseParser, type SseEvent } from './sse';

/** The subset of XMLHttpRequest the transport uses, so tests can supply a fake. */
export interface XhrLike {
  readyState: number;
  status: number;
  responseText: string;
  onprogress: ((event: unknown) => void) | null;
  onreadystatechange: (() => void) | null;
  onerror: ((event: unknown) => void) | null;
  onabort?: ((event: unknown) => void) | null;
  open(method: string, url: string): void;
  setRequestHeader(name: string, value: string): void;
  send(body?: string | null): void;
  abort(): void;
}

export interface SseRequest {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  onEvent: (event: SseEvent) => void;
  /** HTTP status of a non-2xx response with its body text (parsed by the caller), or a network failure (status 0). */
  onError: (status: number, bodyText: string) => void;
  /** The stream ended normally. */
  onDone: () => void;
  /** XMLHttpRequest factory; defaults to the global. */
  xhrFactory?: () => XhrLike;
}

export interface SseHandle {
  /** Abort the request; no further callbacks fire. */
  abort(): void;
}

const DONE = 4;

/**
 * POST (or GET) a request and read a `text/event-stream` response incrementally. React Native's fetch does not expose
 * a readable body stream, but its XMLHttpRequest fires `progress` with a growing `responseText`, so each progress
 * event parses only the new tail. Works the same in Node tests with a fake XHR.
 */
export function streamSse(request: SseRequest): SseHandle {
  const factory = request.xhrFactory ?? (() => new XMLHttpRequest() as unknown as XhrLike);
  const xhr = factory();
  const parser = new SseParser();
  let seen = 0;
  let finished = false;
  let aborted = false;

  const pump = () => {
    if (aborted) return;
    if (xhr.status !== 0 && (xhr.status < 200 || xhr.status > 299)) return;
    const text = xhr.responseText ?? '';
    if (text.length <= seen) return;
    const chunk = text.slice(seen);
    seen = text.length;
    for (const event of parser.feed(chunk)) {
      if (aborted) return;
      request.onEvent(event);
    }
  };

  xhr.onprogress = pump;
  xhr.onreadystatechange = () => {
    if (aborted || finished || xhr.readyState !== DONE) return;
    finished = true;
    if (xhr.status === 0) {
      request.onError(0, '');
      return;
    }
    if (xhr.status < 200 || xhr.status > 299) {
      request.onError(xhr.status, xhr.responseText ?? '');
      return;
    }
    pump();
    for (const event of parser.end()) request.onEvent(event);
    request.onDone();
  };
  xhr.onerror = () => {
    if (aborted || finished) return;
    finished = true;
    request.onError(0, '');
  };

  xhr.open(request.method ?? 'POST', request.url);
  const headers: Record<string, string> = { Accept: 'text/event-stream', ...(request.headers ?? {}) };
  for (const [name, value] of Object.entries(headers)) xhr.setRequestHeader(name, value);
  xhr.send(request.body ?? null);

  return {
    abort() {
      if (aborted || finished) return;
      aborted = true;
      try {
        xhr.abort();
      } catch {
        // Already closed.
      }
    },
  };
}
