import { useState } from 'react';
import { View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ConversationList } from '@/components/ConversationList';
import { ConversationView } from '@/components/ConversationView';
import { MachineHeader } from '@/components/MachineHeader';
import { Button, Empty, Loading, Screen } from '@/components/ui';
import { useAccount } from '@/state/AccountContext';
import { useIsWide } from '@/state/useLayout';
import { useMachineApi } from '@/state/useMachineApi';
import { useTheme } from '@/theme/ThemeContext';

/** A machine: its conversations, and on tablets the selected conversation beside the list. */
export default function MachineScreen() {
  const { machineId } = useLocalSearchParams<{ machineId: string }>();
  const { t } = useTranslation();
  const p = useTheme();
  const { machine, loading } = useAccount();
  const api = useMachineApi(machineId);
  const wide = useIsWide();
  const [selected, setSelected] = useState<string | null>(null);
  const m = machine(machineId);

  if (!m) {
    return (
      <Screen>
        <Stack.Screen options={{ title: '' }} />
        {loading ? <Loading /> : <Empty title={t('machineDetail.notFoundTitle')} body={t('machineDetail.notFoundBody')} action={<Button title={t('machineDetail.allMachines')} onPress={() => router.navigate('/machines')} />} />}
      </Screen>
    );
  }

  const openNew = () => router.push({ pathname: '/machines/[machineId]/new', params: { machineId } });
  const openScreen = (segment: string) => router.push({ pathname: '/machines/[machineId]/manage/[resource]', params: { machineId, resource: segment } });

  const list = (
    <ConversationList
      api={api}
      online={m.online}
      selectedId={wide ? selected : null}
      header={<MachineHeader machine={m} />}
      onNew={openNew}
      onSelect={(id) => {
        if (wide) setSelected(id);
        else router.push({ pathname: '/machines/[machineId]/conversation/[sessionId]', params: { machineId, sessionId: id } });
      }}
    />
  );

  return (
    <>
      <Stack.Screen options={{ title: m.name }} />
      {wide ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ width: 380, borderRightColor: p.line, borderRightWidth: 1 }}>{list}</View>
          <View style={{ flex: 1 }}>
            {selected ? (
              <ConversationView key={selected} machineId={machineId} machineName={m.name} online={m.online} sessionId={selected} onOpenScreen={openScreen} onNewConversation={openNew} />
            ) : (
              <Empty title={t('mobile.machine.pickConversation')} action={<Button title={t('conversations.newConversation')} onPress={openNew} disabled={!m.online} />} />
            )}
          </View>
        </View>
      ) : (
        list
      )}
    </>
  );
}
