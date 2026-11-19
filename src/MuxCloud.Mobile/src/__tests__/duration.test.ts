import { formatDuration } from '@/lib/duration';

describe('formatDuration', () => {
  it('formats minutes and seconds without rescaling minutes to seconds', () => {
    const out = formatDuration('en', 84_000);
    expect(out).toMatch(/^1 min 24 (s|sec)$/);
    expect(out).not.toContain('60');
  });

  it('falls back to plain labels when the unit formatter rescales', () => {
    const original = Intl.NumberFormat;
    // Simulate iOS: a "minute" unit comes back as seconds.
    const Fake = function (locale: string, options?: Intl.NumberFormatOptions) {
      const real = new original(locale, options);
      return {
        format: (n: number) => (options?.style === 'unit' && options.unit === 'minute' ? `${n * 60}s` : real.format(n)),
        resolvedOptions: () => real.resolvedOptions(),
      } as unknown as Intl.NumberFormat;
    } as unknown as typeof Intl.NumberFormat;
    (Intl as { NumberFormat: typeof Intl.NumberFormat }).NumberFormat = Fake;
    try {
      expect(formatDuration('en', 84_000)).toMatch(/^1 min 24 (s|sec)$/);
    } finally {
      (Intl as { NumberFormat: typeof Intl.NumberFormat }).NumberFormat = original;
    }
  });
});
