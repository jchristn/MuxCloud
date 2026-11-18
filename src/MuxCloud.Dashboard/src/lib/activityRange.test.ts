import { describe, expect, it } from 'vitest';
import { RANGE_PRESETS, niceTicks, normalizeBuckets, rangeToParams } from './activityRange';

describe('activity ranges', () => {
  it('uses the required bucket sizes and counts', () => {
    expect(RANGE_PRESETS.hour).toMatchObject({ bucketMinutes: 1, bucketCount: 60 });
    expect(RANGE_PRESETS.day).toMatchObject({ bucketMinutes: 15, bucketCount: 96 });
    expect(RANGE_PRESETS.week).toMatchObject({ bucketMinutes: 120, bucketCount: 84 });
    expect(RANGE_PRESETS.month).toMatchObject({ bucketMinutes: 360, bucketCount: 120 });
  });
  it('fills missing buckets with zeros', () => {
    const now = Date.UTC(2026, 10, 17, 12, 0, 30);
    const params = rangeToParams('hour', now);
    const second = new Date(new Date(params.fromUtc).getTime() + 60_000).toISOString();
    const buckets = normalizeBuckets(
      { totalCount: 3, totalSuccess: 2, totalFailure: 1, averageDurationMs: 5, buckets: [{ bucketStartUtc: second, bucketEndUtc: second, successCount: 2, failureCount: 1, averageDurationMs: 5 }] },
      params,
      60,
    );
    expect(buckets).toHaveLength(60);
    expect(buckets[0].successCount).toBe(0);
    expect(buckets[1].successCount).toBe(2);
    expect(new Date(params.toUtc).getTime() - new Date(params.fromUtc).getTime()).toBe(60 * 60_000);
  });
  it('makes nice ticks', () => {
    expect(niceTicks(0)).toEqual([0]);
    expect(niceTicks(9)).toEqual([0, 5, 10]);
    expect(niceTicks(250)).toEqual([0, 100, 200, 300]);
  });
});
