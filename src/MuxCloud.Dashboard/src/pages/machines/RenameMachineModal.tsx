import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { machinesApi } from '../../api';
import { api } from '../../apiClient';
import { ErrorBanner } from '../../components/ErrorBanner';
import { Modal } from '../../components/Modal';
import { CopyableId } from '../../components/CopyButton';
import type { Machine } from '../../types';

export function RenameMachineModal({
  machine,
  onClose,
  onSaved,
}: {
  machine: Machine;
  onClose: () => void;
  onSaved: (machine: Machine) => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(machine.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const valid = name.trim().length >= 1 && name.trim().length <= 100;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      onSaved(await machinesApi.rename(api, machine.id, name.trim()));
      onClose();
    } catch (e) {
      setError(e);
      setBusy(false);
    }
  };

  return (
    <Modal
      title={t('machines.renameTitle')}
      subtitle={<CopyableId value={machine.id} />}
      size="sm"
      onClose={onClose}
      blocking={busy}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </button>
          <button type="submit" form="rename-form" className="btn btn-primary" disabled={busy || !valid}>
            {busy ? t('common.saving') : t('common.save')}
          </button>
        </>
      }
    >
      <form id="rename-form" className="form-stack" onSubmit={submit}>
        {error ? <ErrorBanner error={error} /> : null}
        <div className="field">
          <label htmlFor="machine-name">{t('machines.renameLabel')}</label>
          <input
            id="machine-name"
            className="input"
            value={name}
            maxLength={100}
            onChange={(e) => setName(e.target.value)}
            data-autofocus
          />
          <span className="field-hint">{t('machines.renameHint')}</span>
        </div>
      </form>
    </Modal>
  );
}
