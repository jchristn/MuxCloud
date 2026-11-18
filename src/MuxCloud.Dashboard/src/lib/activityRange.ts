import type { RequestHistoryBucket, RequestHistorySummary } from '../types';

/** Chart range presets (FRONTEND_ARCHITECTURE.md "ActivityChart"). */
export type RangeId = 'hour' | 'day' | 'week' | 'month';

export interface RangePreset {
  id: RangeId;
  bucketMinutes: number;
  bucketCount: number;
}

export const RANGE_PRESETS: Record<RangeId, RangePreset> = {
  hour: { id: 'hour', bucketMinutes: 1, bucketCount: 60 },
  day: { id: 'day', bucketMinutes: 15, bucketCount: 96 },
  week: { id: 'week', bucketMinutes: 120, bucketCount: 84 },
  month: { id: 'month', bucketMinutes: 360, bucketCount: 120 },
};

export const RANGE_IDS: RangeId[] = ['hour', 'day', 'week', 'month'];

export interface RangeParams {
  fromUtc: string;
  toUtc: string;
  bucketMinutes: number;
}

/** Aligned from/to for a range ending now: the end is rounded up to the next bucket boundary. */
export function rangeToParams(rangeId: RangeId, now: number = Date.now()): RangeParams {
  const preset = RANGE_PRESETS[rangeId];
  const bucketMs = preset.bucketMinutes * 60_000;
  const end = Math.ceil(now / bucketMs) * bucketMs;
  const start = end - bucketMs * preset.bucketCount;
  return { fromUtc: new Date(start).toISOString(), toUtc: new Date(end).toISOString(), bucketMinutes: preset.bucketMinutes };
}

/**
 * Exactly `bucketCount` buckets covering the range, with zero counts where the server returned none. Never
 * trusts the server to fill gaps.
 */
export function normalizeBuckets(summary: RequestHistorySummary | null, params: RangeParams, bucketCount: number): RequestHistoryBucket[] {
  const bucketMs = params.bucketMinutes * 60_000;
  const start = new Date(params.fromUtc).getTime();
  const byStart = new Map<number, RequestHistoryBucket>();
  for (const bucket of summary?.buckets ?? []) {
    const t = new Date(bucket.bucketStartUtc).getTime();
    if (!Number.isNaN(t)) byStart.set(Math.floor((t - start) / bucketMs), bucket);
  }
  const result: RequestHistoryBucket[] = [];
  for (let i = 0; i < bucketCount; i++) {
    const from = start + i * bucketMs;
    const found = byStart.get(i);
    result.push({
      bucketStartUtc: new Date(from).toISOString(),
      bucketEndUtc: new Date(from + bucketMs).toISOString(),
      successCount: found?.successCount ?? 0,
      failureCount: found?.failureCount ?? 0,
      averageDurationMs: found?.averageDurationMs ?? 0,
    });
  }
  return result;
}

/** About `count` evenly spaced "nice" tick values from 0 to at least max. */
export function niceTicks(max: number, count = 3): number[] {
  if (max <= 0) return [0];
  const rough = max / count;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rough)));
  const steps = [1, 2, 5, 10];
  const step = (steps.find((s) => s * magnitude >= rough) ?? 10) * magnitude;
  const ticks: number[] = [];
  for (let v = 0; v <= max + step * 0.0001; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step);
  return ticks;
}
