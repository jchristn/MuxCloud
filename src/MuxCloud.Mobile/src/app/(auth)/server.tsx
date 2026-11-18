import { useState } from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ApiClient, ApiError, healthApi } from '@dashboard/api';
import { AuthFrame } from '@/components/AuthFrame';
import { Button, ErrorBox, Field, Notice } from '@/components/ui';
import { DEFAULT_SERVER_URL, isInsecureServer, normalizeServerUrl } from '@/storage/prefs';
import { usePrefs } from '@/state/PrefsContext';

/** Choose the Mux Cloud server: app.usemux.ai by default, or a self-hosted or local development server. */
export default function Server() {
  const { t } = useTranslation();
  const { prefs, update } = usePrefs();
  const [url, setUrl] = useState(prefs.serverUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const save = async (value: string) => {
    const normalized = normalizeServerUrl(value);
    setProblem(null);
    setError(null);
    if (!normalized) return setProblem(t('mobile.server.invalid'));
    setBusy(true);
    try {
      const health = await healthApi.get(new ApiClient({ baseUrl: normalized, authMode: 'bearer' }));
      if (!health || !/mux/i.test(String(health.product ?? ''))) return setProblem(t('mobile.server.notMuxCloud'));
      update({ serverUrl: normalized });
      router.back();
    } catch (e) {
      if (e instanceof ApiError && e.status === 0) setProblem(t('mobile.server.unreachable', { url: normalized }));
      else setError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthFrame title={t('mobile.server.title')} subtitle={t('mobile.server.subtitle')} showServer={false}>
      <Field testID="server-url" label={t('mobile.server.url')} value={url} onChangeText={setUrl} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder={DEFAULT_SERVER_URL} />
      {isInsecureServer(normalizeServerUrl(url)) ? <Notice tone="warning" text={t('mobile.auth.insecure')} /> : null}
      {problem ? <Notice tone="danger" text={problem} /> : null}
      {error ? <ErrorBox error={error} /> : null}
      <Button title={t('mobile.server.connect')} busy={busy} onPress={() => void save(url)} />
      <Button title={t('mobile.server.useDefault')} kind="secondary" onPress={() => void save(DEFAULT_SERVER_URL)} />
      <Button title={t('common.cancel')} kind="ghost" onPress={() => router.back()} />
    </AuthFrame>
  );
}
