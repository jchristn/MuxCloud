import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

/** Set document.title to "<page> | Mux Cloud" in the active locale. */
export function useDocumentTitle(page: string | null | undefined): void {
  const { t } = useTranslation();
  useEffect(() => {
    document.title = page ? page + ' | ' + t('common.appName') : t('common.appName');
  }, [page, t]);
}
