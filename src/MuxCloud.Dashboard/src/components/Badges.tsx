import { useTranslation } from 'react-i18next';
import { machineStatus } from '../lib/machines';
import type { Machine } from '../types';

export function MachineStatusPill({ machine }: { machine: Machine }) {
  const { t } = useTranslation();
  const status = machineStatus(machine);
  const map = {
    online: { cls: 'pill-success', key: 'machines.statusOnline' },
    approval: { cls: 'pill-warning', key: 'machines.statusApproval' },
    offline: { cls: '', key: 'machines.statusOffline' },
    revoked: { cls: 'pill-danger', key: 'machines.statusRevoked' },
  }[status];
  return (
    <span className={'pill ' + map.cls}>
      <span className="dot" aria-hidden="true" />
      {t(map.key)}
    </span>
  );
}

export function MethodBadge({ method }: { method: string }) {
  return <span className={'method method-' + method.toUpperCase()}>{method.toUpperCase()}</span>;
}

/** Status code with a symbol so failures do not rely on color alone. */
export function StatusCodeBadge({ code }: { code: number }) {
  const ok = code < 400;
  return (
    <span className={'pill ' + (ok ? 'pill-success' : 'pill-danger')}>
      <span aria-hidden="true">{ok ? '✓' : '✕'}</span>
      {code}
    </span>
  );
}

export function YesNo({ value }: { value: boolean | undefined }) {
  const { t } = useTranslation();
  return <span className={'pill ' + (value ? 'pill-success' : '')}>{value ? t('common.yes') : t('common.no')}</span>;
}
