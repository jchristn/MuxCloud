import { useState } from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { authApi } from '@dashboard/api';
import { AuthFrame } from '@/components/AuthFrame';
import { Button, ErrorBox, Field, Notice } from '@/components/ui';
import { useAuth } from '@/state/AuthContext';
import { usePrefs } from '@/state/PrefsContext';

/** Request a password reset email. The link in it opens the web dashboard's reset page. */
export default function Forgot() {
  const { t } = useTranslation();
  const { auth } = useAuth();
  const { prefs } = usePrefs();
  const [email, setEmail] = useState(prefs.lastEmail);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await authApi.forgotPassword(auth.client, email.trim());
      setSent(true);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthFrame title={t('auth.forgotTitle')} subtitle={t('auth.forgotSubtitle')}>
      <Field label={t('common.email')} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" autoCorrect={false} />
      {sent ? <Notice tone="success" text={t('auth.forgotSent')} /> : null}
      {error ? <ErrorBox error={error} /> : null}
      <Button title={busy ? t('auth.sending') : t('auth.sendReset')} busy={busy} disabled={!email.trim()} onPress={() => void submit()} />
      <Button title={t('auth.goToLogin')} kind="ghost" onPress={() => router.replace('/sign-in')} />
    </AuthFrame>
  );
}
