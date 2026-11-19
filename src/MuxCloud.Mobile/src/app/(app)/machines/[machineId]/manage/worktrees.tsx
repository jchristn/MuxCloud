import { useState } from 'react';
import { Alert, RefreshControl, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ApiError } from '@dashboard/api';
import { formatRelativeTime } from '@dashboard/lib';
import { Badge, Button, Empty, ErrorBox, Field, ListRow, Loading, Notice, Screen, T } from '@/components/ui';
import { useAsync } from '@/state/useAsync';
import { useMachineApi } from '@/state/useMachineApi';
import type { MuxWorktree } from '@/types/mux';
import { spacing } from '@/theme/palette';

/** The isolated git worktrees mux keeps for subagents and jobs in a repository: list, prune, and remove. */
export default function WorktreesScreen() {
  const { machineId, folder: initialFolder } = useLocalSearchParams<{ machineId: string; folder?: string }>();
  const { t, i18n } = useTranslation();
  const api = useMachineApi(machineId);
  const [folderInput, setFolderInput] = useState(initialFolder ?? '');
  const [folder, setFolder] = useState(initialFolder ?? '');
  const list = useAsync(() => api.worktrees(folder || null), [api, folder]);
  const [error, setError] = useState<unknown>(null);
  const [message, setMessage] = useState<string | null>(null);
  const items = list.data?.Items ?? [];

  const prune = async () => {
    setError(null);
    try {
      const r = (await api.pruneWorktrees(folder || null)) as { Removed?: string[]; Items?: string[] };
      const removed = r.Removed ?? r.Items ?? [];
      setMessage(removed.length ? t('mobile.worktrees.pruned', { count: removed.length }) : t('mobile.worktrees.nothingToPrune'));
      void list.reload();
    } catch (e) {
      setError(e);
    }
  };

  const remove = (w: MuxWorktree, force = false) =>
    Alert.alert(t('mobile.form.deleteTitle', { name: w.Name }), force ? t('mobile.worktrees.forceBody') : t('mobile.worktrees.removeBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: force ? t('mobile.worktrees.forceRemove') : t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          setError(null);
          try {
            await api.deleteWorktree(w.Name, force, folder || null);
            void list.reload();
          } catch (e) {
            // 409: removing it would lose uncommitted changes or unmerged commits.
            if (e instanceof ApiError && e.status === 409 && !force) remove(w, true);
            else setError(e);
          }
        },
      },
    ]);

  return (
    <Screen refreshControl={<RefreshControl refreshing={list.loading && !!list.data} onRefresh={() => void list.reload()} />}>
      <Stack.Screen options={{ title: t('mobile.worktrees.title') }} />
      <T variant="muted">{t('mobile.worktrees.intro')}</T>
      <Field
        label={t('mobile.memory.folder')}
        hint={t('mobile.worktrees.folderHint')}
        placeholder={t('mobile.new.folderPlaceholder')}
        value={folderInput}
        onChangeText={setFolderInput}
        onSubmitEditing={() => setFolder(folderInput.trim())}
        onBlur={() => setFolder(folderInput.trim())}
        autoCapitalize="none"
        autoCorrect={false}
        grow
      />
      <Button title={t('mobile.worktrees.prune')} kind="secondary" onPress={() => void prune()} disabled={!list.data} accessibilityHint={t('mobile.worktrees.pruneHint')} />
      {message ? <Notice tone="success" text={message} /> : null}
      {list.error ? <ErrorBox error={list.error} onRetry={() => void list.reload()} /> : null}
      {error ? <ErrorBox error={error} /> : null}
      {list.loading && !list.data ? <Loading /> : null}
      {list.data && items.length === 0 ? <Empty title={t('mobile.worktrees.none')} body={t('mobile.worktrees.noneBody')} /> : null}
      <View style={{ marginHorizontal: -spacing.lg }}>
        {items.map((w) => (
          <ListRow
            key={w.Name}
            title={w.Name}
            subtitle={[w.Branch, w.Kind, w.CreatedUtc ? formatRelativeTime(i18n.language, w.CreatedUtc) : ''].filter(Boolean).join(' · ')}
            trailing={
              <View style={{ alignItems: 'flex-end', gap: spacing.xs }}>
                {w.Dirty ? <Badge label={t('mobile.worktrees.dirty')} tone="warning" /> : null}
                {w.CommitsAhead > 0 ? <Badge label={t('mobile.worktrees.ahead', { count: w.CommitsAhead })} tone="info" /> : null}
                {!w.Exists ? <Badge label={t('mobile.worktrees.missing')} tone="danger" /> : null}
              </View>
            }
            onPress={() => remove(w)}
            accessibilityLabel={w.Name + '. ' + t('mobile.worktrees.tapToRemove')}
          />
        ))}
      </View>
      {items.length > 0 ? <T variant="small">{t('mobile.worktrees.tapToRemove')}</T> : null}
    </Screen>
  );
}
