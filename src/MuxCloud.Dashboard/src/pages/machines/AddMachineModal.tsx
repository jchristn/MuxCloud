import { useTranslation } from 'react-i18next';
import { CopyButton } from '../../components/CopyButton';
import { Icon } from '../../components/Icon';
import { Modal } from '../../components/Modal';
import { RemoteControlNotice } from '../../components/RemoteControlNotice';

const STEPS: Array<{ icon: string; title: string; body: string; command?: string }> = [
  { icon: 'terminal', title: 'addMachine.cliTitle', body: 'addMachine.cliBody', command: 'mux cloud login' },
  { icon: 'terminal', title: 'addMachine.tuiTitle', body: 'addMachine.tuiBody', command: '/cloud' },
  { icon: 'server', title: 'addMachine.desktopTitle', body: 'addMachine.desktopBody' },
  { icon: 'globe', title: 'addMachine.dashboardTitle', body: 'addMachine.dashboardBody' },
  { icon: 'braces', title: 'addMachine.vscodeTitle', body: 'addMachine.vscodeBody' },
  { icon: 'plug', title: 'addMachine.trayTitle', body: 'addMachine.trayBody' },
];

/** How to connect a machine from each mux surface. */
export function AddMachineModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Modal
      title={t('addMachine.title')}
      size="lg"
      onClose={onClose}
      footer={
        <button type="button" className="btn btn-primary" onClick={onClose}>
          {t('common.close')}
        </button>
      }
    >
      <div className="form-stack">
        <p>{t('addMachine.intro')}</p>
        <RemoteControlNotice />
        <div className="form-grid">
          {STEPS.map((step) => (
            <div key={step.title} className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="row">
                <Icon name={step.icon} />
                <strong>{t(step.title)}</strong>
              </div>
              <span className="small">{t(step.body)}</span>
              {step.command ? (
                <span className="copyable">
                  <code className="value">{step.command}</code>
                  <CopyButton value={step.command} label={step.command} />
                </span>
              ) : null}
            </div>
          ))}
        </div>
        <div className="small">
          <strong>{t('addMachine.serverTitle')}</strong>
          <p className="muted">{t('addMachine.serverBody', { url: window.location.origin })}</p>
        </div>
      </div>
    </Modal>
  );
}
