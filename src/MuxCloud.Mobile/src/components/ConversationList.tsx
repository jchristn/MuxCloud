import React, { useEffect, useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { formatRelativeTime } from '@dashboard/lib';
import type { MuxApi } from '@/relay/muxApi';
import { useAsync } from '@/state/useAsync';
import { facetsOf, filterSessions, folderName } from '@/lib/sessions';
import { sessionStatuses, type SessionStatus } from '@/lib/chatStats';
import { loadSeen, seenBaseline } from '@/storage/chatStore';
import { useTheme } from '@/theme/ThemeContext';
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
  const p = useTheme();
  const sessions = useAsync(() => (online ? api.sessions().then((r) => r.Items ?? []) : Promise.resolve([] as MuxSessionSummary[])), [api, online]);
  const [search, setSearch] = useState('');
  const [facet, setFacet] = useState('');
  const [managing, setManaging] = useState<MuxSessionSummary | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const all = useMemo(() => sessions.data ?? [], [sessions.data]);
  const visible = useMemo(() => filterSessions(all, search, facet), [all, search, facet]);
  const facets = useMemo(() => facetsOf(all), [all]);
  // Status dots: live runs (GET /runs) and conversations changed since this device last opened them.
  const runs = useAsync(() => (online ? api.runs().then((r) => r.Items ?? []) : Promise.resolve([])), [api, online, sessions.data]);
  const [seen, setSeen] = useState<{ map: Record<string, number>; baseline: number } | null>(null);
  useEffect(() => {
    let alive = true;
    void Promise.all([loadSeen(api.machineId), seenBaseline()]).then(([map, baseline]) => alive && setSeen({ map, baseline }));
    return () => {
      alive = false;
    };
  }, [api.machineId, sessions.data, selectedId]);
  const statuses = useMemo(
    () => (seen ? sessionStatuses(runs.data ?? [], all, seen.map, seen.baseline) : ({} as Record<string, SessionStatus>)),
    [runs.data, all, seen],
  );
  const dotColor: Record<SessionStatus, string> = { running: p.accent, approval: p.warning, error: p.danger, unread: p.info };

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
          {online ? (
          <Button
            title={selecting ? t('common.cancel') : t('mobile.session.select')}
            kind="secondary"
            onPress={() => {
              setSelecting((v) => !v);
              setPicked([]);
            }}
          />
          ) : null}
        </View>
        {selecting && picked.length > 0 ? <Button title={t('mobile.session.deleteSelected', { count: picked.length })} kind="danger" onPress={deletePicked} /> : null}
        {/* Nothing to search or filter while the machine (where conversations live) is offline. */}
        {online ? <Field label={t('common.search')} placeholder={t('conversations.searchPlaceholder')} value={search} onChangeText={setSearch} autoCapitalize="none" autoCorrect={false} /> : null}
        {online && facets.length > 0 ? (
          <Segmented scroll label={t('mobile.common.filter')} value={facet} onChange={setFacet} options={[{ value: '', label: t('mobile.common.all') }, ...facets.map((f) => ({ value: f, label: f }))]} />
        ) : null}
        {sessions.error ? <ErrorBox error={sessions.error} onRetry={() => void sessions.reload()} /> : null}
        {!online ? <Empty title={t('errors.MachineOffline')} body={t('mobile.machine.offlineConversations')} /> : null}
      </View>
      {sessions.loading && sessions.data === null && online ? <Loading /> : null}
      {online && !sessions.loading && all.length === 0 ? <Empty title={t('conversations.emptyTitle')} /> : null}
      {online && all.length > 0 && visible.length === 0 ? <Empty title={t('conversations.noMatches')} /> : null}
      {visible.map((s) => {
        const isPicked = picked.includes(s.Id);
        const status = s.Id === selectedId && statuses[s.Id] === 'unread' ? undefined : statuses[s.Id];
        return (
          <ListRow
            key={s.Id}
            leading={
              <View
                style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: status ? dotColor[status] : 'transparent' }}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
            }
            title={s.Title || t('conversations.untitled')}
            subtitle={[s.UpdatedUtc ? formatRelativeTime(i18n.language, s.UpdatedUtc) : '', folderName(s.WorkingDirectory), s.Model].filter(Boolean).join(' · ')}
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
            accessibilityLabel={(s.Title || t('conversations.untitled')) + (status ? '. ' + t('mobile.status.' + status) : '') + '. ' + t('mobile.session.longPressHint')}
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
