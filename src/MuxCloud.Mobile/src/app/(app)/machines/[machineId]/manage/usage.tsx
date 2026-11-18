import { useRef, useState } from 'react';
import { RefreshControl, ScrollView, View, type ScrollViewInstance } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { formatDateTime, formatNumber, formatPercent } from '@dashboard/lib';
import { Button, Card, Empty, ErrorBox, KeyValues, Loading, Notice, Screen, Section, Segmented, T } from '@/components/ui';
import { barFractions, eventsToCsv, heatLevel, metricValue, type Metrics, type UsageMetric } from '@/lib/usage';
import { useAsync } from '@/state/useAsync';
import { useMachineApi } from '@/state/useMachineApi';
import type { MuxUsageRange } from '@/types/mux';
import { useTheme } from '@/theme/ThemeContext';
import { radius, spacing } from '@/theme/palette';

const RANGES: MuxUsageRange[] = ['hour', 'day', 'week', 'month', 'quarter', 'year', 'all'];
const DIMENSIONS = ['model', 'endpoint', 'provider', 'callkind'];

interface Heatmap {
  Layout?: { Rows?: number; Columns?: number; RowLabels?: string[]; ColumnLabels?: string[] };
  TotalTokens?: number[];
}

/** Usage analytics for the machine: totals, timeline, breakdown, failures, heatmap, and call history with CSV export. */
export default function Usage() {
  const { machineId } = useLocalSearchParams<{ machineId: string }>();
  const { t, i18n } = useTranslation();
  const p = useTheme();
  const api = useMachineApi(machineId);
  const [range, setRange] = useState<MuxUsageRange>('day');
  const [metric, setMetric] = useState<UsageMetric>('tokens');
  const [dimension, setDimension] = useState('model');
  const filters = useAsync(() => api.usageFilters(), [api]);
  const summary = useAsync(() => api.usageSummary(range), [api, range]);
  const series = useAsync(() => api.usageTimeseries(range).then((r) => r.Items ?? []), [api, range]);
  const breakdown = useAsync(() => api.usageBreakdown(range, dimension).then((r) => r.Items ?? []), [api, range, dimension]);
  const errors = useAsync(() => api.usageErrors(range).then((r) => r.Items ?? []), [api, range]);
  const heat = useAsync(() => api.usageHeatmap(range, new Date().getTimezoneOffset()).then((r) => r as Heatmap), [api, range]);
  const events = useAsync(() => api.usageEvents(range).then((r) => (r.Items ?? []) as Record<string, unknown>[]), [api, range]);
  const [exportError, setExportError] = useState<unknown>(null);
  const lang = i18n.language;

  const m = (summary.data?.Metrics ?? {}) as Metrics;
  const buckets = series.data ?? [];
  const [chartWidth, setChartWidth] = useState(0);
  const chartScroll = useRef<ScrollViewInstance>(null);
  const barGap = buckets.length > 60 ? 1 : 3;
  const barWidth = chartWidth > 0 && buckets.length > 0 ? Math.max(2, Math.min(16, Math.floor((chartWidth - barGap * (buckets.length - 1)) / buckets.length))) : 10;
  const fractions = barFractions(buckets.map((b) => metricValue(b.Metrics as Metrics, metric)));
  const fmt = (v: number) => (metric === 'cost' ? formatNumber(lang, v, { style: 'currency', currency: 'USD' }) : formatNumber(lang, v));
  const reload = () => {
    void summary.reload();
    void series.reload();
    void breakdown.reload();
    void errors.reload();
    void heat.reload();
    void events.reload();
  };

  const exportCsv = async () => {
    setExportError(null);
    try {
      const path = (FileSystem.cacheDirectory ?? '') + 'mux-usage-' + range + '.csv';
      await FileSystem.writeAsStringAsync(path, eventsToCsv(events.data ?? []));
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(path, { mimeType: 'text/csv' });
    } catch (e) {
      setExportError(e);
    }
  };

  const hm = heat.data;
  const rows = hm?.Layout?.Rows ?? 0;
  const cols = hm?.Layout?.Columns ?? 0;
  const values = hm?.TotalTokens ?? [];
  const maxHeat = Math.max(0, ...values);
  const heatColors = [p.panelAlt, p.accentSoft, '#6cc596', p.accent, p.accentStrong];

  return (
    <Screen refreshControl={<RefreshControl refreshing={summary.loading && !!summary.data} onRefresh={reload} />}>
      <Stack.Screen options={{ title: t('mobile.manage.usage') }} />
      {filters.data && !filters.data.Enabled ? <Notice tone="warning" text={t('mobile.usage.disabled')} /> : null}
      <Segmented label={t('mobile.usage.range')} value={range} onChange={setRange} options={RANGES.map((r) => ({ value: r, label: t('mobile.usage.ranges.' + r) }))} />
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
      <Section title={t('mobile.usage.timeline')}>
        <Segmented value={metric} onChange={setMetric} options={(['tokens', 'calls', 'cost'] as UsageMetric[]).map((v) => ({ value: v, label: t('mobile.usage.' + v) }))} />
        {buckets.length === 0 && !series.loading ? <Empty title={t('mobile.usage.empty')} /> : null}
        {/* Bars share the available width (a day is 96 buckets); when they cannot fit, the chart scrolls and opens
            at the latest bucket, where recent activity is. */}
        <View onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}>
          <ScrollView horizontal ref={chartScroll} onContentSizeChange={() => chartScroll.current?.scrollToEnd({ animated: false })} accessibilityLabel={t('mobile.usage.timeline')}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 140, gap: barGap, paddingVertical: spacing.sm }}>
              {buckets.map((b, i) => (
                <View
                  key={String(b.BucketStartUnixMs ?? i)}
                  accessible
                  accessibilityLabel={formatDateTime(lang, Number(b.BucketStartUnixMs)) + ': ' + fmt(metricValue(b.Metrics as Metrics, metric))}
                  style={{ width: barWidth, height: Math.max(2, fractions[i] * 120), backgroundColor: fractions[i] > 0 ? p.accent : p.line, borderRadius: 2 }}
                />
              ))}
            </View>
          </ScrollView>
        </View>
      </Section>
      <Section title={t('mobile.usage.breakdown')}>
        <Segmented value={dimension} onChange={setDimension} options={DIMENSIONS.map((d) => ({ value: d, label: t('mobile.usage.dims.' + d) }))} />
        <KeyValues rows={(breakdown.data ?? []).map((r) => [String(r.Value || t('common.unknown')), fmt(metricValue(r.Metrics as Metrics, metric))] as [string, string])} />
      </Section>
      <Section title={t('mobile.usage.failures')}>
        {(errors.data ?? []).length === 0 ? <T variant="muted">{t('mobile.usage.noFailures')}</T> : <KeyValues rows={(errors.data ?? []).map((e) => [String(e.ErrorCode), formatNumber(lang, Number(e.Count))] as [string, string])} />}
      </Section>
      {rows > 0 && cols > 0 ? (
        <Section title={t('mobile.usage.heatmap')}>
          <ScrollView horizontal>
            <View style={{ gap: 2 }}>
              {Array.from({ length: rows }).map((_, r) => (
                <View key={r} style={{ flexDirection: 'row', gap: 2, alignItems: 'center' }}>
                  <T variant="small" style={{ width: 44 }} numberOfLines={1}>
                    {hm?.Layout?.RowLabels?.[r] ?? ''}
                  </T>
                  {Array.from({ length: cols }).map((__, c) => {
                    const v = values[r * cols + c] ?? 0;
                    return <View key={c} style={{ width: 12, height: 12, borderRadius: radius.sm / 3, backgroundColor: heatColors[heatLevel(v, maxHeat)] }} />;
                  })}
                </View>
              ))}
            </View>
          </ScrollView>
        </Section>
      ) : null}
      <Section title={t('mobile.usage.history')} action={<Button compact kind="secondary" title={t('mobile.usage.exportCsv')} onPress={() => void exportCsv()} disabled={(events.data ?? []).length === 0} />}>
        {exportError ? <ErrorBox error={exportError} /> : null}
        {(events.data ?? []).slice(0, 50).map((e) => (
          <Card key={String(e.Id)}>
            <T style={{ fontWeight: '600' }}>{[e.Model, e.EndpointName].filter(Boolean).join(' · ')}</T>
            <T variant="small">
              {[formatDateTime(lang, Number(e.TimestampUnixMs)), e.CallKind, formatNumber(lang, Number(e.InputTokens ?? 0) + Number(e.OutputTokens ?? 0)) + ' ' + t('mobile.usage.tokens'), e.ErrorCode ? String(e.ErrorCode) : '']
                .filter(Boolean)
                .join(' · ')}
            </T>
          </Card>
        ))}
      </Section>
    </Screen>
  );
}
