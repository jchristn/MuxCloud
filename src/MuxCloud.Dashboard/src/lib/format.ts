/**
 * Locale-aware formatters. Every helper takes the locale explicitly (I18N.md "Formatting Requirements"); none reads
 * the browser default. Shared with the mobile app.
 */

const cache = new Map<string, Intl.NumberFormat | Intl.DateTimeFormat | Intl.RelativeTimeFormat | Intl.ListFormat>();

function cached<T>(key: string, make: () => T): T {
  const hit = cache.get(key);
  if (hit) return hit as unknown as T;
  const made = make();
  cache.set(key, made as unknown as Intl.NumberFormat);
  return made;
}

function toDate(value: string | number | Date | null | undefined): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatNumber(
  locale: string,
  value: number | null | undefined,
  options?: Intl.NumberFormatOptions,
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '';
  return cached(
    'n|' + locale + '|' + JSON.stringify(options ?? {}),
    () => new Intl.NumberFormat(locale, options),
  ).format(value);
}

export function formatPercent(locale: string, ratio: number | null | undefined, fractionDigits = 1): string {
  return formatNumber(locale, ratio, { style: 'percent', maximumFractionDigits: fractionDigits });
}

export function formatCurrency(locale: string, cents: number, currency: string): string {
  return formatNumber(locale, cents / 100, { style: 'currency', currency: (currency || 'usd').toUpperCase() });
}

export function formatDate(locale: string, value: string | number | Date | null | undefined): string {
  const date = toDate(value);
  if (!date) return '';
  return cached('d|' + locale, () => new Intl.DateTimeFormat(locale, { dateStyle: 'medium' })).format(date);
}

export function formatTime(locale: string, value: string | number | Date | null | undefined): string {
  const date = toDate(value);
  if (!date) return '';
  return cached('t|' + locale, () => new Intl.DateTimeFormat(locale, { timeStyle: 'short' })).format(date);
}

export function formatDateTime(locale: string, value: string | number | Date | null | undefined): string {
  const date = toDate(value);
  if (!date) return '';
  return cached(
    'dt|' + locale,
    () => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'medium' }),
  ).format(date);
}

/** Relative time such as "3 minutes ago" or "in 2 days". `now` is injectable for tests. */
export function formatRelativeTime(
  locale: string,
  value: string | number | Date | null | undefined,
  now: number = Date.now(),
): string {
  const date = toDate(value);
  if (!date) return '';
  const seconds = Math.round((date.getTime() - now) / 1000);
  const abs = Math.abs(seconds);
  const rtf = cached('r|' + locale, () => new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }));
  if (abs < 45) return rtf.format(seconds, 'second');
  if (abs < 45 * 60) return rtf.format(Math.round(seconds / 60), 'minute');
  if (abs < 22 * 3600) return rtf.format(Math.round(seconds / 3600), 'hour');
  if (abs < 26 * 86400) return rtf.format(Math.round(seconds / 86400), 'day');
  if (abs < 320 * 86400) return rtf.format(Math.round(seconds / (30 * 86400)), 'month');
  return rtf.format(Math.round(seconds / (365 * 86400)), 'year');
}

/** Duration in milliseconds: "820 ms", "3.4 s", "2 min 5 s", "1 h 3 min". Units use Intl unit formatting. */
export function formatDuration(locale: string, ms: number | null | undefined): string {
  if (ms === null || ms === undefined || Number.isNaN(ms)) return '';
  const unit = (value: number, u: string, digits = 0) =>
    formatNumber(locale, value, { style: 'unit', unit: u, unitDisplay: 'short', maximumFractionDigits: digits });
  if (ms < 1000) return unit(ms, 'millisecond', ms < 10 ? 2 : 0);
  if (ms < 60_000) return unit(ms / 1000, 'second', 1);
  if (ms < 3_600_000) {
    const minutes = Math.floor(ms / 60_000);
    const seconds = Math.round((ms % 60_000) / 1000);
    return seconds ? unit(minutes, 'minute') + ' ' + unit(seconds, 'second') : unit(minutes, 'minute');
  }
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.round((ms % 3_600_000) / 60_000);
  return minutes ? unit(hours, 'hour') + ' ' + unit(minutes, 'minute') : unit(hours, 'hour');
}

/** Byte counts with binary steps: "812 B", "18 kB", "3.2 MB". */
export function formatBytes(locale: string, bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || Number.isNaN(bytes)) return '';
  const units = ['byte', 'kilobyte', 'megabyte', 'gigabyte', 'terabyte'];
  let value = bytes;
  let index = 0;
  while (Math.abs(value) >= 1024 && index < units.length - 1) {
    value /= 1024;
    index++;
  }
  return formatNumber(locale, value, {
    style: 'unit',
    unit: units[index],
    unitDisplay: 'short',
    maximumFractionDigits: index === 0 ? 0 : 1,
  });
}

export function formatList(
  locale: string,
  items: string[],
  type: 'conjunction' | 'disjunction' | 'unit' = 'conjunction',
): string {
  return cached('l|' + locale + '|' + type, () => new Intl.ListFormat(locale, { style: 'long', type })).format(items);
}
