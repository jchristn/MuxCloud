import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { authApi } from '../../api';
import { api } from '../../apiClient';
import { Banner } from '../../components/Banner';
import { ErrorBanner } from '../../components/ErrorBanner';
import { Icon } from '../../components/Icon';
import { PasswordInput } from '../../components/PasswordInput';
import { AuthLayout, Field } from './AuthLayout';
import { confirmError, emailError, focusFirstInvalid, passwordError } from './validation';

type FieldName = 'email' | 'password' | 'confirm' | 'terms';

export function SignupPage() {
  const { t } = useTranslation();
  const formRef = useRef<HTMLFormElement>(null);
  const [form, setForm] = useState({ email: '', password: '', confirm: '', firstName: '', lastName: '' });
  const [accept, setAccept] = useState(false);
  const [touched, setTouched] = useState<Record<FieldName, boolean>>({
    email: false,
    password: false,
    confirm: false,
    terms: false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [done, setDone] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  const errors: Record<FieldName, string | null> = {
    email: emailError(form.email),
    password: passwordError(form.password, 10),
    confirm: form.confirm ? confirmError(form.password, form.confirm) : 'auth.passwordRequired',
    terms: accept ? null : 'auth.acceptTermsRequired',
  };
  const shown = (name: FieldName) => (touched[name] && errors[name] ? t(errors[name]!) : null);
  const touch = (name: FieldName) => () => setTouched((x) => ({ ...x, [name]: true }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setTouched({ email: true, password: true, confirm: true, terms: true });
    if (Object.values(errors).some(Boolean)) {
      setTimeout(() => focusFirstInvalid(formRef.current), 0);
      return;
    }
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
        centered
        icon={
          <span className="empty-icon" aria-hidden="true">
            <Icon name="mail" size={26} />
          </span>
        }
      >
        <div className="auth-success">
          <p>{t('auth.checkEmailBody', { email: done })}</p>
        </div>
        {resent ? (
          <Banner tone="success">{t('auth.resent')}</Banner>
        ) : (
          <button
            type="button"
            className="btn btn-block"
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

  const set = (key: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [key]: e.target.value });
  const described = (name: FieldName) => (shown(name) ? name + '-msg' : undefined);

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
      <form ref={formRef} className="form-stack" onSubmit={submit} noValidate>
        <div className="form-grid form-grid-2">
          <Field id="firstName" label={t('auth.firstName')}>
            <input
              id="firstName"
              className="input"
              autoComplete="given-name"
              value={form.firstName}
              onChange={set('firstName')}
              maxLength={100}
            />
          </Field>
          <Field id="lastName" label={t('auth.lastName')}>
            <input
              id="lastName"
              className="input"
              autoComplete="family-name"
              value={form.lastName}
              onChange={set('lastName')}
              maxLength={100}
            />
          </Field>
        </div>
        <Field id="email" label={t('common.email')} error={shown('email')}>
          <input
            id="email"
            className="input"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={set('email')}
            onBlur={() => form.email && touch('email')()}
            maxLength={254}
            aria-invalid={!!shown('email')}
            aria-describedby={described('email')}
          />
        </Field>
        <Field id="password" label={t('auth.password')} error={shown('password')} hint={t('auth.passwordHint')}>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            value={form.password}
            onChange={set('password')}
            onBlur={() => form.password && touch('password')()}
            aria-invalid={!!shown('password')}
            aria-describedby="password-msg"
            maxLength={256}
          />
        </Field>
        <Field id="confirm" label={t('auth.confirmPassword')} error={shown('confirm')}>
          <PasswordInput
            id="confirm"
            autoComplete="new-password"
            value={form.confirm}
            onChange={set('confirm')}
            onBlur={() => form.confirm && touch('confirm')()}
            aria-invalid={!!shown('confirm')}
            aria-describedby={described('confirm')}
            maxLength={256}
          />
        </Field>
        <div className="field">
          <label className="checkbox">
            <input
              type="checkbox"
              checked={accept}
              onChange={(e) => setAccept(e.target.checked)}
              aria-invalid={!!shown('terms')}
              aria-describedby={described('terms')}
            />
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
          {shown('terms') ? (
            <span id="terms-msg" className="field-error" role="alert">
              {shown('terms')}
            </span>
          ) : null}
        </div>
        <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={busy}>
          {busy ? <span className="spinner spinner-sm on-accent" aria-hidden="true" /> : null}
          {busy ? t('auth.creating') : t('auth.createButton')}
        </button>
      </form>
    </AuthLayout>
  );
}
