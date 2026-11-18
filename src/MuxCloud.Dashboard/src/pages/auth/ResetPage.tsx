import { useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';
import { authApi } from '../../api';
import { api } from '../../apiClient';
import { Banner } from '../../components/Banner';
import { ErrorBanner } from '../../components/ErrorBanner';
import { PasswordInput } from '../../components/PasswordInput';
import { AuthLayout, Field } from './AuthLayout';
import { confirmError, focusFirstInvalid, passwordError } from './validation';

export function ResetPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const form = useRef<HTMLFormElement>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [touched, setTouched] = useState({ password: false, confirm: false });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const pwErr = passwordError(password, 10);
  const cfErr = confirm ? confirmError(password, confirm) : 'auth.passwordRequired';
  const pwMsg = touched.password && pwErr ? t(pwErr) : null;
  const cfMsg = touched.confirm && cfErr ? t(cfErr) : null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setTouched({ password: true, confirm: true });
    if (pwErr || cfErr) {
      setTimeout(() => focusFirstInvalid(form.current), 0);
      return;
    }
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
      footer={
        <span>
          {t('auth.haveAccount')} <Link to="/login">{t('auth.signIn')}</Link>
        </span>
      }
    >
      {!token ? (
        <>
          <Banner tone="danger">{t('auth.resetMissing')}</Banner>
          <Link className="btn btn-primary btn-block btn-lg" to="/forgot">
            {t('auth.sendReset')}
          </Link>
        </>
      ) : null}
      {done ? (
        <>
          <Banner tone="success">{t('auth.resetDone')}</Banner>
          <Link className="btn btn-primary btn-block btn-lg" to="/login">
            {t('auth.goToLogin')}
          </Link>
        </>
      ) : null}
      {error ? <ErrorBanner error={error} /> : null}
      {token && !done ? (
        <form ref={form} className="form-stack" onSubmit={submit} noValidate>
          <Field id="password" label={t('auth.newPassword')} error={pwMsg} hint={t('auth.passwordHint')}>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => password && setTouched((x) => ({ ...x, password: true }))}
              aria-invalid={!!pwMsg}
              aria-describedby="password-msg"
              autoFocus
            />
          </Field>
          <Field id="confirm" label={t('auth.confirmPassword')} error={cfMsg}>
            <PasswordInput
              id="confirm"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onBlur={() => confirm && setTouched((x) => ({ ...x, confirm: true }))}
              aria-invalid={!!cfMsg}
              aria-describedby={cfMsg ? 'confirm-msg' : undefined}
            />
          </Field>
          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={busy}>
            {busy ? <span className="spinner spinner-sm on-accent" aria-hidden="true" /> : null}
            {t('auth.resetButton')}
          </button>
        </form>
      ) : null}
    </AuthLayout>
  );
}
