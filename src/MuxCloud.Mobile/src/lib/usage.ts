/** Pure helpers for the usage screen (exported for tests). */

export type UsageMetric = 'tokens' | 'calls' | 'cost';

export interface Metrics {
  Calls?: number;
  Errors?: number;
  ErrorRate?: number;
  InputTokens?: number;
  CachedTokens?: number;
  OutputTokens?: number;
  TotalTokens?: number;
  CostUsd?: number;
  CacheHitRate?: number;
  AvgTtftMs?: number;
  AvgTotalMs?: number;
  AvgTokensPerSec?: number;
}

export function metricValue(m: Metrics | undefined, metric: UsageMetric): number {
  if (!m) return 0;
  if (metric === 'calls') return m.Calls ?? 0;
  if (metric === 'cost') return m.CostUsd ?? 0;
  return m.TotalTokens ?? 0;
}

/** Bar heights as fractions of the largest bucket (0 to 1). */
export function barFractions(values: number[]): number[] {
  const max = Math.max(0, ...values);
  return values.map((v) => (max > 0 ? v / max : 0));
}

/** CSV of usage events with a header row; values are quoted when they contain commas, quotes, or newlines. */
export function eventsToCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const columns = Object.keys(rows[0]);
  const cell = (v: unknown) => {
    const text = v === null || v === undefined ? '' : String(v);
    return /[",\n\r]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
  };
  return [columns.join(','), ...rows.map((r) => columns.map((c) => cell(r[c])).join(','))].join('\n') + '\n';
}

/** Heatmap cell intensity buckets 0 to 4 (the local dashboard's five-step scale). */
export function heatLevel(value: number, max: number): number {
  if (value <= 0 || max <= 0) return 0;
  return Math.min(4, Math.max(1, Math.ceil((value / max) * 4)));
}

/** Series colors for the split chart, the same order as the local dashboard; "Other" is always grey. */
export const SPLIT_COLORS = ['#2563eb', '#16a34a', '#d97706', '#7c3aed', '#0891b2', '#db2777'];
export const OTHER_COLOR = '#9ca3af';

export interface SplitSeries {
  Key: string;
  IsOther: boolean;
  Buckets: { BucketStartUnixMs: number; Metrics?: Record<string, unknown> }[];
}

export interface StackedChart {
  /** Bucket start times, oldest first, the union of every series' buckets. */
  starts: number[];
  /** One entry per series: its key, color, and value per bucket (aligned with `starts`). */
  series: { key: string; isOther: boolean; color: string; values: number[] }[];
  /** Per-bucket totals across series. */
  totals: number[];
}

/** Aligns split series on shared bucket starts and assigns colors, for a stacked bar or multi-line chart. */
export function stackSeries(items: SplitSeries[], metric: UsageMetric): StackedChart {
  const starts = [...new Set(items.flatMap((s) => s.Buckets.map((b) => Number(b.BucketStartUnixMs))))].sort((a, b) => a - b);
  const index = new Map(starts.map((s, i) => [s, i]));
  let rank = 0;
  const series = items.map((s) => {
    const values = starts.map(() => 0);
    for (const b of s.Buckets) values[index.get(Number(b.BucketStartUnixMs)) ?? 0] += metricValue(b.Metrics as Metrics, metric);
    const color = s.IsOther ? OTHER_COLOR : SPLIT_COLORS[rank++ % SPLIT_COLORS.length];
    return { key: s.Key, isOther: s.IsOther, color, values };
  });
  const totals = starts.map((_, i) => series.reduce((sum, s) => sum + s.values[i], 0));
  return { starts, series, totals };
}

/** CSV of a chart: one row per bucket with its ISO start time and one column per series. */
export function chartToCsv(starts: number[], columns: { key: string; values: number[] }[]): string {
  const cell = (text: string) => (/[",\n\r]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text);
  const header = ['bucket_start_utc', ...columns.map((c) => cell(c.key))].join(',');
  const rows = starts.map((s, i) => [new Date(s).toISOString(), ...columns.map((c) => String(c.values[i] ?? 0))].join(','));
  return [header, ...rows].join('\n') + '\n';
}

/** The time window a bucket covers: from its start to the next bucket's start (or start + bucketMs for the last). */
export function bucketWindow(starts: number[], i: number, bucketMs?: number): { from: number; to: number } {
  const from = starts[i];
  const next = starts[i + 1];
  const width = bucketMs && bucketMs > 0 ? bucketMs : next !== undefined ? next - from : starts.length > 1 ? starts[1] - starts[0] : 60_000;
  return { from, to: from + width };
}

export type EventSort = 'newest' | 'oldest' | 'tokens' | 'slowest';

/** Sorts a page of usage events for the call table (the hub pages newest first and does not sort). */
export function sortEvents(rows: Record<string, unknown>[], sort: EventSort): Record<string, unknown>[] {
  const num = (r: Record<string, unknown>, k: string) => Number(r[k] ?? 0) || 0;
  const tokens = (r: Record<string, unknown>) => num(r, 'TotalTokens') || num(r, 'InputTokens') + num(r, 'OutputTokens');
  const by: Record<EventSort, (a: Record<string, unknown>, b: Record<string, unknown>) => number> = {
    newest: (a, b) => num(b, 'TimestampUnixMs') - num(a, 'TimestampUnixMs'),
    oldest: (a, b) => num(a, 'TimestampUnixMs') - num(b, 'TimestampUnixMs'),
    tokens: (a, b) => tokens(b) - tokens(a),
    slowest: (a, b) => num(b, 'TotalMs') - num(a, 'TotalMs'),
  };
  return [...rows].sort(by[sort]);
}

/** Points for a line chart in a width x height box (y grows downward); one point per value. */
export function linePoints(values: number[], width: number, height: number, max = Math.max(0, ...values)): { x: number; y: number }[] {
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  return values.map((v, i) => ({ x: values.length > 1 ? i * step : width / 2, y: max > 0 ? height - (v / max) * height : height }));
}
