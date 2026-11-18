import { useState } from 'react';
import { View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { formatRelativeTime } from '@dashboard/lib';
import { Badge, Button, Empty, ErrorBox, Field, ListRow, Loading, Screen, Section, T } from '@/components/ui';
import { useAccount } from '@/state/AccountContext';
import { useAsync } from '@/state/useAsync';
import { useMachineApi } from '@/state/useMachineApi';
import { spacing } from '@/theme/palette';

/**
 * Start a conversation: pick the endpoint and model (GET /endpoints) and the working directory (suggestions from GET
 * /workspaces, or type any folder on the machine; the machine checks that it exists).
 */
export default function NewConversation() {
  const { machineId } = useLocalSearchParams<{ machineId: string }>();
  const { t, i18n } = useTranslation();
  const { machine } = useAccount();
  const api = useMachineApi(machineId);
  const endpoints = useAsync(() => api.endpoints().then((r) => r.Items ?? []), [api]);
  const workspaces = useAsync(() => api.workspaces().then((r) => r.Items ?? []).catch(() => []), [api]);
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [cwd, setCwd] = useState('');
  const m = machine(machineId);
  const chosen = endpoint ?? endpoints.data?.find((e) => e.IsDefault)?.Name ?? endpoints.data?.[0]?.Name ?? '';

  return (
    <Screen>
      <Stack.Screen options={{ title: t('conversations.newConversation') }} />
      {m ? <T variant="muted">{m.name}</T> : null}
      <Section title={t('mobile.new.endpoint')}>
        {endpoints.loading ? <Loading /> : null}
        {endpoints.error ? <ErrorBox error={endpoints.error} onRetry={() => void endpoints.reload()} /> : null}
        {endpoints.data && endpoints.data.length === 0 ? (
          <Empty
            title={t('mobile.chat.noEndpoint')}
            action={<Button title={t('mobile.new.addEndpoint')} onPress={() => router.push({ pathname: '/machines/[machineId]/manage/[resource]', params: { machineId, resource: 'endpoints' } })} />}
          />
        ) : null}
        <View style={{ marginHorizontal: -spacing.lg }}>
          {(endpoints.data ?? []).map((e) => (
            <ListRow key={e.Name} title={e.Name} subtitle={[e.AdapterType, e.Model].filter(Boolean).join(' · ')} selected={e.Name === chosen} trailing={e.IsDefault ? <Badge label={t('mobile.new.default')} tone="success" /> : null} onPress={() => setEndpoint(e.Name)} />
          ))}
        </View>
      </Section>
      <Section title={t('mobile.new.folder')}>
        <Field label={t('mobile.new.folderPath')} hint={t('mobile.new.folderHint')} value={cwd} onChangeText={setCwd} autoCapitalize="none" autoCorrect={false} placeholder={t('mobile.new.folderPlaceholder')} />
        <View style={{ marginHorizontal: -spacing.lg }}>
          {(workspaces.data ?? []).map((w) => (
            <ListRow
              key={w.Path}
              title={w.Name || w.Path}
              subtitle={[w.Path, w.LastUsedUtc ? formatRelativeTime(i18n.language, w.LastUsedUtc) : '', w.Source === 'home' ? t('mobile.new.home') : t('mobile.new.sessions', { count: w.SessionCount })].filter(Boolean).join(' · ')}
              selected={w.Path === cwd}
              onPress={() => setCwd(w.Path)}
            />
          ))}
        </View>
      </Section>
      <Button
        title={t('mobile.new.start')}
        disabled={!chosen || !m?.online}
        onPress={() => router.replace({ pathname: '/machines/[machineId]/conversation/[sessionId]', params: { machineId, sessionId: 'new', endpoint: chosen, cwd: cwd.trim() } })}
      />
    </Screen>
  );
}
