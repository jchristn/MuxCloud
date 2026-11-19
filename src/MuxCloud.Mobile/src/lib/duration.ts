import { formatNumber } from '@dashboard/lib';

/**
 * Duration in milliseconds: "820 ms", "3.4 s", "2 min 5 s", "1 h 3 min", localized with Intl unit formatting.
 * Same output as the dashboard's formatDuration, but values are rounded before formatting: Hermes's Intl.NumberFormat
 * ignores maximumFractionDigits for style "unit" and would print "6.849 s".
 */
const digitsOf = (text: string): string => (text.match(/\p{Nd}/gu) ?? []).join('');

export function formatDuration(locale: string, ms: number | null | undefined): string {
  if (ms === null || ms === undefined || Number.isNaN(ms)) return '';
  const unit = (value: number, u: string, digits = 0) => {
    const f = Math.pow(10, digits);
    const rounded = Math.round(value * f) / f;
    const fallback = () =>
      formatNumber(locale, rounded, { maximumFractionDigits: digits }) + ' ' + ({ millisecond: 'ms', second: 's', minute: 'min', hour: 'h' }[u] ?? u);
    try {
      const out = formatNumber(locale, rounded, { style: 'unit', unit: u, unitDisplay: 'short', maximumFractionDigits: digits });
      // iOS's unit formatter rescales minutes and hours to seconds ("1 min" becomes "60s"), so keep its output only
      // when it shows the number we asked for.
      return digitsOf(out) === digitsOf(formatNumber(locale, rounded, { maximumFractionDigits: digits })) ? out : fallback();
    } catch {
      return fallback();
    }
  };
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
