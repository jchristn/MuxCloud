import { useState, type FormEvent } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { authApi } from '../../api';
import { api } from '../../apiClient';
import { Banner } from '../../components/Banner';
import { ErrorBanner } from '../../components/ErrorBanner';
import { PasswordInput } from '../../components/PasswordInput';
import { AuthLayout } from './AuthLayout';

export function SignupPage() {
  const { t } = useTranslation();
  const [form, setForm] = useState({ email: '', password: '', confirm: '', firstName: '', lastName: '' });
  const [accept, setAccept] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [touched, setTouched] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  const tooShort = form.password.length > 0 && form.password.length < 10;
  const mismatch = form.confirm.length > 0 && form.confirm !== form.password;
  const valid = !!form.email && form.password.length >= 10 && form.password === form.confirm && accept;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      const result = await authApi.signup(api, {
        email: form.email.trim(),
        password: form.password,
        firstName: form.firstName.trim() || undefined,
        lastName: form.lastName.trim() || undefined,
        acceptTerms: true,
      });
      setDone(result.email);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <AuthLayout
        title={t('auth.checkEmailTitle')}
        pageTitle={t('pageTitles.signup')}
        footer={<Link to="/login">{t('auth.goToLogin')}</Link>}
      >
        <Banner tone="success">{t('auth.checkEmailBody', { email: done })}</Banner>
        {resent ? (
          <p className="small muted">{t('auth.resent')}</p>
        ) : (
          <button
            type="button"
            className="btn"
            onClick={async () => {
              try {
                await authApi.resendVerification(api, done);
              } finally {
                setResent(true);
              }
            }}
          >
            {t('auth.resend')}
          </button>
        )}
      </AuthLayout>
    );
  }

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [key]: e.target.value });

  return (
    <AuthLayout
      title={t('auth.signupTitle')}
      pageTitle={t('pageTitles.signup')}
      subtitle={t('auth.signupSubtitle')}
      footer={
        <span>
          {t('auth.haveAccount')} <Link to="/login">{t('auth.signIn')}</Link>
        </span>
      }
    >
      {error ? <ErrorBanner error={error} /> : null}
      <form className="form-stack" onSubmit={submit} noValidate>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="firstName">{t('auth.firstName')}</label>
            <input
              id="firstName"
              className="input"
              autoComplete="given-name"
              value={form.firstName}
              onChange={set('firstName')}
              maxLength={100}
            />
          </div>
          <div className="field">
            <label htmlFor="lastName">{t('auth.lastName')}</label>
            <input
              id="lastName"
              className="input"
              autoComplete="family-name"
              value={form.lastName}
              onChange={set('lastName')}
              maxLength={100}
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="email">{t('common.email')}</label>
          <input
            id="email"
            className="input"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={set('email')}
            maxLength={254}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="password">{t('auth.password')}</label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            value={form.password}
            onChange={set('password')}
            aria-invalid={tooShort}
            aria-describedby="password-hint"
            maxLength={256}
          />
          <span id="password-hint" className={tooShort ? 'field-error' : 'field-hint'}>
            {tooShort ? t('auth.passwordTooShort') : t('auth.passwordHint')}
          </span>
        </div>
        <div className="field">
          <label htmlFor="confirm">{t('auth.confirmPassword')}</label>
          <PasswordInput
            id="confirm"
            autoComplete="new-password"
            value={form.confirm}
            onChange={set('confirm')}
            aria-invalid={mismatch}
            maxLength={256}
          />
          {mismatch ? <span className="field-error">{t('auth.passwordMismatch')}</span> : null}
        </div>
        <label className="checkbox">
          <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} />
          <span>
            <Trans
              i18nKey="auth.acceptTerms"
              components={{
                terms: <Link to="/legal/terms" target="_blank" />,
                privacy: <Link to="/legal/privacy" target="_blank" />,
              }}
            />
          </span>
        </label>
        {touched && !accept ? <span className="field-error">{t('auth.acceptTermsRequired')}</span> : null}
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? t('auth.creating') : t('auth.createButton')}
        </button>
      </form>
    </AuthLayout>
  );
}
