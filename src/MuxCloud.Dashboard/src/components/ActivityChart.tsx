import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useLocale } from '../i18n/runtime';
import {
  RANGE_IDS,
  RANGE_PRESETS,
  niceTicks,
  normalizeBuckets,
  type RangeId,
  type RangeParams,
} from '../lib/activityRange';
import { formatDateTime, formatDuration, formatNumber, formatTime, formatDate } from '../lib/format';
import type { RequestHistoryBucket, RequestHistorySummary } from '../types';
import { Icon } from './Icon';

const RANGE_KEYS: Record<RangeId, string> = {
  hour: 'chart.rangeHour',
  day: 'chart.rangeDay',
  week: 'chart.rangeWeek',
  month: 'chart.rangeMonth',
};

export function RangeSelector({ value, onChange }: { value: RangeId; onChange: (id: RangeId) => void }) {
  const { t } = useTranslation();
  return (
    <div className="segmented" role="group" aria-label={t('chart.range')}>
      {RANGE_IDS.map((id) => (
        <button key={id} type="button" aria-pressed={value === id} onClick={() => onChange(id)}>
          {t(RANGE_KEYS[id])}
        </button>
      ))}
    </div>
  );
}

interface ActivityChartProps {
  summary: RequestHistorySummary | null;
  params: RangeParams;
  rangeId: RangeId;
  onBucketClick?: (bucket: RequestHistoryBucket) => void;
  /** Drawing height in CSS pixels. */
  height?: number;
}

const PAD = { top: 12, right: 10, bottom: 28, left: 44 };

/** Width of an element in CSS pixels, kept current with a ResizeObserver. */
function useWidth<T extends HTMLElement>(fallback: number): [RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(Math.max(240, Math.round(el.getBoundingClientRect().width)));
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}

/** Stacked SVG bars: succeeded on top of failed. Missing buckets are zero-filled. Tooltip renders in a portal. */
export function ActivityChart({ summary, params, rangeId, onBucketClick, height = 200 }: ActivityChartProps) {
  const { t } = useTranslation();
  // The SVG is drawn at its real pixel size (no non-uniform scaling), so axis text keeps its proportions.
  const [box, W] = useWidth<HTMLDivElement>(760);
  // Phones get a shorter chart so it does not fill the screen.
  const H = W < 560 ? Math.min(height, 260) : height;
  const locale = useLocale();
  const [hover, setHover] = useState<{ bucket: RequestHistoryBucket; x: number; y: number } | null>(null);
  const preset = RANGE_PRESETS[rangeId];
  const buckets = useMemo(
    () => normalizeBuckets(summary, params, preset.bucketCount),
    [summary, params, preset.bucketCount],
  );
  const max = Math.max(0, ...buckets.map((b) => b.successCount + b.failureCount));
  const ticks = niceTicks(max, 3);
  const top = ticks[ticks.length - 1] || 1;
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const barW = plotW / buckets.length;
  const y = (v: number) => PAD.top + plotH - (v / top) * plotH;
  const labelEvery = Math.max(1, Math.ceil(buckets.length / Math.max(2, Math.floor(plotW / 84))));
  const label = (iso: string) =>
    rangeId === 'hour' || rangeId === 'day' ? formatTime(locale, iso) : formatDate(locale, iso);

  return (
    <div className="activity-chart" ref={box}>
      {max === 0 ? <p className="small muted">{t('chart.noData')}</p> : null}
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t('chart.ariaLabel')}>
        {ticks.map((tick) => (
          <g key={tick}>
            <line className="grid" x1={PAD.left} x2={W - PAD.right} y1={y(tick)} y2={y(tick)} strokeDasharray="2 3" />
            <text className="axis" x={PAD.left - 6} y={y(tick) + 3} textAnchor="end">
              {formatNumber(locale, tick, { notation: 'compact' })}
            </text>
          </g>
        ))}
        {buckets.map((b, i) => {
          const x = PAD.left + i * barW;
          const fail = b.failureCount;
          const ok = b.successCount;
          const total = ok + fail;
          return (
            <g
              key={b.bucketStartUtc}
              onMouseMove={(e) => setHover({ bucket: b, x: e.clientX, y: e.clientY })}
              onMouseLeave={() => setHover(null)}
              onClick={() => total > 0 && onBucketClick?.(b)}
            >
              <rect className="bar" x={x} y={PAD.top} width={barW} height={plotH} fill="transparent" />
              {fail > 0 ? (
                <rect
                  x={x + barW * 0.12}
                  y={y(fail)}
                  width={barW * 0.76}
                  height={y(0) - y(fail)}
                  fill="var(--color-danger)"
                />
              ) : null}
              {ok > 0 ? (
                <rect
                  x={x + barW * 0.12}
                  y={y(total)}
                  width={barW * 0.76}
                  height={y(fail) - y(total)}
                  fill="var(--color-success)"
                />
              ) : null}
              {i % labelEvery === 0 ? (
                <text className="axis" x={x + barW / 2} y={H - 8} textAnchor="middle">
                  {label(b.bucketStartUtc)}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      <div className="chart-legend">
        <span>
          <span className="swatch" style={{ background: 'var(--color-success)' }} />
          {t('chart.success')}
        </span>
        <span>
          <span className="swatch" style={{ background: 'var(--color-danger)' }} />
          {t('chart.failure')}
        </span>
        {onBucketClick ? <span>{t('chart.bucketHint')}</span> : null}
      </div>
      {hover
        ? createPortal(
            <div
              className="tooltip"
              style={{ top: hover.y + 14, left: Math.min(hover.x + 14, window.innerWidth - 270) }}
            >
              <div className="small muted">
                {formatDateTime(locale, hover.bucket.bucketStartUtc)} - {formatTime(locale, hover.bucket.bucketEndUtc)}
              </div>
              <div>
                {t('chart.total')}: {formatNumber(locale, hover.bucket.successCount + hover.bucket.failureCount)}
              </div>
              <div>
                {t('chart.success')}: {formatNumber(locale, hover.bucket.successCount)}
              </div>
              <div>
                {t('chart.failure')}: {formatNumber(locale, hover.bucket.failureCount)}
              </div>
              <div>
                {t('chart.avgDuration')}: {formatDuration(locale, hover.bucket.averageDurationMs)}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

/** Header row for a chart panel: title, range control, refresh. */
export function ChartHeader({
  rangeId,
  onRange,
  onRefresh,
  loading,
}: {
  rangeId: RangeId;
  onRange: (id: RangeId) => void;
  onRefresh: () => void;
  loading?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="chart-head">
      <h2 className="section-title">{t('chart.title')}</h2>
      <div className="row">
        <RangeSelector value={rangeId} onChange={onRange} />
        <button
          type="button"
          className="icon-btn"
          onClick={onRefresh}
          disabled={loading}
          aria-label={t('common.refresh')}
          title={t('common.refresh')}
        >
          <Icon name="refresh" />
        </button>
      </div>
    </div>
  );
}
