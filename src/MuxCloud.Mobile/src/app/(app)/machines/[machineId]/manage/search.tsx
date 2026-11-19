import { useState } from 'react';
import { Alert, RefreshControl, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Sheet } from '@/components/Sheet';
import { Badge, Button, Empty, ErrorBox, Field, ListRow, Loading, Notice, Screen, Section, Segmented, T, ToggleRow } from '@/components/ui';
import { isMissingRoute } from '@/lib/routeSupport';
import { useAsync } from '@/state/useAsync';
import { useMachineApi } from '@/state/useMachineApi';
import type { MuxSearchProvider, MuxSearchSettings } from '@/types/mux';
import { spacing } from '@/theme/palette';

/** A provider being edited; `original` is its name before the edit (null for a new one). */
interface Draft {
  original: string | null;
  provider: MuxSearchProvider;
  timeout: string;
}

/**
 * Web search providers for the model's web search tool, like the desktop's Search providers window: turn search and
 * fallback on or off, and add, edit, set default, and remove providers. API keys are write-only: a blank key keeps the
 * one the machine has stored.
 */
export default function SearchScreen() {
  const { machineId } = useLocalSearchParams<{ machineId: string }>();
  const { t } = useTranslation();
  const api = useMachineApi(machineId);
  const settings = useAsync(() => api.search(), [api]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const s = settings.data;
  const types = s?.ProviderTypes?.length ? s.ProviderTypes : ['tavily', 'you'];

  /** PUT replaces the whole configuration; keys are sent only when typed, so stored ones are kept. */
  const save = async (next: MuxSearchSettings) => {
    setBusy(true);
    setError(null);
    try {
      const saved = await api.saveSearch({ ...next, Providers: next.Providers.map((pr) => ({ ...pr, ApiKey: pr.ApiKey ? pr.ApiKey : undefined })) });
      settings.setData(saved);
      return true;
    } catch (e) {
      setError(e);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const openNew = () => {
    setFormError(null);
    setDraft({
      original: null,
      provider: { Name: '', ProviderType: types[0], Endpoint: '', ApiKey: '', Enabled: true, IsDefault: !(s?.Providers.length ?? 0), TimeoutMs: 15000 },
      timeout: '15000',
    });
  };

  const commit = async () => {
    if (!s || !draft) return;
    const name = draft.provider.Name.trim();
    if (!name) return setFormError(t('mobile.search.nameRequired'));
    if (s.Providers.some((pr) => pr.Name.toLowerCase() === name.toLowerCase() && pr.Name !== draft.original))
      return setFormError(t('mobile.search.nameTaken', { name }));
    const timeout = Number(draft.timeout);
    const provider: MuxSearchProvider = { ...draft.provider, Name: name, TimeoutMs: Number.isFinite(timeout) && timeout > 0 ? timeout : 15000 };
    let providers = draft.original === null ? [...s.Providers, provider] : s.Providers.map((pr) => (pr.Name === draft.original ? provider : pr));
    if (provider.IsDefault) providers = providers.map((pr) => (pr.Name === name ? pr : { ...pr, IsDefault: false }));
    if (await save({ ...s, Providers: providers })) setDraft(null);
  };

  const remove = (name: string) =>
    Alert.alert(t('mobile.form.deleteTitle', { name }), t('mobile.search.deleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            settings.setData(await api.deleteSearchProvider(name));
            setDraft(null);
          } catch (e) {
            setError(e);
          }
        },
      },
    ]);

  const makeDefault = (name: string) => s && void save({ ...s, Providers: s.Providers.map((pr) => ({ ...pr, IsDefault: pr.Name === name })) });

  return (
    <Screen refreshControl={<RefreshControl refreshing={settings.loading && !!s} onRefresh={() => void settings.reload()} />}>
      <Stack.Screen options={{ title: t('mobile.search.title') }} />
      <T variant="muted">{t('mobile.search.intro')}</T>
      {isMissingRoute(settings.error) ? <Notice tone="warning" text={t('mobile.common.unsupported')} /> : settings.error ? <ErrorBox error={settings.error} onRetry={() => void settings.reload()} /> : null}
      {error ? <ErrorBox error={error} /> : null}
      {settings.loading && !s ? <Loading /> : null}
      {s ? (
        <>
          <ToggleRow
            label={t('mobile.search.enabled')}
            hint={t('mobile.search.enabledHint')}
            value={s.Enabled}
            disabled={busy}
            onChange={(Enabled) => void save({ ...s, Enabled })}
          />
          <ToggleRow
            label={t('mobile.search.fallback')}
            hint={t('mobile.search.fallbackHint')}
            value={s.AllowFallback}
            disabled={busy}
            onChange={(AllowFallback) => void save({ ...s, AllowFallback })}
          />
          <Section title={t('mobile.search.providers')} action={<Button compact kind="secondary" title={t('mobile.search.add')} onPress={openNew} />}>
            {s.Providers.length === 0 ? <Empty title={t('mobile.search.none')} body={t('mobile.search.noneBody')} /> : null}
            <View style={{ marginHorizontal: -spacing.lg }}>
              {s.Providers.map((pr) => (
                <ListRow
                  key={pr.Name}
                  title={pr.Name}
                  subtitle={[pr.ProviderType, pr.Endpoint, pr.ApiKeySet ? t('mobile.search.keySet') : t('mobile.search.noKey')].filter(Boolean).join(' · ')}
                  trailing={
                    <View style={{ alignItems: 'flex-end', gap: spacing.xs }}>
                      {pr.IsDefault ? <Badge tone="success" label={t('mobile.search.default')} /> : null}
                      {!pr.Enabled ? <Badge label={t('common.disabled')} /> : null}
                    </View>
                  }
                  onPress={() => {
                    setFormError(null);
                    setDraft({ original: pr.Name, provider: { ...pr, ApiKey: '' }, timeout: String(pr.TimeoutMs ?? 15000) });
                  }}
                />
              ))}
            </View>
          </Section>
        </>
      ) : null}

      <Sheet
        visible={draft !== null}
        title={draft?.original ? draft.original : t('mobile.search.add')}
        onClose={() => setDraft(null)}
        footer={
          <>
            <Button title={t('common.save')} busy={busy} onPress={() => void commit()} />
            {draft?.original && !draft.provider.IsDefault ? (
              <Button title={t('mobile.search.makeDefault')} kind="secondary" onPress={() => draft.original && (makeDefault(draft.original), setDraft(null))} />
            ) : null}
            {draft?.original ? <Button title={t('common.delete')} kind="danger" onPress={() => draft.original && remove(draft.original)} /> : null}
          </>
        }
      >
        {draft ? (
          <>
            <Field
              label={t('mobile.common.name')}
              value={draft.provider.Name}
              onChangeText={(Name) => setDraft({ ...draft, provider: { ...draft.provider, Name } })}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={{ gap: spacing.xs }}>
              <T variant="small" style={{ fontWeight: '600' }}>
                {t('mobile.search.type')}
              </T>
              <Segmented
                value={draft.provider.ProviderType}
                onChange={(ProviderType) => setDraft({ ...draft, provider: { ...draft.provider, ProviderType } })}
                options={types.map((x) => ({ value: x, label: x }))}
              />
            </View>
            <Field
              label={t('mobile.search.endpoint')}
              hint={t('mobile.search.endpointHint')}
              value={draft.provider.Endpoint ?? ''}
              onChangeText={(Endpoint) => setDraft({ ...draft, provider: { ...draft.provider, Endpoint } })}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <Field
              label={t('mobile.search.apiKey')}
              hint={draft.provider.ApiKeySet ? t('mobile.search.apiKeyKeep') : t('mobile.search.apiKeyHint')}
              value={draft.provider.ApiKey ?? ''}
              onChangeText={(ApiKey) => setDraft({ ...draft, provider: { ...draft.provider, ApiKey } })}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Field
              label={t('mobile.search.timeout')}
              value={draft.timeout}
              onChangeText={(timeout) => setDraft({ ...draft, timeout })}
              keyboardType="number-pad"
            />
            <ToggleRow
              label={t('mobile.search.providerEnabled')}
              value={draft.provider.Enabled}
              onChange={(Enabled) => setDraft({ ...draft, provider: { ...draft.provider, Enabled } })}
            />
            {draft.original === null ? (
              <ToggleRow
                label={t('mobile.search.default')}
                value={draft.provider.IsDefault}
                onChange={(IsDefault) => setDraft({ ...draft, provider: { ...draft.provider, IsDefault } })}
              />
            ) : null}
            {formError ? <Notice tone="danger" text={formError} /> : null}
          </>
        ) : null}
      </Sheet>
    </Screen>
  );
}
