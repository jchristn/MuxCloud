import { useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { authApi } from '../../api';
import { api } from '../../apiClient';
import { ErrorBanner } from '../../components/ErrorBanner';
import { Icon } from '../../components/Icon';
import { AuthLayout, Field } from './AuthLayout';
import { emailError, focusFirstInvalid } from './validation';

export function ForgotPage() {
  const { t } = useTranslation();
  const form = useRef<HTMLFormElement>(null);
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const msg = touched ? emailError(email) : null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (emailError(email)) {
      setTimeout(() => focusFirstInvalid(form.current), 0);
      return;
    }
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
      title={sent ? t('auth.checkEmailTitle') : t('auth.forgotTitle')}
      pageTitle={t('pageTitles.forgot')}
      subtitle={sent ? undefined : t('auth.forgotSubtitle')}
      centered={sent}
      icon={
        sent ? (
          <span className="empty-icon" aria-hidden="true">
            <Icon name="mail" size={26} />
          </span>
        ) : undefined
      }
      footer={
        <span>
          {t('auth.haveAccount')} <Link to="/login">{t('auth.signIn')}</Link>
        </span>
      }
    >
      {sent ? (
        <div className="auth-success">
          <p>{t('auth.forgotSent')}</p>
        </div>
      ) : (
        <>
          {error ? <ErrorBanner error={error} /> : null}
          <form ref={form} className="form-stack" onSubmit={submit} noValidate>
            <Field id="email" label={t('common.email')} error={msg ? t(msg) : null}>
              <input
                id="email"
                className="input"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => email && setTouched(true)}
                aria-invalid={!!msg}
                aria-describedby={msg ? 'email-msg' : undefined}
                autoFocus
              />
            </Field>
            <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={busy}>
              {busy ? <span className="spinner spinner-sm on-accent" aria-hidden="true" /> : null}
              {busy ? t('auth.sending') : t('auth.sendReset')}
            </button>
          </form>
        </>
      )}
    </AuthLayout>
  );
}
