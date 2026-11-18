import { useState } from 'react';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ApiError } from '@dashboard/api';
import { AuthFrame } from '@/components/AuthFrame';
import { Button, ErrorBox, Field } from '@/components/ui';
import { useAuth } from '@/state/AuthContext';
import { usePrefs } from '@/state/PrefsContext';

export default function SignIn() {
  const { t } = useTranslation();
  const { auth } = useAuth();
  const { prefs, update } = usePrefs();
  const [email, setEmail] = useState(prefs.lastEmail);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const submit = async () => {
    if (!email.trim() || !password) return;
    setBusy(true);
    setError(null);
    try {
      await auth.signIn(email, password);
      update({ lastEmail: email.trim() });
      router.replace('/machines');
    } catch (e) {
      if (e instanceof ApiError && e.code === 'EmailNotVerified') {
        router.push({ pathname: '/verify', params: { email: email.trim() } });
      } else {
        setError(e);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthFrame title={t('auth.loginTitle')} subtitle={t('auth.loginSubtitle')}>
      <Field label={t('common.email')} value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="username" autoCorrect={false} />
      <Field label={t('auth.password')} value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" textContentType="password" onSubmitEditing={() => void submit()} />
      {error ? <ErrorBox error={error} /> : null}
      <Button title={busy ? t('auth.signingIn') : t('auth.signIn')} busy={busy} onPress={() => void submit()} disabled={!email.trim() || !password} />
      <Button title={t('auth.forgotLink')} kind="ghost" onPress={() => router.push('/forgot')} />
      <Button title={t('auth.noAccount') + ' ' + t('auth.createAccount')} kind="secondary" onPress={() => router.push('/sign-up')} />
    </AuthFrame>
  );
}
