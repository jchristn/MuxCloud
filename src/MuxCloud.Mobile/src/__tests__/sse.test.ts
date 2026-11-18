import { SseParser } from '@/lib/sse';

describe('SseParser', () => {
  it('parses events split across arbitrary chunks', () => {
    const text = 'event: run\ndata: {"RunId":"r1","SessionId":"s1"}\n\nevent: token\ndata: "Hel"\n\nevent: token\ndata: "lo"\n\n';
    for (let size = 1; size <= text.length; size++) {
      const parser = new SseParser();
      const events = [];
      for (let i = 0; i < text.length; i += size) events.push(...parser.feed(text.slice(i, i + size)));
      events.push(...parser.end());
      expect(events.map((e) => e.event)).toEqual(['run', 'token', 'token']);
      expect(events[1].data).toBe('"Hel"');
    }
  });

  it('handles CRLF and lone CR line endings, including a CR at a chunk boundary', () => {
    const parser = new SseParser();
    const events = [...parser.feed('event: a\r'), ...parser.feed('\ndata: 1\r\n\r\nevent: b\rdata: 2\r\r')];
    expect(events).toEqual([
      { event: 'a', data: '1' },
      { event: 'b', data: '2' },
    ]);
  });

  it('joins multi-line data, ignores comments, keeps ids, and defaults the event name', () => {
    const parser = new SseParser();
    const events = parser.feed(': keep-alive\nid: 7\ndata: line1\ndata: line2\n\n');
    expect(events).toEqual([{ event: 'message', data: 'line1\nline2', id: '7' }]);
  });

  it('drops events with no data and dispatches an unterminated final event at end of stream', () => {
    const parser = new SseParser();
    expect(parser.feed('event: empty\n\n')).toEqual([]);
    expect(parser.feed('event: done\ndata: {}')).toEqual([]);
    expect(parser.end()).toEqual([{ event: 'done', data: '{}' }]);
  });
});
