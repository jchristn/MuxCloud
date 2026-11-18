import { describe, expect, it } from 'vitest';
import { headerEntries } from './headers';

describe('headerEntries', () => {
  it('reads the API object', () => {
    expect(headerEntries({ 'X-Forwarded-For': '1.2.3.4', Accept: '*/*' })).toEqual([
      ['Accept', '*/*'],
      ['X-Forwarded-For', '1.2.3.4'],
    ]);
  });

  it('never iterates a string character by character', () => {
    expect(headerEntries('X-Forwarded-For: 1.2.3.4\nAccept: */*\n')).toEqual([
      ['Accept', '*/*'],
      ['X-Forwarded-For', '1.2.3.4'],
    ]);
    expect(headerEntries('{"Host":"app.usemux.ai"}')).toEqual([['Host', 'app.usemux.ai']]);
  });

  it('handles empty and odd values', () => {
    expect(headerEntries(undefined)).toEqual([]);
    expect(headerEntries('')).toEqual([]);
    expect(headerEntries(['a'])).toEqual([]);
  });
});
