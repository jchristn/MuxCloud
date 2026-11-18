import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { authApi } from '../../api';
import { api } from '../../apiClient';
import { Banner } from '../../components/Banner';
import { ErrorBanner } from '../../components/ErrorBanner';
import { AuthLayout } from './AuthLayout';

export function ForgotPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await authApi.forgotPassword(api, email.trim());
      setSent(true);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title={t('auth.forgotTitle')}
      pageTitle={t('pageTitles.forgot')}
      subtitle={t('auth.forgotSubtitle')}
      footer={<Link to="/login">{t('auth.goToLogin')}</Link>}
    >
      {sent ? <Banner tone="success">{t('auth.forgotSent')}</Banner> : null}
      {error ? <ErrorBanner error={error} /> : null}
      {!sent ? (
        <form className="form-stack" onSubmit={submit}>
          <div className="field">
            <label htmlFor="email">{t('common.email')}</label>
            <input
              id="email"
              className="input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={busy || !email}>
            {busy ? t('auth.sending') : t('auth.sendReset')}
          </button>
        </form>
      ) : null}
    </AuthLayout>
  );
}
