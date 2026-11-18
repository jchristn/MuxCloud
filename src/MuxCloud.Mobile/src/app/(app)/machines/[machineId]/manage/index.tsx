import { RefreshControl, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Badge, Card, ErrorBox, KeyValues, ListRow, Loading, Notice, Screen, Section, T } from '@/components/ui';
import { COLLECTIONS, SCREENS } from '@/lib/resources';
import { useAccount } from '@/state/AccountContext';
import { useAsync } from '@/state/useAsync';
import { useMachineApi } from '@/state/useMachineApi';
import { spacing } from '@/theme/palette';

/** The machine's home (mux dashboard Home view) and the menu of everything else the local dashboard manages. */
export default function Manage() {
  const { machineId } = useLocalSearchParams<{ machineId: string }>();
  const { t } = useTranslation();
  const { machine } = useAccount();
  const api = useMachineApi(machineId);
  const overview = useAsync(() => api.overview(), [api]);
  const o = overview.data;
  const go = (resource: string) => router.push({ pathname: '/machines/[machineId]/manage/[resource]', params: { machineId, resource } });
  const kpi: [string, string, string][] = o
    ? [
        [t('mobile.manage.endpoints'), String(o.Endpoints), 'endpoints'],
        [t('mobile.manage.mcp'), String(o.McpServers), 'mcp'],
        [t('mobile.manage.prompts'), String(o.Prompts), 'prompts'],
        [t('mobile.manage.subagents'), String(o.Subagents), 'subagents'],
        [t('mobile.manage.skills'), o.SkillsEnabled + ' / ' + o.SkillsTotal, 'skills'],
        [t('mobile.manage.hooks'), String(o.Hooks + o.Commands), 'hooks'],
        [t('mobile.manage.keybindings'), String(o.Keybindings), 'keybindings'],
        [t('conversations.title'), String(o.Sessions), ''],
      ]
    : [];

  return (
    <Screen refreshControl={<RefreshControl refreshing={overview.loading && !!o} onRefresh={() => void overview.reload()} />}>
      <Stack.Screen options={{ title: t('mobile.machine.manage') }} />
      <T variant="muted">{machine(machineId)?.name}</T>
      {overview.loading && !o ? <Loading /> : null}
      {overview.error ? <ErrorBox error={overview.error} onRetry={() => void overview.reload()} /> : null}
      {o ? (
        <>
          {o.Notices.map((n, i) => (
            <Notice key={i} tone={n.Level === 'warning' ? 'warning' : n.Level === 'success' ? 'success' : 'info'} text={n.Text} />
          ))}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {kpi.map(([label, value, target]) => (
              <Card key={label} style={{ minWidth: 140, flexGrow: 1 }} onPress={target ? () => go(target) : () => router.back()} accessibilityLabel={label + ' ' + value}>
                <T variant="heading">{value}</T>
                <T variant="small">{label}</T>
              </Card>
            ))}
          </View>
          <Section title={t('mobile.manage.defaultEndpoint')}>
            <Card onPress={() => go('endpoints')}>
              {o.DefaultEndpoint ? (
                <>
                  <T variant="title">{o.DefaultEndpoint}</T>
                  <T variant="small">{[o.DefaultAdapter, o.DefaultModel].filter(Boolean).join(' · ')}</T>
                </>
              ) : (
                <T variant="muted">{t('mobile.manage.noDefault')}</T>
              )}
            </Card>
          </Section>
          <Section title={t('mobile.manage.environment')}>
            <KeyValues
              rows={[
                [t('mobile.manage.version'), o.Version],
                [t('mobile.manage.uptime'), o.Uptime],
                [t('mobile.manage.activePrompt'), o.ActivePrompt || t('common.none')],
                [t('mobile.manage.auth'), o.AuthEnabled ? t('common.enabled') : t('common.disabled')],
                [t('mobile.manage.configDir'), o.ConfigDir],
              ]}
            />
          </Section>
        </>
      ) : null}
      <Section title={t('mobile.manage.configure')}>
        <View style={{ marginHorizontal: -spacing.lg }}>
          {COLLECTIONS.map((c) => (
            <ListRow key={c.segment} title={t(c.titleKey)} subtitle={t(c.introKey)} onPress={() => go(c.segment)} />
          ))}
          {SCREENS.map((segment) => (
            <ListRow key={segment} title={t('mobile.manage.' + segment)} subtitle={t('mobile.manage.' + segment + 'Intro')} onPress={() => go(segment)} trailing={segment === 'settings' ? <Badge label={t('mobile.manage.cloudIncluded')} tone="info" /> : null} />
          ))}
        </View>
      </Section>
    </Screen>
  );
}
