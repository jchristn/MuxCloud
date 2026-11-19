import { useState } from 'react';
import { Alert, RefreshControl, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { formatRelativeTime } from '@dashboard/lib';
import { Sheet } from '@/components/Sheet';
import { Badge, Button, Empty, ErrorBox, Field, ListRow, Loading, Notice, Screen, Section, Segmented, T } from '@/components/ui';
import { memoryNameFromText } from '@/lib/chatCommands';
import { useAsync } from '@/state/useAsync';
import { useMachineApi } from '@/state/useMachineApi';
import type { MuxMemory } from '@/types/mux';
import { spacing } from '@/theme/palette';

/**
 * Persistent memories on the machine (the files `mux memory`, `/memory`, `#` lines, and the model's remember tool
 * share): list by scope for a folder, read, add, delete, and clear a scope.
 */
export default function MemoryScreen() {
  const { machineId, folder: initialFolder } = useLocalSearchParams<{ machineId: string; folder?: string }>();
  const { t, i18n } = useTranslation();
  const api = useMachineApi(machineId);
  const [folderInput, setFolderInput] = useState(initialFolder ?? '');
  const [folder, setFolder] = useState(initialFolder ?? '');
  const list = useAsync(() => api.memory(folder || null), [api, folder]);
  const [open, setOpen] = useState<MuxMemory | null>(null);
  const [adding, setAdding] = useState<{ text: string; scope: 'project' | 'global' } | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const memories = list.data?.Memories ?? [];
  const project = memories.filter((m) => m.Scope !== 'global');
  const global = memories.filter((m) => m.Scope === 'global');

  const remove = (m: MuxMemory) =>
    Alert.alert(t('mobile.form.deleteTitle', { name: m.Name }), t('mobile.memory.deleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteMemory(m.Name, m.Scope, folder || null);
            setOpen(null);
            void list.reload();
          } catch (e) {
            setError(e);
          }
        },
      },
    ]);

  const clear = (scope: 'project' | 'global') => {
    const doomed = memories.filter((m) => (scope === 'global' ? m.Scope === 'global' : m.Scope !== 'global'));
    Alert.alert(t('mobile.memory.clearTitle', { count: doomed.length }), t('mobile.memory.clearBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          for (const m of doomed) await api.deleteMemory(m.Name, m.Scope, folder || null).catch(() => undefined);
          void list.reload();
        },
      },
    ]);
  };

  const add = async () => {
    if (!adding) return;
    const text = adding.text.trim();
    const name = memoryNameFromText(text);
    if (!name) {
      setError(new Error(t('mobile.memory.needWords')));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.saveMemory({ Name: name, Description: text, Content: text, Scope: adding.scope, WorkingDirectory: folder || null });
      setAdding(null);
      void list.reload();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  const row = (m: MuxMemory) => (
    <ListRow
      key={m.Scope + ':' + m.Name}
      title={m.Name}
      subtitle={[m.Description, m.UpdatedUtc ? formatRelativeTime(i18n.language, m.UpdatedUtc) : ''].filter(Boolean).join(' · ')}
      onPress={() => setOpen(m)}
      onLongPress={() => remove(m)}
    />
  );

  return (
    <Screen refreshControl={<RefreshControl refreshing={list.loading && !!list.data} onRefresh={() => void list.reload()} />}>
      <Stack.Screen options={{ title: t('mobile.memory.title') }} />
      <T variant="muted">{t('mobile.memory.intro')}</T>
      <Field
        label={t('mobile.memory.folder')}
        hint={t('mobile.memory.folderHint')}
        placeholder={t('mobile.new.folderPlaceholder')}
        value={folderInput}
        onChangeText={setFolderInput}
        onSubmitEditing={() => setFolder(folderInput.trim())}
        onBlur={() => setFolder(folderInput.trim())}
        autoCapitalize="none"
        autoCorrect={false}
        grow
      />
      <Button title={t('mobile.memory.add')} onPress={() => setAdding({ text: '', scope: 'project' })} />
      {list.error ? <ErrorBox error={list.error} onRetry={() => void list.reload()} /> : null}
      {error ? <ErrorBox error={error} /> : null}
      {list.loading && !list.data ? <Loading /> : null}
      {list.data && !list.data.Enabled ? <Notice tone="warning" text={t('mobile.memory.disabled')} /> : null}
      {list.data ? <T variant="small">{list.data.WorkingDirectory}</T> : null}
      {list.data && memories.length === 0 ? <Empty title={t('mobile.memory.none')} body={t('mobile.memory.noneBody')} /> : null}
      {project.length > 0 ? (
        <Section title={t('mobile.memory.project')} action={<Button compact kind="secondary" title={t('mobile.memory.clear')} onPress={() => clear('project')} />}>
          <View style={{ marginHorizontal: -spacing.lg }}>{project.map(row)}</View>
        </Section>
      ) : null}
      {global.length > 0 ? (
        <Section title={t('mobile.memory.global')} action={<Button compact kind="secondary" title={t('mobile.memory.clear')} onPress={() => clear('global')} />}>
          <View style={{ marginHorizontal: -spacing.lg }}>{global.map(row)}</View>
        </Section>
      ) : null}
      <Sheet
        visible={open !== null}
        title={open?.Name ?? ''}
        onClose={() => setOpen(null)}
        footer={open ? <Button kind="danger" title={t('common.delete')} onPress={() => remove(open)} /> : null}
      >
        {open ? (
          <>
            <Badge label={open.Scope === 'global' ? t('mobile.memory.global') : t('mobile.memory.project')} tone="info" />
            <T selectable>{open.Content || open.Description}</T>
          </>
        ) : null}
      </Sheet>
      <Sheet
        visible={adding !== null}
        title={t('mobile.memory.add')}
        onClose={() => setAdding(null)}
        footer={<Button title={t('common.save')} busy={busy} disabled={!adding?.text.trim()} onPress={() => void add()} />}
      >
        {adding ? (
          <>
            <Segmented
              value={adding.scope}
              onChange={(scope) => setAdding({ ...adding, scope })}
              options={[
                { value: 'project', label: t('mobile.memory.project') },
                { value: 'global', label: t('mobile.memory.global') },
              ]}
            />
            <Field label={t('mobile.memory.text')} hint={t('mobile.memory.textHint')} value={adding.text} onChangeText={(text) => setAdding({ ...adding, text })} multiline />
          </>
        ) : null}
      </Sheet>
    </Screen>
  );
}
