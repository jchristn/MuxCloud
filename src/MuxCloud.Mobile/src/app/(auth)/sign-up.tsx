import { useState } from 'react';
import { Linking, Pressable, Switch, View } from 'react-native';
import { router } from 'expo-router';
import { Trans, useTranslation } from 'react-i18next';
import { authApi } from '@dashboard/api';
import { AuthFrame } from '@/components/AuthFrame';
import { Button, ErrorBox, Field, T } from '@/components/ui';
import { useAuth } from '@/state/AuthContext';
import { useTheme } from '@/theme/ThemeContext';
import { spacing } from '@/theme/palette';

export const TERMS_URL = 'https://app.usemux.ai/legal/terms';
export const PRIVACY_URL = 'https://app.usemux.ai/legal/privacy';

export default function SignUp() {
  const { t } = useTranslation();
  const p = useTheme();
  const { auth } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [accept, setAccept] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const submit = async () => {
    setProblem(null);
    if (password.length < 10) return setProblem(t('auth.passwordTooShort'));
    if (password !== confirm) return setProblem(t('auth.passwordMismatch'));
    if (!accept) return setProblem(t('auth.acceptTermsRequired'));
    setBusy(true);
    setError(null);
    try {
      await authApi.signup(auth.client, { email: email.trim(), password, firstName: firstName.trim() || undefined, lastName: lastName.trim() || undefined, acceptTerms: true });
      router.replace({ pathname: '/verify', params: { email: email.trim(), sent: '1' } });
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthFrame title={t('auth.signupTitle')} subtitle={t('auth.signupSubtitle')}>
      <Field label={t('auth.firstName')} value={firstName} onChangeText={setFirstName} autoComplete="given-name" />
      <Field label={t('auth.lastName')} value={lastName} onChangeText={setLastName} autoComplete="family-name" />
      <Field label={t('common.email')} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" autoCorrect={false} />
      <Field label={t('auth.password')} hint={t('auth.passwordHint')} value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" textContentType="newPassword" />
      <Field label={t('auth.confirmPassword')} value={confirm} onChangeText={setConfirm} secureTextEntry autoComplete="new-password" />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Switch value={accept} onValueChange={setAccept} accessibilityLabel={t('auth.acceptTermsRequired')} trackColor={{ true: p.accent, false: p.line }} />
        <View style={{ flex: 1 }}>
          <T>
            <Trans
              i18nKey="auth.acceptTerms"
              components={{
                terms: <T style={{ color: p.accent, textDecorationLine: 'underline' }} accessibilityRole="link">{''}</T>,
                privacy: <T style={{ color: p.accent, textDecorationLine: 'underline' }} accessibilityRole="link">{''}</T>,
              }}
            />
          </T>
          <View style={{ flexDirection: 'row', gap: spacing.lg, marginTop: spacing.xs }}>
            <Pressable onPress={() => void Linking.openURL(TERMS_URL)} accessibilityRole="link" hitSlop={8}>
              <T variant="small" style={{ color: p.accent }}>
                {t('mobile.auth.readTerms')}
              </T>
            </Pressable>
            <Pressable onPress={() => void Linking.openURL(PRIVACY_URL)} accessibilityRole="link" hitSlop={8}>
              <T variant="small" style={{ color: p.accent }}>
                {t('mobile.auth.readPrivacy')}
              </T>
            </Pressable>
          </View>
        </View>
      </View>
      {problem ? <T style={{ color: p.danger }}>{problem}</T> : null}
      {error ? <ErrorBox error={error} /> : null}
      <Button title={busy ? t('auth.creating') : t('auth.createButton')} busy={busy} onPress={() => void submit()} disabled={!email.trim()} />
      <Button title={t('auth.haveAccount') + ' ' + t('auth.signIn')} kind="ghost" onPress={() => router.replace('/sign-in')} />
    </AuthFrame>
  );
}
