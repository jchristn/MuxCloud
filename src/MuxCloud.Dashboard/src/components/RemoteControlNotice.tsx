import { useTranslation } from 'react-i18next';
import { Banner } from './Banner';

/** States that the account can operate connected machines, and how to turn remote tool approval off. */
export function RemoteControlNotice() {
  const { t } = useTranslation();
  return (
    <Banner tone="warning" icon="shield" title={t('remote.title')}>
      <span>{t('remote.body')}</span>
      <span className="small">{t('remote.disableHint', { setting: 'cloud.allowRemoteToolApproval' })}</span>
    </Banner>
  );
}
