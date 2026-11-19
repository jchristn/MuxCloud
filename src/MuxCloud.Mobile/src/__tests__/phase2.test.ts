import { addQuestion, formatClock, questionFrom, questionSecondsLeft } from '@/lib/questions';
import { applyChatEvent, type Turn } from '@/lib/transcript';
import { toChatEvent } from '@/relay/chatStream';

const sse = (event: string, data: unknown) => ({ event, data: JSON.stringify(data) });

describe('ask_user questions', () => {
  const stream = {
    RunId: 'r1',
    QuestionId: 'q1',
    Question: 'Which database?',
    Options: [
      { Label: 'Postgres', Description: 'Server database' },
      { Label: 'SQLite', Description: '' },
    ],
    MultiSelect: false,
    AllowOther: true,
    AllowSkip: true,
    TimeoutSeconds: 900,
  };

  it('normalizes the chat stream event (PascalCase)', () => {
    const q = questionFrom(stream, 1000);
    expect(q).toEqual({
      runId: 'r1',
      questionId: 'q1',
      sessionId: undefined,
      question: 'Which database?',
      options: [
        { label: 'Postgres', description: 'Server database' },
        { label: 'SQLite', description: undefined },
      ],
      multiSelect: false,
      allowOther: true,
      allowSkip: true,
      timeoutSeconds: 900,
      receivedAt: 1000,
    });
  });

  it('normalizes the run frame (camelCase) and needs both ids', () => {
    const q = questionFrom(
      { eventType: 'ask_user', runId: 'r', sessionId: 's', questionId: 'q', question: 'Pick', options: [{ label: 'A' }], multiSelect: true },
      0,
    );
    expect(q?.sessionId).toBe('s');
    expect(q?.multiSelect).toBe(true);
    expect(q?.allowOther).toBe(true);
    expect(questionFrom({ runId: 'r' }, 0)).toBeNull();
    expect(questionFrom(null, 0)).toBeNull();
  });

  it('counts down and dedupes replayed questions', () => {
    const q = questionFrom(stream, 0)!;
    expect(questionSecondsLeft(q, 0)).toBe(900);
    expect(questionSecondsLeft(q, 899_500)).toBe(1);
    expect(questionSecondsLeft(q, 2_000_000)).toBe(0);
    expect(questionSecondsLeft({ ...q, timeoutSeconds: 0 }, 0)).toBeNull();
    expect(addQuestion(addQuestion([], q), q)).toHaveLength(1);
    expect(formatClock(125)).toBe('2:05');
  });
});

describe('chat stream additions', () => {
  it('parses ask_user, attachments, and compacted events', () => {
    expect(toChatEvent(sse('ask_user', { RunId: 'r', QuestionId: 'q', Question: 'x', Options: [] }))?.type).toBe('ask_user');
    expect(toChatEvent(sse('ask_user', { Question: 'no ids' }))).toBeNull();
    const a = toChatEvent(
      sse('attachments', { Attached: [{ Path: 'a.txt', Kind: 'file', Lines: 2 }], Skipped: [{ Path: '@b', Reason: 'not found' }], TotalBytes: 9 }),
    );
    expect(a).toEqual({
      type: 'attachments',
      attachments: { Attached: [{ Path: 'a.txt', Kind: 'file', Lines: 2 }], Skipped: [{ Path: '@b', Reason: 'not found' }], Notes: [], TotalBytes: 9 },
    });
    const c = toChatEvent(sse('compacted', { MessagesBefore: 25, MessagesAfter: 9, EstimatedTokensBefore: 41000, EstimatedTokensAfter: 6000 }));
    expect(c?.type === 'compacted' && c.compaction.MessagesAfter).toBe(9);
  });

  it('keeps live tool arguments and the finished result', () => {
    const turn: Turn = { key: 'k', role: 'assistant', content: '', tools: [] };
    applyChatEvent(turn, { type: 'tool', tool: { Id: 'c1', Name: 'read_file', Status: 'running', Arguments: '{"file_path":"a"}' } });
    expect(turn.tools[0]).toMatchObject({ status: 'running', arguments: '{"file_path":"a"}' });
    applyChatEvent(turn, { type: 'tool', tool: { Id: 'c1', Name: 'read_file', Status: 'ok', ElapsedMs: 12, Result: 'text', ResultTruncated: true } });
    expect(turn.tools[0]).toMatchObject({ status: 'ok', elapsedMs: 12, arguments: '{"file_path":"a"}', result: 'text\n...' });
  });
});

describe('saved prompts with mentioned files', () => {
  it('splits the block off and lists the attachments', () => {
    const { splitMentionBlock, turnsFromDetail, historyForRequest } = jest.requireActual('@/lib/transcript') as typeof import('@/lib/transcript');
    const saved =
      'Read @notes.txt please\n\n<mentioned-files>\nThe user attached these.\n<file path="notes.txt" lines="1" view="full">\n     1\thello\n</file>\n<directory path="src" entries="3">\na\n</directory>\n</mentioned-files>';
    const r = splitMentionBlock(saved)!;
    expect(r.text).toBe('Read @notes.txt please');
    expect(r.attachments.Attached).toEqual([
      { Path: 'notes.txt', Kind: 'file', Lines: 1 },
      { Path: 'src', Kind: 'directory', Lines: undefined },
    ]);
    expect(splitMentionBlock('plain text')).toBeNull();
    const turns = turnsFromDetail({ Messages: [{ Role: 'user', Content: saved }] } as never);
    expect(turns[0].content).toBe('Read @notes.txt please');
    expect(historyForRequest(turns)[0].Content).toBe(saved);
  });
});
