import { useState } from 'react';
import { router, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { accountApi } from '@dashboard/api';
import { Button, ErrorBox, Field, Notice, Screen, T } from '@/components/ui';
import { unregisterPush } from '@/push/PushRegistrar';
import { useAuth } from '@/state/AuthContext';
import { usePrefs } from '@/state/PrefsContext';

/** Delete the account (required in-app by both app stores). Asks for the password and a typed confirmation. */
export default function DeleteAccount() {
  const { t } = useTranslation();
  const { auth } = useAuth();
  const { prefs } = usePrefs();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const word = t('mobile.account.deleteWord');

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await unregisterPush(auth.client, prefs.pushDeviceId);
      await accountApi.deleteAccount(auth.client, password);
      await auth.signOut();
      router.replace('/sign-in');
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: t('mobile.account.deleteAccount') }} />
      <Notice tone="danger" text={t('mobile.account.deleteBody')} />
      <Field label={t('auth.password')} value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" />
      <T variant="small">{t('mobile.account.deleteConfirm', { word })}</T>
      <Field label={t('mobile.common.confirm')} value={confirm} onChangeText={setConfirm} autoCapitalize="characters" autoCorrect={false} />
      {error ? <ErrorBox error={error} /> : null}
      <Button title={t('mobile.account.deleteAccount')} kind="danger" busy={busy} disabled={!password || confirm.trim() !== word} onPress={() => void submit()} />
      <Button title={t('common.cancel')} kind="ghost" onPress={() => router.back()} />
    </Screen>
  );
}
