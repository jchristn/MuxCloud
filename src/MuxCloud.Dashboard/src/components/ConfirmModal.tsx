import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from './Modal';
import { ErrorBanner } from './ErrorBanner';

interface ConfirmModalProps {
  title: ReactNode;
  body: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => Promise<void> | void;
  onClose: () => void;
  children?: ReactNode;
  confirmDisabled?: boolean;
}

/** Confirmation dialog. Stays open with the error shown when the action fails. */
export function ConfirmModal({
  title,
  body,
  confirmLabel,
  danger = false,
  onConfirm,
  onClose,
  children,
  confirmDisabled,
}: ConfirmModalProps) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (e) {
      setError(e);
      setBusy(false);
    }
  };

  return (
    <Modal
      title={title}
      size="sm"
      onClose={onClose}
      blocking={busy}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className={'btn ' + (danger ? 'btn-danger' : 'btn-primary')}
            onClick={run}
            disabled={busy || confirmDisabled}
            data-autofocus
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="form-stack">
        {error ? <ErrorBanner error={error} /> : null}
        <div>{body}</div>
        {children}
      </div>
    </Modal>
  );
}
