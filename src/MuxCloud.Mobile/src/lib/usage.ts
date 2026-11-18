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
