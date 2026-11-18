import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ConversationView } from '@/components/ConversationView';
import { Empty, Screen } from '@/components/ui';
import { useAccount } from '@/state/AccountContext';

/** One conversation (phone layout, push deep links). `new` starts a conversation with the chosen endpoint and folder. */
export default function ConversationScreen() {
  const { machineId, sessionId, endpoint, cwd } = useLocalSearchParams<{ machineId: string; sessionId: string; endpoint?: string; cwd?: string }>();
  const { t } = useTranslation();
  const { machine } = useAccount();
  const m = machine(machineId);
  if (!m) {
    return (
      <Screen>
        <Empty title={t('machineDetail.notFoundTitle')} body={t('machineDetail.notFoundBody')} />
      </Screen>
    );
  }
  const isNew = sessionId === 'new';
  return (
    <>
      <Stack.Screen options={{ title: isNew ? t('conversations.newConversation') : t('conversations.colTitle') }} />
      <ConversationView
        machineId={machineId}
        machineName={m.name}
        online={m.online}
        sessionId={isNew ? null : sessionId}
        initialEndpoint={endpoint}
        workingDirectory={cwd}
        onSessionCreated={(id) => router.setParams({ sessionId: id })}
        onOpenScreen={(segment) => router.push({ pathname: '/machines/[machineId]/manage/[resource]', params: { machineId, resource: segment } })}
        onNewConversation={() => router.replace({ pathname: '/machines/[machineId]/new', params: { machineId } })}
      />
    </>
  );
}
