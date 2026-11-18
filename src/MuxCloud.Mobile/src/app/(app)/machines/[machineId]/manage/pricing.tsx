import { useState } from 'react';
import { RefreshControl, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button, Card, ErrorBox, Field, Loading, Notice, Screen, T } from '@/components/ui';
import { useAsync } from '@/state/useAsync';
import { useMachineApi } from '@/state/useMachineApi';
import type { MuxPricingModel } from '@/types/mux';
import { spacing } from '@/theme/palette';

interface Row {
  model: string;
  input: string;
  cached: string;
  output: string;
}

/** Model pricing (USD per million tokens), used for the cost figures in usage analytics. */
export default function Pricing() {
  const { machineId } = useLocalSearchParams<{ machineId: string }>();
  const { t } = useTranslation();
  const api = useMachineApi(machineId);
  const table = useAsync(() => api.pricing(), [api]);
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [saved, setSaved] = useState(false);

  // Rebuild the editable rows whenever a new table arrives (adjusted during render, not in an effect).
  const [seenTable, setSeenTable] = useState(table.data);
  if (table.data !== seenTable) {
    setSeenTable(table.data);
    if (table.data) {
      setRows(
        Object.entries(table.data.models ?? {}).map(([model, v]) => ({ model, input: String(v.inputPerMTok ?? 0), cached: String(v.cachedInputPerMTok ?? 0), output: String(v.outputPerMTok ?? 0) })),
      );
    }
  }

  const save = async () => {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const models: Record<string, MuxPricingModel> = {};
      for (const r of rows) {
        if (!r.model.trim()) continue;
        models[r.model.trim()] = { inputPerMTok: Number(r.input) || 0, cachedInputPerMTok: Number(r.cached) || 0, outputPerMTok: Number(r.output) || 0 };
      }
      const next = await api.savePricing({ version: table.data?.version ?? '', models });
      table.setData(next);
      setSaved(true);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  const set = (index: number, patch: Partial<Row>) => setRows((list) => list.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  return (
    <Screen refreshControl={<RefreshControl refreshing={table.loading && !!table.data} onRefresh={() => void table.reload()} />}>
      <Stack.Screen options={{ title: t('mobile.manage.pricing') }} />
      <T variant="muted">{t('mobile.manage.pricingIntro')}</T>
      {table.loading && !table.data ? <Loading /> : null}
      {table.error ? <ErrorBox error={table.error} onRetry={() => void table.reload()} /> : null}
      {rows.map((r, i) => (
        <Card key={i}>
          <Field label={t('mobile.pricing.model')} value={r.model} onChangeText={(model) => set(i, { model })} autoCapitalize="none" />
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <Field label={t('mobile.pricing.input')} value={r.input} keyboardType="decimal-pad" onChangeText={(input) => set(i, { input })} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label={t('mobile.pricing.cached')} value={r.cached} keyboardType="decimal-pad" onChangeText={(cached) => set(i, { cached })} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label={t('mobile.pricing.output')} value={r.output} keyboardType="decimal-pad" onChangeText={(output) => set(i, { output })} />
            </View>
          </View>
          <Button title={t('common.delete')} kind="ghost" compact onPress={() => setRows((list) => list.filter((_, j) => j !== i))} />
        </Card>
      ))}
      <Button title={t('mobile.pricing.add')} kind="secondary" onPress={() => setRows((list) => [...list, { model: '', input: '0', cached: '0', output: '0' }])} />
      {error ? <ErrorBox error={error} /> : null}
      {saved ? <Notice tone="success" text={t('mobile.manage.saved')} /> : null}
      <Button title={busy ? t('common.saving') : t('common.save')} busy={busy} onPress={() => void save()} disabled={!table.data} />
    </Screen>
  );
}
