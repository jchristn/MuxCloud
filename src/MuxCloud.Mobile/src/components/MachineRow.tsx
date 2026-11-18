import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { formatRelativeTime, machineStatus } from '@dashboard/lib';
import type { Machine } from '@dashboard/types';
import { spacing } from '@/theme/palette';
import { Badge, ListRow, StatusDot } from './ui';

/** "macOS 26.6.0 Arm64" becomes "macOS 26.6.0": the CPU architecture rarely matters at list level. */
export function shortOs(os: string | undefined): string {
  return (os ?? '').replace(/\s+(Arm64|X64|X86|Arm|aarch64|x86_64|amd64)$/i, '');
}

const STATUS_KEY = { online: 'machines.statusOnline', offline: 'machines.statusOffline', revoked: 'machines.statusRevoked', approval: 'machines.statusApproval' } as const;

/** One machine: live status, version, last seen, active runs, and an approval badge. */
export function MachineRow({ machine, onPress, selected }: { machine: Machine; onPress: () => void; selected?: boolean }) {
  const { t, i18n } = useTranslation();
  const status = machineStatus(machine);
  const seen = machine.online ? t('machines.statusOnline') : machine.lastSeenUtc ? t('mobile.machine.lastSeen', { time: formatRelativeTime(i18n.language, machine.lastSeenUtc) }) : t('machines.neverSeen');
  return (
    <ListRow
      title={machine.name}
      subtitle={[seen, machine.muxVersion ? 'mux ' + machine.muxVersion : '', shortOs(machine.os)].filter(Boolean).join(' · ')}
      leading={<StatusDot status={status} />}
      selected={selected}
      onPress={onPress}
      accessibilityLabel={machine.name + ', ' + t(STATUS_KEY[status])}
      trailing={
        <View style={{ alignItems: 'flex-end', gap: spacing.xs }}>
          {machine.awaitingApproval > 0 ? <Badge tone="warning" label={t('mobile.machine.awaiting', { count: machine.awaitingApproval })} /> : null}
          {machine.online && machine.activeRuns > 0 ? <Badge tone="info" label={t('mobile.machine.runs', { count: machine.activeRuns })} /> : null}
          {status === 'revoked' ? <Badge tone="danger" label={t('machines.statusRevoked')} /> : null}
        </View>
      }
    />
  );
}
