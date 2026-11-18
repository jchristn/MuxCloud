/** One server-sent event. `data` joins multiple `data:` lines with a newline. */
export interface SseEvent {
  event: string;
  data: string;
  id?: string;
}

/**
 * Incremental parser for the `text/event-stream` format (WHATWG HTML, "Server-sent events"). Feed it text in any
 * chunking (a chunk may end mid-line or mid-event); it returns the events completed so far. Handles LF, CRLF, and CR
 * line endings, comment lines, and multi-line data. Pure: no I/O, so it runs in React Native, Node, and tests.
 */
export class SseParser {
  private buffer = '';
  private event = '';
  private data: string[] = [];
  private id: string | undefined;
  private pendingCr = false;

  /** Parse another chunk of text. */
  feed(chunk: string): SseEvent[] {
    let text = chunk;
    if (this.pendingCr) {
      // A CR ended the previous chunk; a following LF belongs to the same line break.
      if (text.startsWith('\n')) text = text.slice(1);
      this.pendingCr = false;
    }
    this.buffer += text;
    const events: SseEvent[] = [];
    let start = 0;
    for (let i = 0; i < this.buffer.length; i++) {
      const c = this.buffer[i];
      if (c !== '\n' && c !== '\r') continue;
      const line = this.buffer.slice(start, i);
      if (c === '\r') {
        if (i + 1 < this.buffer.length) {
          if (this.buffer[i + 1] === '\n') i++;
        } else {
          this.pendingCr = true;
        }
      }
      start = i + 1;
      const done = this.line(line);
      if (done) events.push(done);
    }
    this.buffer = this.buffer.slice(start);
    return events;
  }

  /** End of stream: an event without its terminating blank line is dispatched, as browsers do not, but mux may close abruptly. */
  end(): SseEvent[] {
    const events: SseEvent[] = [];
    if (this.buffer.length > 0) {
      const done = this.line(this.buffer);
      this.buffer = '';
      if (done) events.push(done);
    }
    const last = this.dispatch();
    if (last) events.push(last);
    return events;
  }

  private line(line: string): SseEvent | null {
    if (line === '') return this.dispatch();
    if (line.startsWith(':')) return null;
    const colon = line.indexOf(':');
    const field = colon < 0 ? line : line.slice(0, colon);
    let value = colon < 0 ? '' : line.slice(colon + 1);
    if (value.startsWith(' ')) value = value.slice(1);
    if (field === 'event') this.event = value;
    else if (field === 'data') this.data.push(value);
    else if (field === 'id') this.id = value;
    return null;
  }

  private dispatch(): SseEvent | null {
    if (this.data.length === 0) {
      this.event = '';
      return null;
    }
    const out: SseEvent = { event: this.event || 'message', data: this.data.join('\n') };
    if (this.id !== undefined) out.id = this.id;
    this.event = '';
    this.data = [];
    return out;
  }
}
