import { AuthController } from '@/auth/AuthController';
import { memoryTokenStorage } from '@/auth/tokens';
import { approvalFromFrame, applyRunFrame, secondsRemaining, turnsFromDetail, type Turn } from '@/lib/transcript';
import { createAccountEvents, createMachineSocket } from '@/state/accountEvents';
import { applyMachineEvent } from '@dashboard/lib';
import type { AccountEvent, Machine } from '@dashboard/types';
import { FakeSocket, fakeFetch } from './fakes';

const flush = () => new Promise((r) => setTimeout(r, 0));
const machine = (id: string, online: boolean): Machine => ({
  id,
  name: id,
  online,
  activeRuns: 0,
  awaitingApproval: 0,
  remoteToolApproval: true,
  revoked: false,
  createdUtc: '2026-11-17T00:00:00Z',
});

async function signedIn(routes: Record<string, { status: number; body?: unknown }[]>) {
  const { impl, calls } = fakeFetch({
    'POST /v1.0/api/auth/login': [{ status: 200, body: { sessionId: 's', user: { id: 'u' }, accessToken: 'mca', refreshToken: 'mcr', accessTokenExpiresUtc: '2999-01-01T00:00:00Z' } }],
    'POST /v1.0/api/ws-tickets': [{ status: 201, body: { ticket: 'wst_a' } }, { status: 201, body: { ticket: 'wst_b' } }],
    ...routes,
  });
  const auth = new AuthController({ serverUrl: 'https://app.usemux.ai', storage: memoryTokenStorage(), fetchImpl: impl });
  await auth.signIn('a@b.c', 'pw');
  return { auth, calls };
}

beforeEach(() => {
  FakeSocket.created = [];
});

describe('account events wiring', () => {
  it('connects to /v1.0/events over wss with a fresh ticket and feeds machine events to the list', async () => {
    const { auth } = await signedIn({});
    let machines: Machine[] = [machine('mch_a', false)];
    const events = createAccountEvents(auth, { onEvent: (e: AccountEvent) => (machines = applyMachineEvent(machines, e)) }, (url) => new FakeSocket(url));
    events.start();
    await flush();
    await flush();
    const socket = FakeSocket.created[0];
    expect(socket.url).toBe('wss://app.usemux.ai/v1.0/events?ticket=wst_a');
    socket.open();
    socket.message({ type: 'machine.online', timestampUtc: 'x', machine: machine('mch_a', true) });
    socket.message({ type: 'machine.online', timestampUtc: 'x', machine: machine('mch_b', true) });
    socket.message({ type: 'ping', timestampUtc: 'x' });
    expect(machines.map((m) => m.id + ':' + m.online)).toEqual(['mch_a:true', 'mch_b:true']);
    expect(socket.sent).toContain('{"type":"pong"}');
    events.stop();
  });

  it('signs out when the events socket is closed with 4401', async () => {
    const { auth } = await signedIn({ 'POST /v1.0/api/auth/logout': [{ status: 204 }] });
    const events = createAccountEvents(auth, { onEvent: jest.fn() }, (url) => new FakeSocket(url));
    events.start();
    await flush();
    await flush();
    FakeSocket.created[0].drop(4401);
    await flush();
    await flush();
    expect(auth.getState().status).toBe('signedOut');
  });
});

describe('machine socket', () => {
  it('subscribes to a session through the relay, surfaces approvals, and sends approve actions', async () => {
    const { auth } = await signedIn({});
    const frames: string[] = [];
    let approval = null as ReturnType<typeof approvalFromFrame>;
    const socket = createMachineSocket(auth, 'mch_1', {
      subscription: { sessionId: 'ses_9' },
      onFrame: (f) => {
        frames.push(f.eventType);
        approval = approvalFromFrame(f, 1000) ?? approval;
      },
      socketFactory: (url) => new FakeSocket(url),
    });
    socket.start();
    await flush();
    await flush();
    const ws = FakeSocket.created[0];
    expect(ws.url).toBe('wss://app.usemux.ai/m/mch_1/v1.0/ws?ticket=wst_a');
    ws.open();
    expect(JSON.parse(ws.sent[0])).toEqual({ action: 'subscribe', sessionId: 'ses_9' });
    ws.message({ eventType: 'approval_requested', runId: 'run_1', sessionId: 'ses_9', toolCallId: 'tc_1', toolName: 'write_file', arguments: '{"path":"a"}', toolAutoApproveSeconds: 10 });
    expect(approval).toMatchObject({ runId: 'run_1', toolCallId: 'tc_1', toolName: 'write_file', autoApproveSeconds: 10 });
    expect(secondsRemaining(approval!, 4000)).toBe(7);
    expect(socket.approve('run_1', 'tc_1', 'y')).toBe(true);
    expect(JSON.parse(ws.sent[1])).toEqual({ action: 'approve', runId: 'run_1', toolCallId: 'tc_1', decision: 'y' });
    ws.message('not json');
    expect(frames).toEqual(['approval_requested']);
    socket.stop();
  });

  it('mirrors a run started elsewhere into a live turn', () => {
    const turn: Turn = { key: 'live', role: 'assistant', content: '', tools: [], pending: true };
    applyRunFrame(turn, { eventType: 'assistant_text', text: 'Hel' });
    applyRunFrame(turn, { eventType: 'assistant_text', text: 'lo' });
    applyRunFrame(turn, { eventType: 'tool_call_proposed', toolCall: { id: 't1', name: 'read_file' } });
    applyRunFrame(turn, { eventType: 'tool_call_completed', toolCallId: 't1', result: { success: true }, elapsedMs: 12 });
    expect(applyRunFrame(turn, { eventType: 'run_completed', status: 'Completed' })).toBe(true);
    expect(turn).toMatchObject({ content: 'Hello', pending: false, tools: [{ id: 't1', status: 'ok', elapsedMs: 12 }] });
  });

  it('folds tool messages into the assistant turn of a stored transcript', () => {
    const turns = turnsFromDetail({
      Id: 's',
      Title: '',
      EndpointName: 'e',
      Model: 'm',
      Labels: [],
      Tags: [],
      WorkingDirectory: '/w',
      Messages: [
        { Role: 'user', Content: 'read it' },
        { Role: 'assistant', Content: '', ToolCalls: [{ Id: 't1', Name: 'read_file', Arguments: '{}' }] },
        { Role: 'tool', Content: 'file text', ToolCallId: 't1' },
        { Role: 'assistant', Content: 'done' },
      ],
    });
    expect(turns.map((t) => t.role + ':' + t.content)).toEqual(['user:read it', 'assistant:', 'assistant:done']);
    expect(turns[1].tools).toEqual([{ id: 't1', name: 'read_file', status: 'ok' }]);
  });
});
