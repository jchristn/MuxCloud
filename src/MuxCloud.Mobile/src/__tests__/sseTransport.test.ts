import { streamSse } from '@/lib/sseTransport';
import { parseError, startChatStream, toChatEvent, type ChatStreamEvent } from '@/relay/chatStream';
import { ApiClient } from '@dashboard/api';
import { FakeXhr } from './fakes';

describe('streamSse', () => {
  it('delivers events as progress arrives, then completes', () => {
    const xhr = new FakeXhr();
    const events: string[] = [];
    const done = jest.fn();
    streamSse({ url: 'https://x/s', body: '{}', xhrFactory: () => xhr, onEvent: (e) => events.push(e.event + ':' + e.data), onError: jest.fn(), onDone: done });
    expect(xhr.method).toBe('POST');
    expect(xhr.headers.Accept).toBe('text/event-stream');
    xhr.respond(200);
    xhr.push('event: token\ndata: "a"\n');
    expect(events).toEqual([]);
    xhr.push('\nevent: token\ndata: "b"\n\n');
    expect(events).toEqual(['token:"a"', 'token:"b"']);
    xhr.push('event: done\ndata: {}');
    xhr.finish();
    expect(events[2]).toBe('done:{}');
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('reports non-2xx with the body and never parses it as events', () => {
    const xhr = new FakeXhr();
    const onEvent = jest.fn();
    const onError = jest.fn();
    streamSse({ url: 'u', xhrFactory: () => xhr, onEvent, onError, onDone: jest.fn() });
    xhr.respond(503);
    xhr.push('{"error":"MachineOffline","message":"offline"}');
    xhr.finish();
    expect(onEvent).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(503, '{"error":"MachineOffline","message":"offline"}');
    expect(parseError(503, '{"error":"MachineOffline","message":"offline"}')).toEqual({ code: 'MachineOffline', message: 'offline' });
  });

  it('reports network failure as status 0 and stays silent after abort', () => {
    const xhr = new FakeXhr();
    const onError = jest.fn();
    const handle = streamSse({ url: 'u', xhrFactory: () => xhr, onEvent: jest.fn(), onError, onDone: jest.fn() });
    xhr.fail();
    expect(onError).toHaveBeenCalledWith(0, '');
    const xhr2 = new FakeXhr();
    const onEvent = jest.fn();
    const h2 = streamSse({ url: 'u', xhrFactory: () => xhr2, onEvent, onError: jest.fn(), onDone: jest.fn() });
    h2.abort();
    expect(xhr2.aborted).toBe(true);
    xhr2.respond(200);
    xhr2.push('event: token\ndata: "x"\n\n');
    expect(onEvent).not.toHaveBeenCalled();
    handle.abort();
  });
});

describe('chat stream', () => {
  it('maps every mux SSE event to a typed event', () => {
    expect(toChatEvent({ event: 'run', data: '{"RunId":"r","SessionId":"s"}' })).toEqual({ type: 'run', runId: 'r', sessionId: 's' });
    expect(toChatEvent({ event: 'token', data: '"hi"' })).toEqual({ type: 'token', text: 'hi' });
    expect(toChatEvent({ event: 'approval', data: '{"RunId":"r","ToolCallId":"t","Name":"write_file","Arguments":"{}","ToolAutoApproveSeconds":5}' })).toMatchObject({
      type: 'approval',
      approval: { ToolCallId: 't', ToolAutoApproveSeconds: 5 },
    });
    expect(toChatEvent({ event: 'error', data: '"backend failed"' })).toEqual({ type: 'error', message: 'backend failed' });
    expect(toChatEvent({ event: 'canceled', data: '{}' })).toEqual({ type: 'canceled' });
    expect(toChatEvent({ event: 'mystery', data: '{}' })).toBeNull();
    expect(toChatEvent({ event: 'token', data: 'not json' })).toBeNull();
  });

  it('posts to the relay with the bearer token and retries once after a 401 with rotated tokens', async () => {
    const xhrs: FakeXhr[] = [];
    let token = 'old';
    const refresh = jest.fn(async () => {
      token = 'new';
      return true;
    });
    const events: ChatStreamEvent[] = [];
    startChatStream({
      client: new ApiClient({ baseUrl: 'https://app.usemux.ai', authMode: 'bearer' }),
      machineId: 'mch_1',
      request: { Endpoint: 'local', Messages: [{ Role: 'user', Content: 'hi' }] },
      getAccessToken: async () => token,
      refresh,
      onEvent: (e) => events.push(e),
      onError: jest.fn(),
      onDone: jest.fn(),
      xhrFactory: () => {
        const x = new FakeXhr();
        xhrs.push(x);
        return x;
      },
    });
    await Promise.resolve();
    expect(xhrs[0].url).toBe('https://app.usemux.ai/m/mch_1/v1.0/api/chat/stream');
    expect(xhrs[0].headers.Authorization).toBe('Bearer old');
    expect(JSON.parse(String(xhrs[0].body))).toEqual({ Endpoint: 'local', Messages: [{ Role: 'user', Content: 'hi' }] });
    xhrs[0].respond(401);
    xhrs[0].finish();
    await new Promise((r) => setTimeout(r, 0));
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(xhrs[1].headers.Authorization).toBe('Bearer new');
    xhrs[1].respond(200);
    xhrs[1].push('event: token\ndata: "ok"\n\n');
    expect(events).toEqual([{ type: 'token', text: 'ok' }]);
  });
});
