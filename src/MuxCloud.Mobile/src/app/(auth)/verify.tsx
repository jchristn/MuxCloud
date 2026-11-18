import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { authApi } from '@dashboard/api';
import { AuthFrame } from '@/components/AuthFrame';
import { Button, ErrorBox, Field, Notice, T } from '@/components/ui';
import { useAuth } from '@/state/AuthContext';

/**
 * Email verification prompt, shown after sign-up and when sign-in reports EmailNotVerified. The verification link in
 * the email opens the web dashboard; a pasted verification code (the token from the link) also works here.
 */
export default function Verify() {
  const { t } = useTranslation();
  const { auth } = useAuth();
  const params = useLocalSearchParams<{ email?: string; sent?: string; token?: string }>();
  const email = params.email ?? '';
  const [token, setToken] = useState(params.token ?? '');
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);

  const resend = async () => {
    setBusy('resend');
    setError(null);
    try {
      await authApi.resendVerification(auth.client, email);
      setMessage(t('auth.resent'));
    } catch (e) {
      setError(e);
    } finally {
      setBusy(null);
    }
  };

  const verify = async () => {
    setBusy('verify');
    setError(null);
    try {
      const result = await authApi.verify(auth.client, token.trim());
      setMessage(t('auth.verifySuccess', { email: result.email }));
    } catch (e) {
      setError(e);
    } finally {
      setBusy(null);
    }
  };

  return (
    <AuthFrame title={params.sent ? t('auth.checkEmailTitle') : t('auth.notVerifiedTitle')}>
      <T variant="muted">{params.sent ? t('auth.checkEmailBody', { email }) : t('auth.notVerifiedBody', { email })}</T>
      {email ? <Button title={t('auth.resend')} kind="secondary" busy={busy === 'resend'} onPress={() => void resend()} /> : null}
      <Field label={t('mobile.auth.verifyCode')} hint={t('mobile.auth.verifyCodeHint')} value={token} onChangeText={setToken} autoCapitalize="none" autoCorrect={false} />
      <Button title={t('mobile.auth.verifyButton')} busy={busy === 'verify'} disabled={!token.trim()} onPress={() => void verify()} />
      {message ? <Notice tone="success" text={message} /> : null}
      {error ? <ErrorBox error={error} /> : null}
      <Button title={t('auth.goToLogin')} kind="ghost" onPress={() => router.replace('/sign-in')} />
    </AuthFrame>
  );
}
