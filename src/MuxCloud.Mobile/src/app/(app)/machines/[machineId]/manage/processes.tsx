import { useEffect, useRef, useState } from 'react';
import { Alert, RefreshControl, ScrollView, View, type ScrollViewInstance } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { formatRelativeTime } from '@dashboard/lib';
import { Sheet } from '@/components/Sheet';
import { Badge, Button, Empty, ErrorBox, KeyValues, ListRow, Loading, Notice, Screen, T } from '@/components/ui';
import { isMissingRoute } from '@/lib/muxVersion';
import { useAsync } from '@/state/useAsync';
import { useMachineApi } from '@/state/useMachineApi';
import type { MuxProcess, MuxProcessOutput } from '@/types/mux';
import { useTheme } from '@/theme/ThemeContext';
import { font, radius, spacing } from '@/theme/palette';

/** How often an open output view and the list refresh while something is still running. */
const POLL_MS = 3000;

/**
 * Background processes the model started with tools (dev servers, watchers, long builds), like the desktop's /processes:
 * list them, read their output (refreshing while they run), stop one or all, and clear the finished ones.
 */
export default function ProcessesScreen() {
  const { machineId } = useLocalSearchParams<{ machineId: string }>();
  const { t, i18n } = useTranslation();
  const p = useTheme();
  const api = useMachineApi(machineId);
  const list = useAsync(() => api.processes().then((r) => r.Items ?? []), [api]);
  const [open, setOpen] = useState<MuxProcess | null>(null);
  const [output, setOutput] = useState<MuxProcessOutput | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const scroll = useRef<ScrollViewInstance>(null);
  const items = list.data ?? [];
  const running = items.filter((x) => x.Running).length;
  const reload = list.reload;

  // Keep the list fresh while any process runs.
  useEffect(() => {
    if (running === 0) return;
    const timer = setInterval(() => void reload(), POLL_MS);
    return () => clearInterval(timer);
  }, [running, reload]);

  // Follow the open process's output until it exits.
  const openId = open?.Id;
  const stillRunning = output ? output.Running : true;
  useEffect(() => {
    if (!openId) return;
    let alive = true;
    const load = () =>
      api
        .processOutput(openId)
        .then((o) => alive && setOutput(o))
        .catch((e) => alive && setError(e));
    void load();
    if (!stillRunning) return;
    const timer = setInterval(() => void load(), POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [api, openId, stillRunning]);

  const stop = async (x: MuxProcess) => {
    setError(null);
    try {
      await api.stopProcess(x.Id);
      void list.reload();
      if (open?.Id === x.Id) setOutput(await api.processOutput(x.Id));
    } catch (e) {
      setError(e);
    }
  };

  const stopAll = () =>
    Alert.alert(t('mobile.processes.stopAllTitle', { count: running }), t('mobile.processes.stopAllBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('mobile.processes.stopAll'),
        style: 'destructive',
        onPress: async () => {
          try {
            const r = await api.stopAllProcesses();
            setMessage(t('mobile.processes.stopped', { count: r.Stopped ?? 0 }));
            void list.reload();
          } catch (e) {
            setError(e);
          }
        },
      },
    ]);

  const clear = async () => {
    setError(null);
    try {
      const r = await api.clearProcesses();
      setMessage(t('mobile.processes.cleared', { count: r.Removed ?? 0 }));
      void list.reload();
    } catch (e) {
      setError(e);
    }
  };

  const status = (x: MuxProcess) =>
    x.Running ? (
      <Badge tone="success" label={t('mobile.processes.running')} />
    ) : x.StoppedByUser ? (
      <Badge label={t('mobile.processes.stoppedByUser')} />
    ) : (
      <Badge tone={x.ExitCode ? 'danger' : 'neutral'} label={t('mobile.processes.exited', { code: x.ExitCode ?? 0 })} />
    );

  return (
    <Screen refreshControl={<RefreshControl refreshing={list.loading && !!list.data} onRefresh={() => void list.reload()} />}>
      <Stack.Screen options={{ title: t('mobile.processes.title') }} />
      <T variant="muted">{t('mobile.processes.intro')}</T>
      <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
        <Button title={t('mobile.processes.stopAll')} kind="danger" disabled={running === 0} onPress={stopAll} />
        <Button title={t('mobile.processes.clear')} kind="secondary" disabled={items.every((x) => x.Running)} onPress={() => void clear()} />
      </View>
      {message ? <Notice tone="success" text={message} /> : null}
      {isMissingRoute(list.error) ? <Notice tone="warning" text={t('mobile.common.needsMux2')} /> : list.error ? <ErrorBox error={list.error} onRetry={() => void list.reload()} /> : null}
      {error ? <ErrorBox error={error} /> : null}
      {list.loading && !list.data ? <Loading /> : null}
      {list.data && items.length === 0 ? <Empty title={t('mobile.processes.none')} body={t('mobile.processes.noneBody')} /> : null}
      <View style={{ marginHorizontal: -spacing.lg }}>
        {items.map((x) => (
          <ListRow
            key={x.Id}
            title={x.Name || x.Command}
            subtitle={[
              x.Name ? x.Command : '',
              formatRelativeTime(i18n.language, x.StartedUtc),
              x.UnreadChars ? t('mobile.processes.unread', { count: x.UnreadChars }) : '',
            ]
              .filter(Boolean)
              .join(' · ')}
            trailing={status(x)}
            onPress={() => {
              setOutput(null);
              setCopied(false);
              setOpen(x);
            }}
          />
        ))}
      </View>

      <Sheet
        visible={open !== null}
        title={open?.Name || open?.Command || ''}
        onClose={() => setOpen(null)}
        footer={
          <>
            {output?.Running ? <Button title={t('mobile.processes.stop')} kind="danger" onPress={() => open && void stop(open)} /> : null}
            <Button
              title={copied ? t('common.copied') : t('mobile.processes.copyOutput')}
              kind="secondary"
              disabled={!output?.Text}
              onPress={() => {
                void Clipboard.setStringAsync(output?.Text ?? '');
                setCopied(true);
              }}
            />
          </>
        }
      >
        {open ? (
          <KeyValues
            rows={[
              [t('mobile.processes.command'), open.Command],
              [t('mobile.memory.folder'), open.WorkingDirectory || '–'],
              [t('mobile.processes.pid'), open.ProcessId ? String(open.ProcessId) : '–'],
              [
                t('mobile.turn.status'),
                output ? (output.Running ? t('mobile.processes.running') : t('mobile.processes.exited', { code: output.ExitCode ?? 0 })) : '…',
              ],
            ]}
          />
        ) : null}
        {!output ? <Loading /> : null}
        {output ? (
          <View style={{ backgroundColor: p.panelAlt, borderRadius: radius.md, maxHeight: 360, direction: 'ltr' }}>
            <ScrollView
              ref={scroll}
              onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}
              contentContainerStyle={{ padding: spacing.md }}
            >
              <T variant="mono" selectable style={{ fontSize: font.mono - 1 }}>
                {output.Text || t('mobile.processes.noOutput')}
              </T>
            </ScrollView>
          </View>
        ) : null}
      </Sheet>
    </Screen>
  );
}
