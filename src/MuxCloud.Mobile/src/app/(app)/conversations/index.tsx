import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, View } from 'react-native';
import { router, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { filterConversations, formatRelativeTime, mapWithConcurrency, mergeConversations, type MachineLoadResult } from '@dashboard/lib';
import { relayApi } from '@dashboard/api';
import { Empty, ErrorBox, Field, ListRow, Loading, Notice, Screen, Segmented } from '@/components/ui';
import { useAccount } from '@/state/AccountContext';
import { useAuth } from '@/state/AuthContext';
import { useAsync } from '@/state/useAsync';
import { spacing } from '@/theme/palette';

/** Conversations from every online machine, filterable by machine (fans out GET /m/{id}/v1.0/api/sessions). */
export default function AllConversations() {
  const { t, i18n } = useTranslation();
  const { auth } = useAuth();
  const { machines } = useAccount();
  const online = useMemo(() => machines.filter((m) => m.online && !m.revoked), [machines]);
  const offline = useMemo(() => machines.filter((m) => !m.online && !m.revoked), [machines]);
  const [machineId, setMachineId] = useState('');
  const [search, setSearch] = useState('');
  const onlineKey = online.map((m) => m.id).join(',');
  const load = useCallback(
    () =>
      mapWithConcurrency(online, 4, async (machine): Promise<MachineLoadResult> => {
        try {
          const r = await relayApi.sessions(auth.client, machine.id);
          return { machine, sessions: r.Items ?? [], errorCode: null };
        } catch (e) {
          return { machine, sessions: null, errorCode: (e as { code?: string }).code ?? 'generic' };
        }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [auth, onlineKey],
  );
  const results = useAsync(load, [load]);
  const rows = useMemo(() => filterConversations(mergeConversations(results.data ?? []), machineId, search), [results.data, machineId, search]);
  const failed = (results.data ?? []).filter((r) => r.errorCode);

  return (
    <Screen refreshControl={<RefreshControl refreshing={results.loading && !!results.data} onRefresh={() => void results.reload()} />}>
      <Stack.Screen options={{ title: t('conversations.title') }} />
      <Field label={t('common.search')} placeholder={t('conversations.searchPlaceholder')} value={search} onChangeText={setSearch} autoCapitalize="none" autoCorrect={false} />
      {online.length > 1 ? (
        <Segmented label={t('conversations.machineFilter')} value={machineId} onChange={setMachineId} options={[{ value: '', label: t('conversations.allMachines') }, ...online.map((m) => ({ value: m.id, label: m.name }))]} />
      ) : null}
      {online.length === 0 ? <Empty title={t('conversations.noOnline')} /> : null}
      {offline.length > 0 ? <Notice text={t('conversations.offlineSkipped', { names: offline.map((m) => m.name).join(', ') })} /> : null}
      {failed.map((f) => (
        <ErrorBox key={f.machine.id} error={new Error(t('conversations.machineFailed', { name: f.machine.name }))} />
      ))}
      {results.loading && !results.data && online.length > 0 ? <Loading label={t('conversations.loadingMachines', { count: online.length })} /> : null}
      {results.data && rows.length === 0 && online.length > 0 ? <Empty title={search || machineId ? t('conversations.noMatches') : t('conversations.emptyTitle')} body={t('conversations.emptyBody')} /> : null}
      <View style={{ marginHorizontal: -spacing.lg }}>
        {rows.map((row) => (
          <ListRow
            key={row.key}
            title={row.session.Title || t('conversations.untitled')}
            subtitle={[row.machineName, row.session.Model, row.session.UpdatedUtc ? formatRelativeTime(i18n.language, row.session.UpdatedUtc) : ''].filter(Boolean).join(' · ')}
            onPress={() => router.push({ pathname: '/machines/[machineId]/conversation/[sessionId]', params: { machineId: row.machineId, sessionId: row.session.Id } })}
          />
        ))}
      </View>
    </Screen>
  );
}
