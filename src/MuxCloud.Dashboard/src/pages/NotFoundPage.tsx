import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { usePageTitle } from '../context/PageTitleContext';

export function NotFoundPage() {
  const { t } = useTranslation();
  usePageTitle(t('pageTitles.notFound'));
  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <h1>{t('notFound.title')}</h1>
        <p className="muted">{t('notFound.body')}</p>
        <Link className="btn btn-primary" to="/machines">
          {t('notFound.home')}
        </Link>
      </div>
    </div>
  );
}
