import { useState } from 'react';
import { RefreshControl, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Sheet } from '@/components/Sheet';
import { Badge, Button, ErrorBox, Field, ListRow, Loading, Screen, T } from '@/components/ui';
import { useAsync } from '@/state/useAsync';
import { useMachineApi } from '@/state/useMachineApi';
import type { MuxPromptCatalogEntry } from '@/types/mux';
import { spacing } from '@/theme/palette';

/** The prompt catalog: every built-in prompt mux uses, with its default, the effective text, and an override. */
export default function Catalog() {
  const { machineId } = useLocalSearchParams<{ machineId: string }>();
  const { t } = useTranslation();
  const api = useMachineApi(machineId);
  const catalog = useAsync(() => api.promptCatalog().then((r) => r.Items ?? []), [api]);
  const [editing, setEditing] = useState<{ entry: MuxPromptCatalogEntry; content: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const save = async (content: string) => {
    if (!editing) return;
    setBusy(true);
    setError(null);
    try {
      await api.savePromptOverride(editing.entry.Key, content);
      setEditing(null);
      void catalog.reload();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen refreshControl={<RefreshControl refreshing={catalog.loading && !!catalog.data} onRefresh={() => void catalog.reload()} />}>
      <Stack.Screen options={{ title: t('mobile.manage.catalog') }} />
      <T variant="muted">{t('mobile.manage.catalogIntro')}</T>
      {catalog.loading && !catalog.data ? <Loading /> : null}
      {catalog.error ? <ErrorBox error={catalog.error} onRetry={() => void catalog.reload()} /> : null}
      <View style={{ marginHorizontal: -spacing.lg }}>
        {(catalog.data ?? []).map((e) => (
          <ListRow
            key={e.Key}
            title={e.DisplayName || e.Key}
            subtitle={[e.Kind, e.Scope, e.Description].filter(Boolean).join(' · ')}
            trailing={e.Overridden ? <Badge tone="info" label={t('mobile.catalog.overridden')} /> : null}
            onPress={() => setEditing({ entry: e, content: e.Effective })}
          />
        ))}
      </View>
      <Sheet
        visible={editing !== null}
        title={editing?.entry.DisplayName ?? ''}
        onClose={() => setEditing(null)}
        footer={
          editing?.entry.Editable ? (
            <>
              {error ? <ErrorBox error={error} /> : null}
              <Button title={t('common.save')} busy={busy} onPress={() => void save(editing.content)} />
              {editing.entry.Overridden ? <Button title={t('mobile.catalog.reset')} kind="secondary" onPress={() => void save('')} /> : null}
            </>
          ) : null
        }
      >
        {editing ? (
          <>
            {editing.entry.Placeholders.length > 0 ? <T variant="small">{t('mobile.catalog.placeholders', { list: editing.entry.Placeholders.join(', ') })}</T> : null}
            <Field label={t('mobile.catalog.effective')} multiline editable={editing.entry.Editable} value={editing.content} onChangeText={(content) => setEditing({ ...editing, content })} style={{ minHeight: 260 }} autoCorrect={false} />
            <T variant="label">{t('mobile.catalog.default')}</T>
            <T variant="small" selectable>
              {editing.entry.Default}
            </T>
          </>
        ) : null}
      </Sheet>
    </Screen>
  );
}
