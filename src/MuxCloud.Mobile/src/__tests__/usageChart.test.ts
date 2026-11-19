import { bucketWindow, chartToCsv, linePoints, OTHER_COLOR, sortEvents, SPLIT_COLORS, stackSeries } from '@/lib/usage';

describe('usage chart helpers', () => {
  const series = [
    {
      Key: 'gpt',
      IsOther: false,
      Buckets: [
        { BucketStartUnixMs: 2000, Metrics: { TotalTokens: 5 } },
        { BucketStartUnixMs: 1000, Metrics: { TotalTokens: 3 } },
      ],
    },
    { Key: '', IsOther: true, Buckets: [{ BucketStartUnixMs: 3000, Metrics: { TotalTokens: 7, Calls: 2 } }] },
    { Key: 'qwen', IsOther: false, Buckets: [{ BucketStartUnixMs: 1000, Metrics: { TotalTokens: 1 } }] },
  ];

  it('aligns series on shared buckets, totals them, and colors Other grey', () => {
    const chart = stackSeries(series, 'tokens');
    expect(chart.starts).toEqual([1000, 2000, 3000]);
    expect(chart.series.map((s) => s.values)).toEqual([
      [3, 5, 0],
      [0, 0, 7],
      [1, 0, 0],
    ]);
    expect(chart.totals).toEqual([4, 5, 7]);
    expect(chart.series.map((s) => s.color)).toEqual([SPLIT_COLORS[0], OTHER_COLOR, SPLIT_COLORS[1]]);
    expect(stackSeries(series, 'calls').totals).toEqual([0, 0, 2]);
  });

  it('exports a chart as CSV with ISO bucket times', () => {
    expect(chartToCsv([0, 60000], [{ key: 'a,b', values: [1, 2] }])).toBe('bucket_start_utc,"a,b"\n1970-01-01T00:00:00.000Z,1\n1970-01-01T00:01:00.000Z,2\n');
  });

  it('gives each bucket a window up to the next bucket', () => {
    expect(bucketWindow([0, 900, 1800], 0)).toEqual({ from: 0, to: 900 });
    expect(bucketWindow([0, 900, 1800], 2)).toEqual({ from: 1800, to: 2700 });
    expect(bucketWindow([500], 0, 100)).toEqual({ from: 500, to: 600 });
    expect(bucketWindow([500], 0)).toEqual({ from: 500, to: 60500 });
  });

  it('sorts a page of calls', () => {
    const rows = [
      { Id: 1, TimestampUnixMs: 10, InputTokens: 5, OutputTokens: 5, TotalMs: 300 },
      { Id: 2, TimestampUnixMs: 30, TotalTokens: 50, TotalMs: 100 },
      { Id: 3, TimestampUnixMs: 20, TotalTokens: 1, TotalMs: 900 },
    ];
    expect(sortEvents(rows, 'newest').map((r) => r.Id)).toEqual([2, 3, 1]);
    expect(sortEvents(rows, 'oldest').map((r) => r.Id)).toEqual([1, 3, 2]);
    expect(sortEvents(rows, 'tokens').map((r) => r.Id)).toEqual([2, 1, 3]);
    expect(sortEvents(rows, 'slowest').map((r) => r.Id)).toEqual([3, 1, 2]);
  });

  it('places line points left to right with the largest value at the top', () => {
    expect(linePoints([0, 5, 10], 100, 50)).toEqual([
      { x: 0, y: 50 },
      { x: 50, y: 25 },
      { x: 100, y: 0 },
    ]);
    expect(linePoints([0, 0], 10, 50)).toEqual([
      { x: 0, y: 50 },
      { x: 10, y: 50 },
    ]);
    expect(linePoints([4], 10, 50)).toEqual([{ x: 5, y: 0 }]);
  });
});
