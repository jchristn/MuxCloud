import { useTranslation } from 'react-i18next';
import { Card, T } from './ui';

/** The parity notice: this account can operate machines remotely, including approving tools, and how to turn that off. */
export function RemoteNotice() {
  const { t } = useTranslation();
  return (
    <Card>
      <T variant="title">{t('remote.title')}</T>
      <T variant="muted">{t('remote.body')}</T>
      <T variant="small">{t('remote.disableHint', { setting: 'cloud.allowRemoteToolApproval' })}</T>
    </Card>
  );
}
