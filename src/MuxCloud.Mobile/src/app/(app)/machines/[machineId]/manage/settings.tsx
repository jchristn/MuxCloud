import { useState } from 'react';
import { RefreshControl } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ObjectForm, type FieldHints } from '@/components/ObjectForm';
import { Button, ErrorBox, Loading, Notice, Screen } from '@/components/ui';
import { useAsync } from '@/state/useAsync';
import { useMachineApi } from '@/state/useMachineApi';

/**
 * The machine's mux settings (GET/PUT /settings), every field, including the REST and Mux Cloud blocks. Under the parity
 * rule nothing is read-only here that is editable locally; secrets stay masked exactly as the machine masks them.
 */
const HINTS: FieldHints = {
  DefaultApprovalPolicy: { options: ['ask', 'auto', 'deny'] },
  CompactionStrategy: { options: ['summary', 'trim'] },
  DefaultEnqueueBehavior: { options: ['ask', 'run_now', 'queue_after', 'add_to_focused'] },
  LargeFileMode: { options: ['map', 'summarize', 'truncate'] },
  'Rest.ApiKey': { secret: true, nullable: true },
  'Rest.ApiKeySet': { readOnly: true },
  'Cloud.MachineSecret': { secret: true, nullable: true },
  'Cloud.MachineSecretSet': { readOnly: true },
  'Cloud.AllowRemoteToolApproval': {
    hint: 'When off, runs started through Mux Cloud deny every tool that needs approval. Local runs are unaffected.',
  },
};

export default function SettingsScreen() {
  const { machineId } = useLocalSearchParams<{ machineId: string }>();
  const { t } = useTranslation();
  const api = useMachineApi(machineId);
  const settings = useAsync(() => api.settings(), [api]);
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [saved, setSaved] = useState(false);

  // Start a fresh draft whenever settings load or save (adjusted during render, not in an effect).
  const [seen, setSeen] = useState(settings.data);
  if (settings.data !== seen) {
    setSeen(settings.data);
    if (settings.data) setDraft(settings.data);
  }

  const save = async () => {
    if (!draft) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const next = await api.saveSettings(draft);
      settings.setData(next ?? draft);
      setSaved(true);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen refreshControl={<RefreshControl refreshing={settings.loading && !!draft} onRefresh={() => void settings.reload()} />}>
      <Stack.Screen options={{ title: t('mobile.manage.settings') }} />
      <Notice text={t('mobile.manage.settingsRemote')} />
      {settings.loading && !draft ? <Loading /> : null}
      {settings.error ? <ErrorBox error={settings.error} onRetry={() => void settings.reload()} /> : null}
      {draft ? <ObjectForm value={draft} onChange={setDraft} hints={HINTS} /> : null}
      {error ? <ErrorBox error={error} /> : null}
      {saved ? <Notice tone="success" text={t('mobile.manage.saved')} /> : null}
      {draft ? <Button title={busy ? t('common.saving') : t('common.save')} busy={busy} onPress={() => void save()} /> : null}
    </Screen>
  );
}
