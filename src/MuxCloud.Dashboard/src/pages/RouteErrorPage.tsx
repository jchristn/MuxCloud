import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouteError } from 'react-router';
import { Icon } from '../components/Icon';
import { isStaleBuildError } from '../lib/staleBuild';

/**
 * Route error screen. A chunk that failed to load almost always means the dashboard was redeployed while this tab
 * was open, so that case says so and offers a reload instead of showing an error.
 */
export function RouteErrorPage() {
  const { t } = useTranslation();
  const error = useRouteError();
  const stale = isStaleBuildError(error);
  const title = stale ? t('errorPage.updatedTitle') : t('errorPage.title');
  useEffect(() => {
    document.title = title + ' · Mux Cloud';
  }, [title]);
  return (
    <div className="auth-page">
      <div className="auth-utility" />
      <main className="auth-main">
        <div className="auth-card">
          <div className="auth-heading auth-heading-centered">
            <span className={'empty-icon' + (stale ? '' : ' empty-icon-danger')} aria-hidden="true">
              <Icon name={stale ? 'refresh' : 'alert'} size={26} />
            </span>
            <h1>{title}</h1>
            <p>{stale ? t('errorPage.updatedBody') : t('errorPage.body')}</p>
          </div>
          <button type="button" className="btn btn-primary btn-block btn-lg" onClick={() => window.location.reload()}>
            {t('errorPage.reload')}
          </button>
          <div className="auth-links">
            <a href="/machines">{t('errorPage.home')}</a>
          </div>
        </div>
      </main>
      <footer className="auth-legal" />
    </div>
  );
}
