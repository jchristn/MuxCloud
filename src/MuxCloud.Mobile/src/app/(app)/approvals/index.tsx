import { useCallback, useEffect } from 'react';
import { RefreshControl, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { formatRelativeTime, mapWithConcurrency } from '@dashboard/lib';
import { Badge, Card, Empty, Loading, Notice, Screen, Section, T } from '@/components/ui';
import { muxApi } from '@/relay/muxApi';
import { useAccount } from '@/state/AccountContext';
import { useAuth } from '@/state/AuthContext';
import { useAsync } from '@/state/useAsync';
import type { MuxRunSummary } from '@/types/mux';
import { spacing } from '@/theme/palette';

interface Waiting {
  machineId: string;
  machineName: string;
  run: MuxRunSummary;
}

/**
 * Every run waiting for a tool approval, across machines. The machine list reports counts live; this screen asks each
 * of those machines for its runs and lists the ones awaiting approval. Opening one shows the prompt in its conversation.
 */
export default function Approvals() {
  const { t, i18n } = useTranslation();
  const { auth } = useAuth();
  const { machines, onEvent } = useAccount();
  const pendingMachines = machines.filter((m) => m.online && m.awaitingApproval > 0);
  const key = pendingMachines.map((m) => m.id + ':' + m.awaitingApproval).join(',');
  const load = useCallback(async (): Promise<Waiting[]> => {
    const lists = await mapWithConcurrency(pendingMachines, 4, async (m) => {
      try {
        const runs = await muxApi(auth.client, m.id).runs();
        return (runs.Items ?? []).filter((r) => !r.IsTerminal && /approval/i.test(r.Status)).map((run) => ({ machineId: m.id, machineName: m.name, run }));
      } catch {
        return [] as Waiting[];
      }
    });
    return lists.flat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth, key]);
  const waiting = useAsync(load, [load]);

  const { reload } = waiting;
  useEffect(
    () =>
      onEvent((e) => {
        if (e.type === 'machine.updated') void reload();
      }),
    [onEvent, reload],
  );

  return (
    <Screen refreshControl={<RefreshControl refreshing={waiting.loading && !!waiting.data} onRefresh={() => void waiting.reload()} />}>
      <Stack.Screen options={{ title: t('mobile.approvals.title') }} />
      <T variant="muted">{t('mobile.approvals.intro')}</T>
      {machines.some((m) => m.online && !m.remoteToolApproval) ? <Notice tone="warning" text={t('mobile.approvals.someOff')} /> : null}
      {waiting.loading && !waiting.data && pendingMachines.length > 0 ? <Loading /> : null}
      {pendingMachines.length === 0 ? <Empty title={t('mobile.approvals.empty')} body={t('mobile.approvals.emptyBody')} /> : null}
      <Section title={t('mobile.approvals.waiting')}>
        <View style={{ gap: spacing.sm }}>
          {(waiting.data ?? []).map((w) => (
            <Card
              key={w.machineId + '/' + w.run.RunId}
              onPress={() => router.push({ pathname: '/machines/[machineId]/conversation/[sessionId]', params: { machineId: w.machineId, sessionId: w.run.SessionId } })}
              accessibilityLabel={t('mobile.approvals.open', { name: w.machineName })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                <T variant="title" style={{ flex: 1 }}>
                  {w.machineName}
                </T>
                <Badge tone="warning" label={t('machines.statusApproval')} />
              </View>
              <T variant="small">{[w.run.EndpointName, w.run.Model, formatRelativeTime(i18n.language, w.run.StartedUtc)].filter(Boolean).join(' · ')}</T>
            </Card>
          ))}
        </View>
      </Section>
    </Screen>
  );
}
