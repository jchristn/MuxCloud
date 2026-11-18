import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { formatRelativeTime, machineStatus } from '@dashboard/lib';
import type { Machine } from '@dashboard/types';
import { useAccount } from '@/state/AccountContext';
import { spacing } from '@/theme/palette';
import { ConnectionBanner } from './ConnectionBanner';
import { MachineRow, shortOs } from './MachineRow';
import { Sheet } from './Sheet';
import { Badge, Button, Card, Notice, StatusDot, T } from './ui';

/** Machine summary above its conversations, with a switcher to jump to another machine and the Manage entry. */
export function MachineHeader({ machine }: { machine: Machine }) {
  const { t, i18n } = useTranslation();
  const { machines } = useAccount();
  const [switching, setSwitching] = useState(false);
  const status = machineStatus(machine);
  return (
    <View style={{ padding: spacing.lg, paddingBottom: 0, gap: spacing.sm }}>
      <ConnectionBanner />
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <StatusDot status={status} />
          <T variant="title" style={{ flex: 1 }} numberOfLines={1}>
            {machine.name}
          </T>
        </View>
        {/* Its own line: in longer languages a badge beside the name would truncate the name. */}
        <Badge tone={machine.remoteToolApproval ? 'success' : 'neutral'} label={t('machines.colRemoteApproval') + ': ' + (machine.remoteToolApproval ? t('machines.remoteApprovalOn') : t('machines.remoteApprovalOff'))} />
        <T variant="small">
          {[machine.online ? t('machines.statusOnline') : machine.lastSeenUtc ? t('mobile.machine.lastSeen', { time: formatRelativeTime(i18n.language, machine.lastSeenUtc) }) : t('machines.neverSeen'), machine.hostname, shortOs(machine.os), machine.muxVersion ? 'mux ' + machine.muxVersion : '']
            .filter(Boolean)
            .join(' · ')}
        </T>
        {machine.awaitingApproval > 0 ? <Notice tone="warning" text={t('machineDetail.approvalWaiting')} /> : null}
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Button title={t('mobile.machine.manage')} kind="secondary" compact disabled={!machine.online} onPress={() => router.push({ pathname: '/machines/[machineId]/manage', params: { machineId: machine.id } })} />
          <Button title={t('machineDetail.switchTo')} kind="ghost" compact onPress={() => setSwitching(true)} />
        </View>
      </Card>
      <Sheet visible={switching} title={t('machineDetail.switchTo')} onClose={() => setSwitching(false)}>
        <View style={{ marginHorizontal: -spacing.lg }}>
          {machines
            .filter((m) => !m.revoked)
            .map((m) => (
              <MachineRow
                key={m.id}
                machine={m}
                selected={m.id === machine.id}
                onPress={() => {
                  setSwitching(false);
                  router.replace({ pathname: '/machines/[machineId]', params: { machineId: m.id } });
                }}
              />
            ))}
        </View>
        <Button title={t('machineDetail.allMachines')} kind="secondary" onPress={() => { setSwitching(false); router.navigate('/machines'); }} />
      </Sheet>
    </View>
  );
}
