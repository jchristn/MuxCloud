import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';
import { authApi } from '../../api';
import { api } from '../../apiClient';
import { Banner } from '../../components/Banner';
import { Loading } from '../../components/Spinner';
import { AuthLayout } from './AuthLayout';

export function VerifyPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [state, setState] = useState<'working' | 'done' | 'failed'>(token ? 'working' : 'failed');
  const [email, setEmail] = useState('');
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    authApi
      .verify(api, token)
      .then((r) => {
        setEmail(r.email);
        setState('done');
      })
      .catch(() => setState('failed'));
  }, [token]);

  return (
    <AuthLayout
      title={t('auth.verifyTitle')}
      pageTitle={t('pageTitles.verify')}
      footer={<Link to="/login">{t('auth.goToLogin')}</Link>}
    >
      {state === 'working' ? <Loading label={t('auth.verifyWorking')} /> : null}
      {state === 'done' ? <Banner tone="success">{t('auth.verifySuccess', { email })}</Banner> : null}
      {state === 'failed' ? (
        <Banner tone="danger">{token ? t('auth.verifyFailed') : t('auth.verifyMissing')}</Banner>
      ) : null}
    </AuthLayout>
  );
}
