import { useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View, type ScrollViewInstance } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { formatDateTime, formatNumber, formatPercent } from '@dashboard/lib';
import { Sheet } from '@/components/Sheet';
import { Button, Card, Empty, ErrorBox, KeyValues, ListRow, Loading, Notice, Screen, Section, Segmented, T } from '@/components/ui';
import { formatDuration } from '@/lib/duration';
import {
  bucketWindow,
  chartToCsv,
  eventsToCsv,
  heatLevel,
  linePoints,
  metricValue,
  sortEvents,
  stackSeries,
  type EventSort,
  type Metrics,
  type SplitSeries,
  type StackedChart,
  type UsageMetric,
} from '@/lib/usage';
import { useAsync } from '@/state/useAsync';
import { useMachineApi } from '@/state/useMachineApi';
import type { MuxUsageQuery, MuxUsageRange } from '@/types/mux';
import { useTheme } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/palette';

const RANGES: MuxUsageRange[] = ['hour', 'day', 'week', 'month', 'quarter', 'year', 'all'];
const DIMENSIONS = ['model', 'endpoint', 'provider', 'callkind'];
const SPLITS = ['none', 'model', 'endpoint', 'provider'] as const;
const SORTS: EventSort[] = ['newest', 'oldest', 'tokens', 'slowest'];
const PAGE_SIZE = 25;
const CHART_HEIGHT = 120;

interface Heatmap {
  Layout?: { Rows?: number; Columns?: number; RowLabels?: string[]; ColumnLabels?: string[]; CellStartsUnixMs?: number[]; BucketMs?: number };
  TotalTokens?: number[];
}

/**
 * Usage analytics for the machine, like the desktop dashboard: endpoint and conversation filters, totals, a timeline
 * that can split by model, endpoint, or provider (bars or lines, exportable as CSV), latency percentiles, breakdown,
 * failures, a heatmap, and a paged, sortable call table. Tapping a bar or a heatmap cell narrows the calls to it.
 */
export default function Usage() {
  const { machineId } = useLocalSearchParams<{ machineId: string }>();
  const { t, i18n } = useTranslation();
  const p = useTheme();
  const api = useMachineApi(machineId);
  const lang = i18n.language;
  const [range, setRange] = useState<MuxUsageRange>('day');
  const [metric, setMetric] = useState<UsageMetric>('tokens');
  const [dimension, setDimension] = useState('model');
  const [split, setSplit] = useState<(typeof SPLITS)[number]>('none');
  const [chartKind, setChartKind] = useState<'bars' | 'lines'>('bars');
  const [endpoint, setEndpoint] = useState('');
  const [session, setSession] = useState<{ id: string; title: string } | null>(null);
  const [pickSession, setPickSession] = useState(false);
  /** A bar or heatmap cell the user tapped: the call table shows only that window. */
  const [callWindow, setCallWindow] = useState<{ from: number; to: number } | null>(null);
  const [sort, setSort] = useState<EventSort>('newest');
  const [page, setPage] = useState(1);
  const [exportError, setExportError] = useState<unknown>(null);

  const filters = useMemo<MuxUsageQuery>(() => ({ endpoint: endpoint || undefined, session: session?.id }), [endpoint, session]);
  const callFilters = useMemo<MuxUsageQuery>(() => ({ ...filters, ...(callWindow ?? {}), page, pageSize: PAGE_SIZE }), [filters, callWindow, page]);

  const options = useAsync(() => api.usageFilters(), [api]);
  const sessions = useAsync(() => (pickSession ? api.sessions().then((r) => r.Items ?? []) : Promise.resolve(null)), [api, pickSession]);
  const summary = useAsync(() => api.usageSummary(range, filters), [api, range, filters]);
  const series = useAsync(() => api.usageTimeseries(range, filters).then((r) => r.Items ?? []), [api, range, filters]);
  const splitSeries = useAsync(
    () => (split === 'none' ? Promise.resolve(null) : api.usageSplit(range, split, filters).then((r) => r.Items ?? [])),
    [api, range, split, filters],
  );
  const breakdown = useAsync(() => api.usageBreakdown(range, dimension, filters).then((r) => r.Items ?? []), [api, range, dimension, filters]);
  const errors = useAsync(() => api.usageErrors(range, filters).then((r) => r.Items ?? []), [api, range, filters]);
  const heat = useAsync(() => api.usageHeatmap(range, new Date().getTimezoneOffset(), filters).then((r) => r as Heatmap), [api, range, filters]);
  const events = useAsync(() => api.usageEvents(range, callFilters), [api, range, callFilters]);

  const m = (summary.data?.Metrics ?? {}) as Metrics & Record<string, number>;
  const fmt = (v: number) => (metric === 'cost' ? formatNumber(lang, v, { style: 'currency', currency: 'USD' }) : formatNumber(lang, v));
  const ms = (v?: number) => (v && v > 0 ? formatDuration(lang, v) : '–');

  const chart: StackedChart = useMemo(() => {
    if (split !== 'none' && splitSeries.data) return stackSeries(splitSeries.data, metric);
    const buckets = series.data ?? [];
    return stackSeries([{ Key: t('mobile.usage.' + metric), IsOther: false, Buckets: buckets as SplitSeries['Buckets'] }], metric);
  }, [split, splitSeries.data, series.data, metric, t]);
  const singleColor = split === 'none';
  const chartEmpty = chart.totals.every((v) => v === 0);

  const resetPage =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v);
      setPage(1);
    };
  const changeRange = (r: MuxUsageRange) => {
    setRange(r);
    setCallWindow(null);
    setPage(1);
  };

  const reload = () => {
    void summary.reload();
    void series.reload();
    void splitSeries.reload();
    void breakdown.reload();
    void errors.reload();
    void heat.reload();
    void events.reload();
  };

  const share = async (name: string, csv: string) => {
    setExportError(null);
    try {
      const path = (FileSystem.cacheDirectory ?? '') + name;
      await FileSystem.writeAsStringAsync(path, csv);
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(path, { mimeType: 'text/csv' });
    } catch (e) {
      setExportError(e);
    }
  };

  /** Exports every call that matches the filters (up to 1000), not just the visible page. */
  const exportCalls = async () => {
    try {
      const all = await api.usageEvents(range, { ...filters, ...(callWindow ?? {}), page: 1, pageSize: 1000 });
      await share('mux-usage-calls-' + range + '.csv', eventsToCsv(all.Items ?? []));
    } catch (e) {
      setExportError(e);
    }
  };

  const pickBucket = (i: number) => {
    const w = bucketWindow(chart.starts, i);
    setCallWindow(w);
    setPage(1);
  };

  const hm = heat.data;
  const rows = hm?.Layout?.Rows ?? 0;
  const cols = hm?.Layout?.Columns ?? 0;
  const heatValues = hm?.TotalTokens ?? [];
  const maxHeat = Math.max(0, ...heatValues);
  const heatColors = [p.panelAlt, p.accentSoft, '#6cc596', p.accent, p.accentStrong];
  const pickCell = (index: number) => {
    const start = hm?.Layout?.CellStartsUnixMs?.[index];
    const width = hm?.Layout?.BucketMs;
    if (!start || !width) return;
    setCallWindow({ from: start, to: start + width });
    setPage(1);
  };

  const total = events.data?.TotalCount ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const calls = sortEvents(events.data?.Items ?? [], sort);
  const endpoints = options.data?.Endpoints ?? [];

  return (
    <Screen refreshControl={<RefreshControl refreshing={summary.loading && !!summary.data} onRefresh={reload} />}>
      <Stack.Screen options={{ title: t('mobile.manage.usage') }} />
      {options.data && !options.data.Enabled ? <Notice tone="warning" text={t('mobile.usage.disabled')} /> : null}
      <Segmented
        label={t('mobile.usage.range')}
        value={range}
        onChange={changeRange}
        options={RANGES.map((r) => ({ value: r, label: t('mobile.usage.ranges.' + r) }))}
      />
      {endpoints.length > 0 ? (
        <View style={{ gap: spacing.xs }}>
          <T variant="small" style={{ fontWeight: '600', color: p.text }}>
            {t('mobile.usage.endpoint')}
          </T>
          <Segmented
            scroll
            label={t('mobile.usage.endpoint')}
            value={endpoint}
            onChange={resetPage(setEndpoint)}
            options={[{ value: '', label: t('mobile.common.all') }, ...endpoints.map((e) => ({ value: e, label: e }))]}
          />
        </View>
      ) : null}
      <View style={{ marginHorizontal: -spacing.lg }}>
        <ListRow
          title={t('mobile.usage.conversation')}
          subtitle={session ? session.title : t('mobile.usage.allConversations')}
          onPress={() => setPickSession(true)}
          trailing={session ? <Button compact kind="ghost" title={t('mobile.usage.clear')} onPress={() => resetPage(setSession)(null)} /> : null}
        />
      </View>
      {summary.error ? <ErrorBox error={summary.error} onRetry={reload} /> : null}
      {summary.loading && !summary.data ? <Loading /> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {[
          [t('mobile.usage.calls'), formatNumber(lang, m.Calls ?? 0)],
          [t('mobile.usage.tokens'), formatNumber(lang, m.TotalTokens ?? 0)],
          [t('mobile.usage.cost'), formatNumber(lang, m.CostUsd ?? 0, { style: 'currency', currency: 'USD' })],
          [t('mobile.usage.errorRate'), formatPercent(lang, m.ErrorRate ?? 0)],
        ].map(([label, value]) => (
          <Card key={label} style={{ flexGrow: 1, minWidth: 140 }}>
            <T variant="title">{value}</T>
            <T variant="small">{label}</T>
          </Card>
        ))}
      </View>

      <Section
        title={t('mobile.usage.timeline')}
        action={
          <Button
            compact
            kind="secondary"
            title={t('mobile.usage.exportChart')}
            disabled={chartEmpty}
            onPress={() =>
              void share(
                'mux-usage-chart-' + range + '-' + metric + '.csv',
                chartToCsv(
                  chart.starts,
                  chart.series.map((s) => ({ key: s.key, values: s.values })),
                ),
              )
            }
          />
        }
      >
        <Segmented
          value={metric}
          onChange={setMetric}
          options={(['tokens', 'calls', 'cost'] as UsageMetric[]).map((v) => ({ value: v, label: t('mobile.usage.' + v) }))}
        />
        <T variant="small" style={{ fontWeight: '600', color: p.text }}>
          {t('mobile.usage.splitBy')}
        </T>
        <Segmented
          scroll
          label={t('mobile.usage.splitBy')}
          value={split}
          onChange={setSplit}
          options={SPLITS.map((s) => ({ value: s, label: s === 'none' ? t('mobile.usage.splitNone') : t('mobile.usage.dims.' + s) }))}
        />
        <Segmented
          value={chartKind}
          onChange={setChartKind}
          options={[
            { value: 'bars', label: t('mobile.usage.bars') },
            { value: 'lines', label: t('mobile.usage.lines') },
          ]}
        />
        {chartEmpty && !series.loading ? <Empty title={t('mobile.usage.empty')} /> : null}
        {!chartEmpty ? <UsageChart chart={chart} kind={chartKind} single={singleColor} fmt={fmt} lang={lang} onPick={pickBucket} picked={callWindow} /> : null}
        {!singleColor ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
            {chart.series.map((s) => (
              <View key={s.key} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: s.color }} />
                <T variant="small">{s.isOther ? t('mobile.usage.other') : s.key || t('common.unknown')}</T>
              </View>
            ))}
          </View>
        ) : null}
        {!chartEmpty ? <T variant="small">{t('mobile.usage.tapHint')}</T> : null}
      </Section>

      <Section title={t('mobile.usage.latency')}>
        <KeyValues
          rows={[
            [t('mobile.usage.ttft'), [ms(m.AvgTtftMs), ms(m.P50TtftMs), ms(m.P95TtftMs), ms(m.P99TtftMs)].join(' · ')],
            [t('mobile.usage.totalTime'), [ms(m.AvgTotalMs), ms(m.P50TotalMs), ms(m.P95TotalMs), ms(m.P99TotalMs)].join(' · ')],
            [t('mobile.usage.streaming'), ms(m.AvgStreamMs)],
            [t('mobile.usage.throughput'), m.AvgTokensPerSec ? formatNumber(lang, Math.round(m.AvgTokensPerSec)) : '–'],
          ]}
        />
        <T variant="small">{t('mobile.usage.percentiles')}</T>
      </Section>

      <Section title={t('mobile.usage.breakdown')}>
        <Segmented scroll value={dimension} onChange={setDimension} options={DIMENSIONS.map((d) => ({ value: d, label: t('mobile.usage.dims.' + d) }))} />
        <KeyValues
          rows={(breakdown.data ?? []).map((r) => [String(r.Value || t('common.unknown')), fmt(metricValue(r.Metrics as Metrics, metric))] as [string, string])}
        />
      </Section>
      <Section title={t('mobile.usage.failures')}>
        {(errors.data ?? []).length === 0 ? (
          <T variant="muted">{t('mobile.usage.noFailures')}</T>
        ) : (
          <KeyValues rows={(errors.data ?? []).map((e) => [String(e.ErrorCode), formatNumber(lang, Number(e.Count))] as [string, string])} />
        )}
      </Section>
      {rows > 0 && cols > 0 ? (
        <Section title={t('mobile.usage.heatmap')}>
          <ScrollView horizontal style={{ direction: 'ltr' }}>
            <View style={{ gap: 2 }}>
              {Array.from({ length: rows }).map((_, r) => (
                <View key={r} style={{ flexDirection: 'row', gap: 2, alignItems: 'center' }}>
                  <T variant="small" style={{ width: 44 }} numberOfLines={1}>
                    {hm?.Layout?.RowLabels?.[r] ?? ''}
                  </T>
                  {Array.from({ length: cols }).map((__, c) => {
                    const index = r * cols + c;
                    const v = heatValues[index] ?? 0;
                    const start = hm?.Layout?.CellStartsUnixMs?.[index];
                    return (
                      <Pressable
                        key={c}
                        onPress={() => pickCell(index)}
                        disabled={!start}
                        hitSlop={2}
                        accessibilityRole="button"
                        accessibilityLabel={(start ? formatDateTime(lang, start) + ': ' : '') + formatNumber(lang, v) + ' ' + t('mobile.usage.tokens')}
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: radius.sm / 3,
                          backgroundColor: heatColors[heatLevel(v, maxHeat)],
                          borderWidth: callWindow && start === callWindow.from ? 2 : 0,
                          borderColor: p.text,
                        }}
                      />
                    );
                  })}
                </View>
              ))}
            </View>
          </ScrollView>
        </Section>
      ) : null}

      <Section
        title={t('mobile.usage.history')}
        action={<Button compact kind="secondary" title={t('mobile.usage.exportCsv')} onPress={() => void exportCalls()} disabled={total === 0} />}
      >
        {exportError ? <ErrorBox error={exportError} /> : null}
        {callWindow ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
            <T variant="small" style={{ flex: 1 }}>
              {t('mobile.usage.window', { from: formatDateTime(lang, callWindow.from), to: formatDateTime(lang, callWindow.to) })}
            </T>
            <Button compact kind="ghost" title={t('mobile.usage.clear')} onPress={() => resetPage(setCallWindow)(null)} />
          </View>
        ) : null}
        <T variant="small" style={{ fontWeight: '600', color: p.text }}>
          {t('mobile.usage.sort')}
        </T>
        <Segmented
          scroll
          label={t('mobile.usage.sort')}
          value={sort}
          onChange={setSort}
          options={SORTS.map((s) => ({ value: s, label: t('mobile.usage.sorts.' + s) }))}
        />
        {events.error ? <ErrorBox error={events.error} onRetry={() => void events.reload()} /> : null}
        {events.loading && !events.data ? <Loading /> : null}
        {calls.length === 0 && !events.loading ? <T variant="muted">{t('mobile.usage.noCalls')}</T> : null}
        {calls.map((e) => (
          <Card key={String(e.Id)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <T style={{ fontWeight: '600', flex: 1 }} numberOfLines={1}>
                {[e.Model, e.EndpointName].filter(Boolean).join(' · ')}
              </T>
              {e.Success === false ? (
                <T variant="small" style={{ color: p.danger }}>
                  {String(e.ErrorCode || t('mobile.status.error'))}
                </T>
              ) : null}
            </View>
            <T variant="small">
              {[
                formatDateTime(lang, Number(e.TimestampUnixMs)),
                String(e.CallKind ?? ''),
                t('mobile.chat.tokens', { count: formatNumber(lang, Number(e.TotalTokens ?? 0) || Number(e.InputTokens ?? 0) + Number(e.OutputTokens ?? 0)) }),
                e.TotalMs ? ms(Number(e.TotalMs)) : '',
              ]
                .filter(Boolean)
                .join(' · ')}
            </T>
          </Card>
        ))}
        {total > PAGE_SIZE ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Button compact kind="secondary" title={t('mobile.usage.previous')} disabled={page <= 1} onPress={() => setPage(page - 1)} />
            <T variant="small" style={{ flex: 1, textAlign: 'center' }}>
              {t('mobile.usage.pageOf', { page, pages, total: formatNumber(lang, total) })}
            </T>
            <Button compact kind="secondary" title={t('mobile.usage.next')} disabled={page >= pages} onPress={() => setPage(page + 1)} />
          </View>
        ) : null}
      </Section>

      <Sheet visible={pickSession} title={t('mobile.usage.conversation')} onClose={() => setPickSession(false)}>
        <View style={{ marginHorizontal: -spacing.lg }}>
          <ListRow
            title={t('mobile.usage.allConversations')}
            selected={!session}
            onPress={() => {
              resetPage(setSession)(null);
              setPickSession(false);
            }}
          />
          {sessions.loading ? <Loading /> : null}
          {(sessions.data ?? []).map((s) => (
            <ListRow
              key={s.Id}
              title={s.Title || t('conversations.untitled')}
              subtitle={s.UpdatedUtc ? formatDateTime(lang, s.UpdatedUtc) : undefined}
              selected={session?.id === s.Id}
              onPress={() => {
                resetPage(setSession)({ id: s.Id, title: s.Title || t('conversations.untitled') });
                setPickSession(false);
              }}
            />
          ))}
        </View>
      </Sheet>
    </Screen>
  );
}

/**
 * The timeline chart: stacked bars or one line per series, oldest bucket on the left in every layout direction (time
 * axes do not mirror). Bars share the width; when they cannot fit, the chart scrolls and opens at the latest bucket.
 */
function UsageChart({
  chart,
  kind,
  single,
  fmt,
  lang,
  onPick,
  picked,
}: {
  chart: StackedChart;
  kind: 'bars' | 'lines';
  single: boolean;
  fmt: (v: number) => string;
  lang: string;
  onPick: (i: number) => void;
  picked: { from: number; to: number } | null;
}) {
  const p = useTheme();
  const scroll = useRef<ScrollViewInstance>(null);
  const [width, setWidth] = useState(0);
  const n = chart.starts.length;
  const gap = n > 60 ? 1 : 3;
  const barWidth = width > 0 ? Math.max(3, Math.min(16, Math.floor((width - gap * (n - 1)) / n))) : 10;
  const innerWidth = Math.max(width, n * barWidth + gap * (n - 1));
  const max = Math.max(0, ...(kind === 'bars' ? chart.totals : chart.series.flatMap((s) => s.values)));
  const color = (c: string) => (single ? p.accent : c);
  const label = (i: number) => formatDateTime(lang, chart.starts[i]) + ': ' + fmt(chart.totals[i]);

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ direction: 'ltr' }}>
      <ScrollView horizontal ref={scroll} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}>
        <View style={{ width: innerWidth, height: CHART_HEIGHT + spacing.sm * 2, paddingVertical: spacing.sm }}>
          {kind === 'lines'
            ? chart.series.map((s) => {
                const pts = linePoints(s.values, (n - 1) * (barWidth + gap), CHART_HEIGHT, max);
                return pts.slice(1).map((b, i) => {
                  const a = pts[i];
                  const dx = b.x - a.x;
                  const dy = b.y - a.y;
                  const len = Math.sqrt(dx * dx + dy * dy);
                  return (
                    <View
                      key={s.key + i}
                      pointerEvents="none"
                      style={{
                        position: 'absolute',
                        left: barWidth / 2 + (a.x + b.x) / 2 - len / 2,
                        top: spacing.sm + (a.y + b.y) / 2 - 1,
                        width: len,
                        height: 2,
                        backgroundColor: color(s.color),
                        transform: [{ rotate: Math.atan2(dy, dx) + 'rad' }],
                      }}
                    />
                  );
                });
              })
            : null}
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: CHART_HEIGHT, gap }}>
            {chart.starts.map((start, i) => {
              const selected = picked !== null && start >= picked.from && start < picked.to;
              return (
                <Pressable
                  key={start}
                  onPress={() => onPick(i)}
                  accessibilityRole="button"
                  accessibilityLabel={label(i)}
                  style={{ width: barWidth, height: CHART_HEIGHT, justifyContent: 'flex-end', opacity: picked && !selected ? 0.45 : 1 }}
                >
                  {kind === 'bars' ? (
                    chart.totals[i] > 0 ? (
                      [...chart.series]
                        .reverse()
                        .map((s) =>
                          s.values[i] > 0 ? (
                            <View key={s.key} style={{ height: Math.max(1, (s.values[i] / max) * CHART_HEIGHT), backgroundColor: color(s.color) }} />
                          ) : null,
                        )
                    ) : (
                      <View style={{ height: 2, backgroundColor: p.line, borderRadius: 1 }} />
                    )
                  ) : (
                    <View style={{ height: '100%', backgroundColor: selected ? p.accentSoft : 'transparent', opacity: 0.6 }} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
