import { useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { ApiError, authApi } from '../../api';
import { api } from '../../apiClient';
import { Banner } from '../../components/Banner';
import { ErrorBanner } from '../../components/ErrorBanner';
import { PasswordInput } from '../../components/PasswordInput';
import { useAuth } from '../../context/AuthContext';
import { AuthLayout, Field } from './AuthLayout';
import { emailError, focusFirstInvalid, passwordError } from './validation';

export function LoginPage() {
  const { t } = useTranslation();
  const { status, login, expired } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const form = useRef<HTMLFormElement>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState({ email: false, password: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [resent, setResent] = useState(false);
  const from = (location.state as { from?: string } | null)?.from ?? '/machines';

  if (status === 'authenticated') return <Navigate to={from} replace />;

  const emailMsg = touched.email ? emailError(email) : null;
  const passwordMsg = touched.password ? passwordError(password) : null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setTouched({ email: true, password: true });
    if (emailError(email) || passwordError(password)) {
      setTimeout(() => focusFirstInvalid(form.current), 0);
      return;
    }
    setBusy(true);
    setError(null);
    setResent(false);
    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  const unverified = error instanceof ApiError && error.code === 'EmailNotVerified';

  return (
    <AuthLayout
      title={t('auth.loginTitle')}
      pageTitle={t('pageTitles.login')}
      subtitle={t('auth.loginSubtitle')}
      footer={
        <span>
          {t('auth.noAccount')} <Link to="/signup">{t('auth.createAccount')}</Link>
        </span>
      }
    >
      {expired && !error ? <Banner tone="info">{t('auth.sessionExpired')}</Banner> : null}
      {unverified ? (
        <Banner tone="warning" title={t('auth.notVerifiedTitle')}>
          <span>{t('auth.notVerifiedBody', { email })}</span>
          {resent ? (
            <span className="small">{t('auth.resent')}</span>
          ) : (
            <div>
              <button
                type="button"
                className="btn btn-sm"
                onClick={async () => {
                  try {
                    await authApi.resendVerification(api, email.trim());
                  } finally {
                    setResent(true);
                  }
                }}
              >
                {t('auth.resend')}
              </button>
            </div>
          )}
        </Banner>
      ) : error ? (
        <ErrorBanner error={error} />
      ) : null}
      <form ref={form} className="form-stack" onSubmit={submit} noValidate>
        <Field id="email" label={t('common.email')} error={emailMsg ? t(emailMsg) : null}>
          <input
            id="email"
            className="input"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => email && setTouched((x) => ({ ...x, email: true }))}
            aria-invalid={!!emailMsg}
            aria-describedby={emailMsg ? 'email-msg' : undefined}
            autoFocus
          />
        </Field>
        <div className="field">
          <div className="label-row">
            <label htmlFor="password">{t('auth.password')}</label>
            <Link to="/forgot" className="small">
              {t('auth.forgotLink')}
            </Link>
          </div>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={!!passwordMsg}
            aria-describedby={passwordMsg ? 'password-msg' : undefined}
          />
          {passwordMsg ? (
            <span id="password-msg" className="field-error" role="alert">
              {t(passwordMsg)}
            </span>
          ) : null}
        </div>
        <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={busy}>
          {busy ? <span className="spinner spinner-sm on-accent" aria-hidden="true" /> : null}
          {busy ? t('auth.signingIn') : t('auth.signIn')}
        </button>
      </form>
    </AuthLayout>
  );
}
