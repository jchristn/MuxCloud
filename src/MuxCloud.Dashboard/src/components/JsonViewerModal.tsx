import { useTranslation } from 'react-i18next';
import { Modal } from './Modal';
import { CodeBlock } from './CodeBlock';

export function JsonViewerModal({ title, value, onClose }: { title?: string; value: unknown; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Modal title={title ?? t('modal.jsonTitle')} size="lg" onClose={onClose}>
      <CodeBlock text={JSON.stringify(value, null, 2)} label={t('modal.jsonTitle')} />
    </Modal>
  );
}
