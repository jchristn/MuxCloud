import React, { useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { formatRelativeTime } from '@dashboard/lib';
import type { MuxApi } from '@/relay/muxApi';
import { useAsync } from '@/state/useAsync';
import { facetsOf, filterSessions } from '@/lib/sessions';
import type { MuxSessionSummary } from '@/types/mux';
import { spacing } from '@/theme/palette';
import { SessionActions } from './SessionActions';
import { Badge, Button, Empty, ErrorBox, Field, ListRow, Loading, Segmented } from './ui';

/** A machine's conversations with search, label and tag filters, bulk delete, and per-conversation actions. */
export function ConversationList({
  api,
  online,
  selectedId,
  onSelect,
  onNew,
  header,
}: {
  api: MuxApi;
  online: boolean;
  selectedId?: string | null;
  onSelect: (sessionId: string) => void;
  onNew: () => void;
  header?: React.ReactNode;
}) {
  const { t, i18n } = useTranslation();
  const sessions = useAsync(() => (online ? api.sessions().then((r) => r.Items ?? []) : Promise.resolve([] as MuxSessionSummary[])), [api, online]);
  const [search, setSearch] = useState('');
  const [facet, setFacet] = useState('');
  const [managing, setManaging] = useState<MuxSessionSummary | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const all = useMemo(() => sessions.data ?? [], [sessions.data]);
  const visible = useMemo(() => filterSessions(all, search, facet), [all, search, facet]);
  const facets = useMemo(() => facetsOf(all), [all]);

  const deletePicked = () =>
    Alert.alert(t('mobile.session.bulkDeleteTitle', { count: picked.length }), t('mobile.session.deleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          for (const id of picked) await api.deleteSession(id).catch(() => undefined);
          setPicked([]);
          setSelecting(false);
          void sessions.reload();
        },
      },
    ]);

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: spacing.xxl }}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={sessions.loading && sessions.data !== null} onRefresh={() => void sessions.reload()} />}
    >
      {header}
      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Button title={t('conversations.newConversation')} onPress={onNew} disabled={!online} style={{ flex: 1 }} />
          <Button
            title={selecting ? t('common.cancel') : t('mobile.session.select')}
            kind="secondary"
            onPress={() => {
              setSelecting((v) => !v);
              setPicked([]);
            }}
          />
        </View>
        {selecting && picked.length > 0 ? <Button title={t('mobile.session.deleteSelected', { count: picked.length })} kind="danger" onPress={deletePicked} /> : null}
        <Field label={t('common.search')} placeholder={t('conversations.searchPlaceholder')} value={search} onChangeText={setSearch} autoCapitalize="none" autoCorrect={false} />
        {facets.length > 0 ? (
          <Segmented label={t('mobile.common.filter')} value={facet} onChange={setFacet} options={[{ value: '', label: t('mobile.common.all') }, ...facets.map((f) => ({ value: f, label: f }))]} />
        ) : null}
        {sessions.error ? <ErrorBox error={sessions.error} onRetry={() => void sessions.reload()} /> : null}
        {!online ? <Empty title={t('errors.MachineOffline')} body={t('mobile.machine.offlineConversations')} /> : null}
      </View>
      {sessions.loading && sessions.data === null && online ? <Loading /> : null}
      {online && !sessions.loading && all.length === 0 ? <Empty title={t('conversations.emptyTitle')} /> : null}
      {online && all.length > 0 && visible.length === 0 ? <Empty title={t('conversations.noMatches')} /> : null}
      {visible.map((s) => {
        const isPicked = picked.includes(s.Id);
        return (
          <ListRow
            key={s.Id}
            title={s.Title || t('conversations.untitled')}
            subtitle={[s.Model, s.WorkingDirectory, s.UpdatedUtc ? formatRelativeTime(i18n.language, s.UpdatedUtc) : ''].filter(Boolean).join(' · ')}
            selected={selecting ? isPicked : selectedId === s.Id}
            trailing={
              <View style={{ alignItems: 'flex-end', gap: spacing.xs }}>
                {typeof s.MessageCount === 'number' ? <Badge label={String(s.MessageCount)} /> : null}
                {(s.Labels ?? []).slice(0, 2).map((l) => (
                  <Badge key={l} label={l} tone="info" />
                ))}
              </View>
            }
            onPress={() => {
              if (selecting) setPicked((list) => (isPicked ? list.filter((x) => x !== s.Id) : [...list, s.Id]));
              else onSelect(s.Id);
            }}
            onLongPress={() => setManaging(s)}
            accessibilityLabel={(s.Title || t('conversations.untitled')) + '. ' + t('mobile.session.longPressHint')}
          />
        );
      })}
      <SessionActions
        key={managing?.Id ?? 'none'}
        api={api}
        session={managing}
        onClose={() => setManaging(null)}
        onChanged={() => {
          void sessions.reload();
        }}
      />
    </ScrollView>
  );
}
