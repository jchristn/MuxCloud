import { humanize, templateFrom } from '@/lib/forms';
import { COLLECTIONS, collectionFor } from '@/lib/resources';
import { facetsOf, filterSessions } from '@/lib/sessions';
import { historyForRequest, parseSlash, SLASH_SCREENS, type Turn } from '@/lib/transcript';
import { barFractions, eventsToCsv, heatLevel, metricValue } from '@/lib/usage';
import { routeForPush } from '@/push/devicesApi';
import { isInsecureServer, normalizeServerUrl } from '@/storage/prefs';
import type { MuxSessionSummary } from '@/types/mux';

const session = (id: string, extra: Partial<MuxSessionSummary> = {}): MuxSessionSummary => ({ Id: id, Title: id, UpdatedUtc: '2026-11-17T00:00:0' + id.length + 'Z', ...extra });

describe('conversation filters', () => {
  const list = [
    session('alpha', { Labels: ['work'], Model: 'qwen3', UpdatedUtc: '2026-11-17T01:00:00Z' }),
    session('beta', { Tags: [{ Key: 'repo', Value: 'mux' }], WorkingDirectory: '/src/mux', UpdatedUtc: '2026-11-17T03:00:00Z' }),
    session('gamma', { Labels: ['work', 'urgent'], UpdatedUtc: '2026-11-17T02:00:00Z' }),
  ];
  it('searches title, model, folder, labels, and tags, newest first', () => {
    expect(filterSessions(list, '', '').map((s) => s.Id)).toEqual(['beta', 'gamma', 'alpha']);
    expect(filterSessions(list, 'QWEN', '').map((s) => s.Id)).toEqual(['alpha']);
    expect(filterSessions(list, '/src/mux', '').map((s) => s.Id)).toEqual(['beta']);
  });
  it('filters by an exact label or key=value tag', () => {
    expect(filterSessions(list, '', 'work').map((s) => s.Id)).toEqual(['gamma', 'alpha']);
    expect(filterSessions(list, '', 'repo=mux').map((s) => s.Id)).toEqual(['beta']);
    expect(facetsOf(list)).toEqual(['repo=mux', 'urgent', 'work']);
  });
});

describe('chat helpers', () => {
  it('parses slash commands and maps screen shortcuts', () => {
    expect(parseSlash('  /Usage now')).toEqual({ command: 'usage', args: 'now' });
    expect(parseSlash('hello')).toBeNull();
    expect(SLASH_SCREENS.models).toBe('endpoints');
    for (const segment of new Set(Object.values(SLASH_SCREENS))) {
      expect(collectionFor(segment) !== undefined || ['usage', 'skills', 'pricing', 'settings'].includes(segment)).toBe(true);
    }
  });
  it('sends finished user and assistant turns plus display-only notes, never pending or failed turns', () => {
    const turns: Turn[] = [
      { key: '1', role: 'user', content: 'hi', tools: [] },
      { key: '2', role: 'assistant', content: 'hello', tools: [] },
      { key: '3', role: 'system', content: 'Switched to endpoint b', tools: [], displayOnly: true },
      { key: '4', role: 'assistant', content: 'oops', tools: [], error: true },
      { key: '5', role: 'assistant', content: '', tools: [], pending: true },
    ];
    expect(historyForRequest(turns)).toEqual([
      { Role: 'user', Content: 'hi' },
      { Role: 'assistant', Content: 'hello' },
      { Role: 'system', Content: 'Switched to endpoint b', DisplayOnly: true },
    ]);
  });
});

describe('forms', () => {
  it('humanizes mux property names', () => {
    expect(humanize('ToolAutoApproveSeconds')).toBe('Tool auto approve seconds');
    expect(humanize('MaxTokens')).toBe('Max tokens');
    expect(humanize('BaseUrl')).toBe('Base url');
  });
  it('builds an empty template from a sample', () => {
    expect(templateFrom({ Name: 'x', On: true, N: 3, Args: ['a'], Nested: { Key: 'k' }, Maybe: null })).toEqual({ Name: '', On: false, N: 0, Args: [], Nested: { Key: '' }, Maybe: null });
  });
  it('defines a template and key field for every collection', () => {
    for (const c of COLLECTIONS) {
      expect(Object.keys(c.template)).toContain(c.keyField);
      expect(c.path.startsWith('/v1.0/api/')).toBe(true);
    }
  });
});

describe('usage helpers', () => {
  it('picks metrics, scales bars, and buckets heat', () => {
    expect(metricValue({ TotalTokens: 5, Calls: 2, CostUsd: 0.5 }, 'calls')).toBe(2);
    expect(barFractions([0, 5, 10])).toEqual([0, 0.5, 1]);
    expect(barFractions([0, 0])).toEqual([0, 0]);
    expect([0, 1, 50, 100].map((v) => heatLevel(v, 100))).toEqual([0, 1, 2, 4]);
  });
  it('writes CSV with quoting', () => {
    expect(eventsToCsv([{ Model: 'a,b', Note: 'say "hi"', N: 1 }])).toBe('Model,Note,N\n"a,b","say ""hi""",1\n');
    expect(eventsToCsv([])).toBe('');
  });
});

describe('server URL and push links', () => {
  it('normalizes server URLs and flags plain HTTP', () => {
    expect(normalizeServerUrl(' app.usemux.ai/ ')).toBe('https://app.usemux.ai');
    expect(normalizeServerUrl('http://127.0.0.1:8800//')).toBe('http://127.0.0.1:8800');
    expect(normalizeServerUrl('')).toBe('');
    expect(isInsecureServer('http://127.0.0.1:8800')).toBe(true);
    expect(isInsecureServer('https://app.usemux.ai')).toBe(false);
  });
  it('routes a notification to the conversation or machine it names', () => {
    expect(routeForPush({ machineId: 'mch_1', sessionId: 'ses 2', kind: 'approval_requested' })).toBe('/machines/mch_1/conversation/ses%202');
    expect(routeForPush({ machineId: 'mch_1' })).toBe('/machines/mch_1');
    expect(routeForPush({ kind: 'x' })).toBeNull();
    expect(routeForPush(null)).toBeNull();
  });
});

describe('folderName', () => {
  it('keeps only the last segment of a working folder', () => {
    const { folderName } = jest.requireActual('@/lib/sessions') as typeof import('@/lib/sessions');
    expect(folderName('/Users/me/src/acme-api/')).toBe('acme-api');
    expect(folderName('C:\\work\\repo')).toBe('repo');
    expect(folderName('')).toBe('');
    expect(folderName('/')).toBe('');
  });
});

describe('formatDuration (Hermes-safe)', () => {
  it('rounds before formatting', () => {
    const { formatDuration } = jest.requireActual('@/lib/duration') as typeof import('@/lib/duration');
    expect(formatDuration('en', 6849)).toBe('6.8 sec');
    expect(formatDuration('en', 820)).toBe('820 ms');
    expect(formatDuration('en', 125_000)).toBe('2 min 5 sec');
    expect(formatDuration('en', null)).toBe('');
  });
});
