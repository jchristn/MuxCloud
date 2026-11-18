import { describe, expect, it } from 'vitest';
import { formatBytes, formatDuration, formatList, formatNumber, formatPercent, formatRelativeTime } from './format';

describe('formatters use the explicit locale', () => {
  it('numbers', () => {
    expect(formatNumber('en', 1234567)).toBe('1,234,567');
    expect(formatNumber('de', 1234567)).toBe('1.234.567');
    expect(formatNumber('en', null)).toBe('');
  });
  it('percent', () => {
    expect(formatPercent('en', 0.987)).toBe('98.7%');
  });
  it('relative time', () => {
    const now = Date.UTC(2026, 10, 17, 12, 0, 0);
    expect(formatRelativeTime('en', new Date(now - 3 * 60_000), now)).toBe('3 minutes ago');
    expect(formatRelativeTime('en', new Date(now - 26 * 3600_000), now)).toBe('yesterday');
    expect(formatRelativeTime('fr', new Date(now - 3 * 60_000), now)).toBe('il y a 3 minutes');
  });
  it('durations and bytes', () => {
    expect(formatDuration('en', 820)).toBe('820 ms');
    expect(formatDuration('en', 3400)).toBe('3.4 sec');
    expect(formatBytes('en', 812)).toBe('812 byte');
    expect(formatBytes('en', 18 * 1024)).toBe('18 kB');
  });
  it('lists', () => {
    expect(formatList('en', ['a', 'b', 'c'])).toBe('a, b, and c');
  });
});
