import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { ApiError, authApi } from '../../api';
import { api } from '../../apiClient';
import { Banner } from '../../components/Banner';
import { ErrorBanner } from '../../components/ErrorBanner';
import { PasswordInput } from '../../components/PasswordInput';
import { useAuth } from '../../context/AuthContext';
import { AuthLayout } from './AuthLayout';

export function LoginPage() {
  const { t } = useTranslation();
  const { status, login, expired } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [resent, setResent] = useState(false);
  const from = (location.state as { from?: string } | null)?.from ?? '/machines';

  if (status === 'authenticated') return <Navigate to={from} replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
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
        <>
          <Link to="/forgot">{t('auth.forgotLink')}</Link>
          <span>
            {t('auth.noAccount')} <Link to="/signup">{t('auth.createAccount')}</Link>
          </span>
        </>
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
      <form className="form-stack" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="email">{t('common.email')}</label>
          <input
            id="email"
            className="input"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            data-autofocus
          />
        </div>
        <div className="field">
          <label htmlFor="password">{t('auth.password')}</label>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary btn-block" disabled={busy || !email || !password}>
          {busy ? t('auth.signingIn') : t('auth.signIn')}
        </button>
      </form>
    </AuthLayout>
  );
}
