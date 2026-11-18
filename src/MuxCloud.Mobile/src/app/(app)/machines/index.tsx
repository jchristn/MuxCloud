import { useMemo, useState } from 'react';
import { RefreshControl, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { machineTotals } from '@dashboard/lib';
import { MachineRow } from '@/components/MachineRow';
import { RemoteNotice } from '@/components/RemoteNotice';
import { Button, Card, Empty, ErrorBox, Field, Loading, Screen, Segmented, T } from '@/components/ui';
import { useAccount } from '@/state/AccountContext';
import { spacing } from '@/theme/palette';

type StateFilter = 'all' | 'online' | 'offline';

/** Every machine on the account with live online and offline state. */
export default function Machines() {
  const { t } = useTranslation();
  const { machines, loading, error, refresh, liveState } = useAccount();
  const [search, setSearch] = useState('');
  const [state, setState] = useState<StateFilter>('all');
  const totals = machineTotals(machines);
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return machines.filter((m) => {
      if (m.revoked) return false;
      if (state === 'online' && !m.online) return false;
      if (state === 'offline' && m.online) return false;
      return !term || [m.name, m.hostname, m.os].join(' ').toLowerCase().includes(term);
    });
  }, [machines, search, state]);

  return (
    <Screen refreshControl={<RefreshControl refreshing={loading && machines.length > 0} onRefresh={() => void refresh()} />}>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Card style={{ flex: 1 }}>
          <T variant="heading">{totals.online + ' / ' + totals.total}</T>
          <T variant="small">{t('machines.kpiOnline')}</T>
        </Card>
        <Card style={{ flex: 1 }}>
          <T variant="heading">{String(totals.activeRuns)}</T>
          <T variant="small">{t('machines.kpiActiveRuns')}</T>
        </Card>
        <Card style={{ flex: 1 }}>
          <T variant="heading">{String(totals.awaitingApproval)}</T>
          <T variant="small">{t('machines.kpiAwaiting')}</T>
        </Card>
      </View>
      {liveState !== 'open' && !loading ? <T variant="small">{t('mobile.machine.liveReconnecting')}</T> : null}
      <Field label={t('common.search')} placeholder={t('machines.searchPlaceholder')} value={search} onChangeText={setSearch} autoCapitalize="none" autoCorrect={false} />
      <Segmented
        label={t('machines.stateFilter')}
        value={state}
        onChange={setState}
        options={[
          { value: 'all', label: t('machines.stateAll') },
          { value: 'online', label: t('machines.stateOnline') },
          { value: 'offline', label: t('machines.stateOffline') },
        ]}
      />
      {error ? <ErrorBox error={error} onRetry={() => void refresh()} /> : null}
      {loading && machines.length === 0 ? <Loading /> : null}
      {!loading && machines.length === 0 ? (
        <Empty title={t('machines.emptyTitle')} body={t('machines.emptyBody')} action={<Button title={t('machines.addMachine')} onPress={() => router.push('/account/add-machine')} />} />
      ) : null}
      {machines.length > 0 && visible.length === 0 ? <Empty title={t('machines.noMatches')} /> : null}
      <View style={{ marginHorizontal: -spacing.lg }}>
        {visible.map((m) => (
          <MachineRow key={m.id} machine={m} onPress={() => router.push({ pathname: '/machines/[machineId]', params: { machineId: m.id } })} />
        ))}
      </View>
      {machines.length > 0 ? <Button title={t('machines.addMachine')} kind="secondary" onPress={() => router.push('/account/add-machine')} /> : null}
      <RemoteNotice />
    </Screen>
  );
}
