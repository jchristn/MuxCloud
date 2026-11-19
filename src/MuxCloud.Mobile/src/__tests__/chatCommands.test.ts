import {
  applyMention,
  canonicalCommand,
  memoryNameFromText,
  mentionAtEnd,
  parseLabels,
  parseMemoryCommand,
  parseQuickMemory,
  parseTags,
  slashSuggestions,
  slugify,
} from '@/lib/chatCommands';
import { highlight } from '@/lib/highlight';
import { contextPercent, prettyJson, sessionStatuses, splitDetails, tokensPerTurn } from '@/lib/chatStats';
import type { MuxRunSummary, MuxSessionSummary } from '@/types/mux';

describe('quick memories (# text) match mux MemoryQuickAdd', () => {
  it('slugs like the mux memory store', () => {
    expect(slugify('  Use pnpm, not npm!  ')).toBe('use-pnpm-not-npm');
    expect(slugify('***')).toBe('');
    expect(slugify('a'.repeat(80)).length).toBe(60);
  });
  it('names a memory from its first six words', () => {
    expect(memoryNameFromText('Always run the tests before you push to main please')).toBe('always-run-the-tests-before-you');
    expect(memoryNameFromText('— use pnpm')).toBe('use-pnpm');
  });
  it('parses project and global memories and ignores headings', () => {
    expect(parseQuickMemory('# use pnpm here')).toEqual({ scope: 'project', text: 'use pnpm here' });
    expect(parseQuickMemory('#global prefer tabs')).toEqual({ scope: 'global', text: 'prefer tabs' });
    expect(parseQuickMemory('#globalish thing')).toEqual({ scope: 'project', text: 'globalish thing' });
    expect(parseQuickMemory('## Heading')).toBeNull();
    expect(parseQuickMemory('# !!!')).toBeNull();
    expect(parseQuickMemory('no hash')).toBeNull();
  });
});

describe('slash commands', () => {
  it('resolves desktop aliases', () => {
    expect(canonicalCommand('keys')).toBe('keybindings');
    expect(canonicalCommand('Agents')).toBe('subagents');
    expect(canonicalCommand('model')).toBe('endpoints');
    expect(canonicalCommand('usage')).toBe('usage');
  });
  it('completes command names, then endpoint names, effort levels, and memory actions', () => {
    expect(slashSuggestions('/he').map((s) => s.label)).toEqual(['/help']);
    expect(slashSuggestions('/s', { skills: ['summarize'] }).map((s) => s.label)).toContain('/summarize');
    expect(slashSuggestions('/endpoint o', { endpoints: ['ollama-local', 'openai'] }).map((s) => s.insert)).toEqual(['/endpoint ollama-local', '/endpoint openai']);
    expect(slashSuggestions('/effort h').map((s) => s.label)).toEqual(['high']);
    expect(slashSuggestions('/memory d').map((s) => s.label)).toEqual(['delete']);
    expect(slashSuggestions('hello')).toEqual([]);
    expect(slashSuggestions('/endpoint a b', { endpoints: ['a'] })).toEqual([]);
  });
  it('parses /memory, /label, and /tag arguments', () => {
    expect(parseMemoryCommand('')).toEqual({ action: 'list' });
    expect(parseMemoryCommand('show use-pnpm')).toEqual({ action: 'show', name: 'use-pnpm' });
    expect(parseMemoryCommand('delete use-pnpm')).toEqual({ action: 'delete', name: 'use-pnpm' });
    expect(parseMemoryCommand('clear')).toEqual({ action: 'clear', scope: 'project' });
    expect(parseMemoryCommand('clear global')).toEqual({ action: 'clear', scope: 'global' });
    expect(parseMemoryCommand('delete')).toEqual({ action: 'list' });
    expect(parseLabels('bug, ui , bug')).toEqual(['bug', 'ui']);
    expect(parseLabels('bug ui')).toEqual(['bug', 'ui']);
    expect(parseTags('team=core, prio:high, =x, flag')).toEqual([
      { Key: 'team', Value: 'core' },
      { Key: 'prio', Value: 'high' },
      { Key: 'flag', Value: '' },
    ]);
  });
  it('tracks and completes @file mentions', () => {
    expect(mentionAtEnd('look at @src/ap')).toBe('src/ap');
    expect(mentionAtEnd('mail me@x.com')).toBeNull();
    expect(mentionAtEnd('done @a.ts now')).toBeNull();
    expect(applyMention('look at @src/ap', 'src/app.ts')).toBe('look at @src/app.ts ');
    expect(applyMention('look at @sr', '@src/')).toBe('look at @src/');
  });
});

describe('code highlighting', () => {
  it('splits keywords, strings, numbers, and comments', () => {
    const spans = highlight('const x = "hi"; // note\nreturn 42;', 'ts');
    const kinds = spans.map((s) => s.kind + ':' + s.text.trim()).filter((s) => !s.endsWith(':'));
    expect(kinds).toEqual(expect.arrayContaining(['keyword:const', 'string:"hi"', 'comment:// note', 'keyword:return', 'number:42']));
    expect(spans.map((s) => s.text).join('')).toBe('const x = "hi"; // note\nreturn 42;');
  });
  it('uses # comments for python and shell, and leaves unknown languages mostly plain', () => {
    expect(highlight('# hi\nprint(1)', 'python')[0]).toEqual({ kind: 'comment', text: '# hi' });
    expect(highlight('echo "a" # c', 'bash').some((s) => s.kind === 'comment')).toBe(true);
    expect(highlight('foo bar', 'unknown').every((s) => s.kind === 'plain')).toBe(true);
  });
});

describe('conversation stats and status', () => {
  it('computes context usage', () => {
    expect(contextPercent(72000, 100000)).toBe(72);
    expect(contextPercent(0, 100000)).toBeNull();
    expect(contextPercent(500000, 100000)).toBe(100);
    expect(contextPercent(10, 0)).toBeNull();
  });
  it('derives status dots from runs and read times', () => {
    const run = (id: string, status: string, terminal: boolean): MuxRunSummary => ({ RunId: 'r' + id + status, SessionId: id, EndpointName: '', Model: '', Status: status, IsTerminal: terminal, StartedUtc: '' });
    const session = (id: string, updated: string): MuxSessionSummary => ({ Id: id, Title: id, UpdatedUtc: updated }) as MuxSessionSummary;
    const out = sessionStatuses(
      [run('a', 'running', false), run('b', 'awaiting_approval', false), run('c', 'failed', true), run('d', 'completed', true)],
      [session('a', '2026-01-02T00:00:00Z'), session('e', '2026-01-03T00:00:00Z'), session('f', '2026-01-01T00:00:00Z'), session('g', '2026-01-03T00:00:00Z')],
      { g: Date.parse('2026-01-04T00:00:00Z') },
      Date.parse('2026-01-02T00:00:00Z'),
    );
    expect(out).toEqual({ a: 'running', b: 'approval', c: 'error', e: 'unread' });
  });
  it('lists tokens per assistant turn', () => {
    expect(tokensPerTurn([{ role: 'user' }, { role: 'assistant', stats: { TotalTokens: 10 } }, { role: 'assistant', stats: { InputTokens: 3, OutputTokens: 4 } }, { role: 'assistant' }])).toEqual([10, 7]);
  });
  it('splits <details> blocks out of markdown', () => {
    expect(splitDetails('Intro\n<details><summary>More</summary>\nHidden **text**\n</details>\nOutro')).toEqual([
      { kind: 'markdown', text: 'Intro\n' },
      { kind: 'details', summary: 'More', body: 'Hidden **text**', open: false },
      { kind: 'markdown', text: '\nOutro' },
    ]);
    expect(splitDetails('plain')).toEqual([{ kind: 'markdown', text: 'plain' }]);
  });
  it('pretty-prints JSON arguments', () => {
    expect(prettyJson('{"a":1}')).toBe('{\n  "a": 1\n}');
    expect(prettyJson('not json')).toBe('not json');
  });
});
