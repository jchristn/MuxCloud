import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';
import { authApi } from '../../api';
import { api } from '../../apiClient';
import { Banner } from '../../components/Banner';
import { ErrorBanner } from '../../components/ErrorBanner';
import { PasswordInput } from '../../components/PasswordInput';
import { AuthLayout } from './AuthLayout';

export function ResetPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const tooShort = password.length > 0 && password.length < 10;
  const mismatch = confirm.length > 0 && confirm !== password;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (password.length < 10 || password !== confirm) return;
    setBusy(true);
    setError(null);
    try {
      await authApi.resetPassword(api, token, password);
      setDone(true);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title={t('auth.resetTitle')}
      pageTitle={t('pageTitles.reset')}
      footer={<Link to="/login">{t('auth.goToLogin')}</Link>}
    >
      {!token ? <Banner tone="danger">{t('auth.resetMissing')}</Banner> : null}
      {done ? <Banner tone="success">{t('auth.resetDone')}</Banner> : null}
      {error ? <ErrorBanner error={error} /> : null}
      {token && !done ? (
        <form className="form-stack" onSubmit={submit}>
          <div className="field">
            <label htmlFor="password">{t('auth.newPassword')}</label>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={tooShort}
            />
            <span className={tooShort ? 'field-error' : 'field-hint'}>
              {tooShort ? t('auth.passwordTooShort') : t('auth.passwordHint')}
            </span>
          </div>
          <div className="field">
            <label htmlFor="confirm">{t('auth.confirmPassword')}</label>
            <PasswordInput
              id="confirm"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              aria-invalid={mismatch}
            />
            {mismatch ? <span className="field-error">{t('auth.passwordMismatch')}</span> : null}
          </div>
          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={busy || password.length < 10 || password !== confirm}
          >
            {t('auth.resetButton')}
          </button>
        </form>
      ) : null}
    </AuthLayout>
  );
}
