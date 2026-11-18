import { useTranslation } from 'react-i18next';
import { errorText } from '../lib/errors';
import { Icon } from './Icon';

/** A localized error with the server's detail and an optional retry. */
export function ErrorBanner({ error, onRetry, title }: { error: unknown; onRetry?: () => void; title?: string }) {
  const { t } = useTranslation();
  const text = errorText(error);
  const message = t(text.key, text.values);
  return (
    <div className="banner banner-danger" role="alert">
      <Icon name="alert" />
      <div className="banner-body">
        <span className="banner-title">{title ?? message}</span>
        {title ? <span>{message}</span> : null}
        {text.key === 'errors.generic' && text.detail ? <span className="small">{text.detail}</span> : null}
        {onRetry ? (
          <div>
            <button type="button" className="btn btn-sm" onClick={onRetry}>
              <Icon name="refresh" size={14} />
              {t('common.retry')}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
