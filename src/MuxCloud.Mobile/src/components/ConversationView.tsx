import { useCallback, useEffect, useRef, useState } from 'react';
import { I18nManager, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View, type ScrollViewInstance } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ApiError } from '@dashboard/api';
import { startChatStream, type ChatStreamEvent } from '@/relay/chatStream';
import type { SseHandle } from '@/lib/sseTransport';
import {
  applyChatEvent,
  applyRunFrame,
  approvalFromFrame,
  historyForRequest,
  parseSlash,
  SLASH_SCREENS,
  turnsFromDetail,
  type PendingApproval,
  type Turn,
} from '@/lib/transcript';
import { folderName } from '@/lib/sessions';
import { createMachineSocket } from '@/state/accountEvents';
import { useAuth } from '@/state/AuthContext';
import { useMachineApi } from '@/state/useMachineApi';
import type { MuxEndpointSummary, MuxSessionDetail } from '@/types/mux';
import { useTheme } from '@/theme/ThemeContext';
import { font, radius, spacing } from '@/theme/palette';
import { ApprovalCard } from './ApprovalCard';
import { ConnectionBanner } from './ConnectionBanner';
import { Sheet } from './Sheet';
import { TurnView } from './TurnView';
import { Button, ErrorBox, ListRow, Loading, Notice, T, ToggleRow } from './ui';

export interface ConversationViewProps {
  machineId: string;
  machineName: string;
  online: boolean;
  /** Existing conversation, or null for a new one. */
  sessionId: string | null;
  /** New conversations: endpoint and working directory chosen on the New conversation screen. */
  initialEndpoint?: string;
  workingDirectory?: string;
  /** The machine assigned an id to a new conversation. */
  onSessionCreated?: (sessionId: string) => void;
  /** Open a management screen (`/usage`, `/endpoints`, and other chat commands). */
  onOpenScreen?: (segment: string) => void;
  /** Start a fresh conversation (`/new`). */
  onNewConversation?: () => void;
}

let turnSeq = 0;
const nextKey = () => 'live' + ++turnSeq;

/**
 * A conversation on a machine, with full parity with the local mux dashboard's chat: transcript, streaming replies
 * over SSE through the relay, thinking and tool calls, tool approvals with the auto-approve countdown, cancel, plan
 * mode, endpoint switching, chat slash commands and skills, and live mirroring of runs started on any other surface.
 */
export function ConversationView(props: ConversationViewProps) {
  const { machineId, machineName, online, initialEndpoint, workingDirectory, onSessionCreated, onOpenScreen, onNewConversation } = props;
  const p = useTheme();
  const { t } = useTranslation();
  const { auth } = useAuth();
  const api = useMachineApi(machineId);
  const [sessionId, setSessionId] = useState<string | null>(props.sessionId);
  const [detail, setDetail] = useState<MuxSessionDetail | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [loading, setLoading] = useState(!!props.sessionId);
  const [error, setError] = useState<unknown>(null);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [endpoints, setEndpoints] = useState<MuxEndpointSummary[]>([]);
  const [endpoint, setEndpoint] = useState<string>(initialEndpoint ?? '');
  const [planMode, setPlanMode] = useState(false);
  const [plan, setPlan] = useState<{ text: string; executionPrompt: string } | null>(null);
  const [pickEndpoint, setPickEndpoint] = useState(false);
  const [mirroring, setMirroring] = useState(false);
  const stream = useRef<SseHandle | null>(null);
  const liveTurn = useRef<Turn | null>(null);
  /** Run id of the mirrored run, so a replayed run_started (after a reconnect) resets the live turn instead of adding one. */
  const liveRunId = useRef<string | null>(null);
  /** When this screen's own turn last finished. mux saves streamed runs without their tool calls, so reloading the
   * transcript right after our own turn would drop the tool lines the user just watched. */
  const ownFinishedAt = useRef(0);
  /** Set when the user taps Stop, so the end of the run is acknowledged in the transcript. */
  const stopRequested = useRef(false);
  const scroll = useRef<ScrollViewInstance>(null);

  const [propSession, setPropSession] = useState(props.sessionId);
  if (props.sessionId !== propSession) {
    setPropSession(props.sessionId);
    setSessionId(props.sessionId);
  }

  const loadDetail = useCallback(async () => {
    // A new conversation gets its id from the run event, but mux saves it only when the turn ends: loading it while
    // this screen is still streaming that turn would 404. The transcript is already on screen.
    if (!sessionId || stream.current) {
      setLoading(false);
      return;
    }
    try {
      const d = await api.session(sessionId);
      setDetail(d);
      setTurns(turnsFromDetail(d));
      setEndpoint((current) => current || d.EndpointName);
      setError(null);
    } catch (e) {
      // A conversation whose first turn is still running is not saved yet (mux writes it when the turn ends). The
      // live turn arrives over the machine socket, so a 404 here is not an error.
      if (e instanceof ApiError && e.status === 404) setError(null);
      else setError(e);
    } finally {
      setLoading(false);
    }
  }, [api, sessionId]);

  useEffect(() => {
    void Promise.resolve().then(loadDetail);
  }, [loadDetail]);

  useEffect(() => {
    if (!online) return;
    void api
      .endpoints()
      .then((r) => {
        setEndpoints(r.Items ?? []);
        setEndpoint((current) => current || r.Items.find((e) => e.IsDefault)?.Name || r.Items[0]?.Name || '');
      })
      .catch(() => undefined);
  }, [api, online]);

  // Live updates from the machine: runs started on other surfaces, approvals, and transcript changes.
  useEffect(() => {
    if (!sessionId || !online) return;
    const socket = createMachineSocket(auth, machineId, {
      subscription: { sessionId },
      onFrame: (frame) => {
        // Any frame that names the run (approvals, run_started, run_completed) tells Stop what to cancel.
        if (frame.runId && !stream.current && frame.eventType !== 'run_completed') setRunId(frame.runId);
        const approval = approvalFromFrame(frame, Date.now());
        if (approval) {
          Keyboard.dismiss();
          setApprovals((list) => (list.some((a) => a.toolCallId === approval.toolCallId) ? list : [...list, approval]));
          return;
        }
        if (frame.eventType === 'approval_resolved') {
          setApprovals((list) => list.filter((a) => a.toolCallId !== frame.toolCallId));
          return;
        }
        if (frame.eventType === 'transcript_changed') {
          if (!stream.current && Date.now() - ownFinishedAt.current > 5000) void loadDetail();
          return;
        }
        // While this screen streams its own turn over SSE, the same run's frames also arrive here: ignore them.
        // Only run_started and run_completed carry a runId, so a mirrored run is tracked from its start.
        if (stream.current) return;
        if (frame.eventType === 'run_started') {
          const existing = liveTurn.current;
          if (existing && (!frame.runId || frame.runId === liveRunId.current)) {
            // The socket reconnected and mux replays the run from its start: begin the same turn again.
            existing.content = '';
            existing.thinking = undefined;
            existing.tools = [];
            setTurns((list) => list.map((x) => (x.key === existing.key ? { ...existing } : x)));
            return;
          }
          const turn: Turn = { key: nextKey(), role: 'assistant', content: '', tools: [], pending: true };
          liveTurn.current = turn;
          liveRunId.current = frame.runId ?? null;
          setMirroring(true);
          setRunId(frame.runId ?? null);
          setTurns((list) => [...list, turn]);
          return;
        }
        if (frame.eventType === 'run_completed' && !liveTurn.current) {
          setMirroring(false);
          setRunId(null);
          setApprovals([]);
          void loadDetail();
          return;
        }
        const live = liveTurn.current;
        if (live) {
          const finished = applyRunFrame(live, frame);
          setTurns((list) => list.map((x) => (x.key === live.key ? { ...live, tools: [...live.tools] } : x)));
          if (finished) {
            if (stopRequested.current) {
              stopRequested.current = false;
              setTurns((list) => [...list, { key: nextKey(), role: 'system', content: t('mobile.chat.stopped'), tools: [], displayOnly: true }]);
            }
            liveTurn.current = null;
            liveRunId.current = null;
            setMirroring(false);
            setRunId(null);
            setApprovals([]);
            void loadDetail();
          }
        }
      },
    });
    socket.start();
    return () => socket.stop();
  }, [auth, machineId, sessionId, online, loadDetail, t]);

  useEffect(() => () => stream.current?.abort(), []);

  // Opening a conversation whose run is already in progress (from the approvals inbox, a notification, or another
  // device): find that run so Stop can cancel it even before any frame names it.
  useEffect(() => {
    if (!sessionId || !online) return;
    let alive = true;
    void api
      .runs()
      .then((r) => {
        const active = (r.Items ?? []).find((run) => run.SessionId === sessionId && !run.IsTerminal);
        if (alive && active && !stream.current) {
          setRunId(active.RunId);
          setMirroring(true);
        }
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [api, sessionId, online]);

  const decide = useCallback(
    (approval: PendingApproval, decision: 'y' | 'always' | 'n') => {
      setApprovals((list) => list.filter((a) => a.toolCallId !== approval.toolCallId));
      void api.approve(approval.runId, approval.toolCallId, decision).catch((e) => setError(e));
    },
    [api],
  );

  const runTurn = (text: string, options: { planMode: boolean }) => {
    const user: Turn = { key: nextKey(), role: 'user', content: text, tools: [] };
    const reply: Turn = { key: nextKey(), role: 'assistant', content: '', tools: [], pending: true };
    const history = historyForRequest(turns);
    setTurns((list) => [...list, user, reply]);
    setBusy(true);
    setPlan(null);
    setError(null);
    const update = (event: ChatStreamEvent) => {
      if (event.type === 'run') {
        setRunId(event.runId);
        if (!sessionId && event.sessionId) {
          setSessionId(event.sessionId);
          onSessionCreated?.(event.sessionId);
        }
        return;
      }
      if (event.type === 'approval') {
        Keyboard.dismiss();
        const a = event.approval;
        setApprovals((list) =>
          list.some((x) => x.toolCallId === a.ToolCallId)
            ? list
            : [...list, { runId: a.RunId, toolCallId: a.ToolCallId, toolName: a.Name, arguments: a.Arguments, autoApproveSeconds: Math.max(0, a.ToolAutoApproveSeconds), receivedAt: Date.now() }],
        );
        return;
      }
      if (event.type === 'plan') {
        setPlan({ text: event.text, executionPrompt: event.executionPrompt });
        return;
      }
      if (event.type === 'done' && event.reply.Id && !sessionId) {
        setSessionId(event.reply.Id);
        onSessionCreated?.(event.reply.Id);
      }
      applyChatEvent(reply, event);
      setTurns((list) => (event.type === 'canceled' ? list.filter((x) => x.key !== reply.key && x.key !== user.key) : list.map((x) => (x.key === reply.key ? { ...reply, tools: [...reply.tools] } : x))));
    };
    const finish = () => {
      stream.current = null;
      ownFinishedAt.current = Date.now();
      setBusy(false);
      setRunId(null);
      setApprovals([]);
    };
    stream.current = startChatStream({
      client: auth.client,
      machineId,
      request: {
        Endpoint: endpoint,
        Id: sessionId ?? '',
        WorkingDirectory: sessionId ? null : workingDirectory || null,
        Messages: [...history, { Role: 'user', Content: text }],
        PlanMode: options.planMode,
      },
      getAccessToken: () => auth.getAccessToken(),
      refresh: () => auth.refresh(),
      onEvent: update,
      onError: (status, code, message) => {
        applyChatEvent(reply, { type: 'error', message: t('errors.' + code, { defaultValue: message, status, seconds: 0 }) });
        setTurns((list) => list.map((x) => (x.key === reply.key ? { ...reply } : x)));
        finish();
      },
      onDone: () => {
        reply.pending = false;
        setTurns((list) => list.map((x) => (x.key === reply.key ? { ...reply } : x)));
        finish();
      },
    });
  };

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    const slash = parseSlash(text);
    if (slash) {
      setInput('');
      if (slash.command === 'new' || slash.command === 'clear') return onNewConversation?.();
      if (slash.command === '?' || slash.command === 'help') {
        setTurns((list) => [...list, { key: nextKey(), role: 'assistant', content: t('mobile.chat.help'), tools: [] }]);
        return;
      }
      if (slash.command === 'context' || slash.command === 'stats') {
        const last = [...turns].reverse().find((x) => x.role === 'assistant' && x.stats);
        const s = last?.stats;
        const body = s
          ? t('mobile.chat.statsBody', { model: last?.model ?? '', ttft: s.TtftMs ?? 0, streaming: s.StreamingMs ?? 0, total: s.TotalMs ?? 0, input: s.InputTokens ?? 0, output: s.OutputTokens ?? 0 })
          : t('mobile.chat.noStats');
        setTurns((list) => [...list, { key: nextKey(), role: 'assistant', content: body, tools: [] }]);
        return;
      }
      if (slash.command === 'mirror') {
        setTurns((list) => [...list, { key: nextKey(), role: 'system', content: t('mobile.chat.mirrorAlways'), tools: [], displayOnly: true }]);
        return;
      }
      if (SLASH_SCREENS[slash.command]) return onOpenScreen?.(SLASH_SCREENS[slash.command]);
      try {
        const expanded = (await api.expandSkill(text)) as { Matched?: boolean; Prompt?: string; Skill?: string };
        if (expanded.Matched && expanded.Prompt) {
          runTurn(expanded.Prompt, { planMode });
          return;
        }
      } catch {
        // Fall through to the unknown-command notice.
      }
      setTurns((list) => [...list, { key: nextKey(), role: 'system', content: t('mobile.chat.unknownCommand', { command: text }), tools: [], displayOnly: true }]);
      return;
    }
    if (!endpoint) {
      setError(new Error(t('mobile.chat.noEndpoint')));
      return;
    }
    setInput('');
    runTurn(text, { planMode });
  };

  const stop = () => {
    stopRequested.current = true;
    stream.current?.abort();
    if (runId) void api.cancelRun(runId).catch(() => undefined);
  };

  const switchEndpoint = async (next: MuxEndpointSummary) => {
    setPickEndpoint(false);
    if (next.Name === endpoint) return;
    setEndpoint(next.Name);
    void api.loadModel(next.Name).catch(() => undefined);
    if (!sessionId || !detail) return;
    // Same as the dashboard: note the switch in the transcript and persist the new endpoint on the conversation.
    const note = t('mobile.chat.switched', { endpoint: next.Name, model: next.Model });
    setTurns((list) => [...list, { key: nextKey(), role: 'system', content: note, tools: [], displayOnly: true }]);
    try {
      await api.saveSession({
        Id: sessionId,
        Title: detail.Title,
        EndpointName: next.Name,
        Model: next.Model,
        Labels: detail.Labels,
        Tags: detail.Tags,
        Messages: [...detail.Messages, { Role: 'system', Content: note, DisplayOnly: true }],
      });
    } catch (e) {
      setError(e);
    }
  };

  const title = detail?.Title || (sessionId ? t('conversations.untitled') : t('conversations.newConversation'));

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: p.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <ScrollView
        ref={scroll}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ gap: spacing.xs }}>
          <T variant="title">{title}</T>
          <T variant="small" numberOfLines={1}>{[machineName, folderName(detail?.WorkingDirectory || workingDirectory)].filter(Boolean).join(' · ')}</T>
        </View>
        <ConnectionBanner />
        {!online ? <Notice tone="warning" text={t('machineDetail.offlineTitle', { name: machineName })} /> : null}
        {mirroring ? <Notice text={t('mobile.chat.mirroring')} /> : null}
        {loading ? <Loading /> : null}
        {!loading && turns.length === 0 ? (
          <View style={{ paddingVertical: spacing.xxl, gap: spacing.sm, alignItems: 'center' }}>
            <T variant="title" style={{ textAlign: 'center' }}>
              {t('mobile.chat.emptyTitle')}
            </T>
            <T variant="muted" style={{ textAlign: 'center' }}>
              {t('mobile.chat.emptyBody', { machine: machineName, folder: folderName(workingDirectory) || t('mobile.chat.defaultFolder') })}
            </T>
          </View>
        ) : null}
        {turns.map((turn) => (
          <TurnView key={turn.key} turn={turn} />
        ))}
        {approvals.map((a) => (
          <ApprovalCard key={a.toolCallId} approval={a} onDecide={(d) => decide(a, d)} />
        ))}
        {plan ? (
          <View style={{ gap: spacing.sm, borderColor: p.accent, borderWidth: 1, borderRadius: radius.lg, padding: spacing.lg }}>
            <T variant="title">{t('mobile.chat.planTitle')}</T>
            <T selectable>{plan.text}</T>
            <Button
              title={t('mobile.chat.runPlan')}
              onPress={() => {
                const prompt = plan.executionPrompt;
                setPlan(null);
                setPlanMode(false);
                runTurn(prompt, { planMode: false });
              }}
            />
          </View>
        ) : null}
        {error ? <ErrorBox error={error} onRetry={() => void loadDetail()} /> : null}
      </ScrollView>
      {/* The tab bar below already sits on the home indicator, so the composer adds no bottom inset of its own. */}
      <View style={{ borderTopColor: p.line, borderTopWidth: 1, backgroundColor: p.panel, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: spacing.xs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Pressable onPress={() => setPickEndpoint(true)} accessibilityRole="button" accessibilityLabel={t('mobile.chat.endpoint')} style={{ flex: 1, minHeight: 32, justifyContent: 'center' }}>
            <T variant="small" numberOfLines={1} style={{ color: p.accent }}>
              {t('mobile.chat.endpointValue', { endpoint: endpoint || t('mobile.chat.noEndpointShort') })}
            </T>
          </Pressable>
          <Pressable
            onPress={() => setPlanMode((v) => !v)}
            accessibilityRole="switch"
            accessibilityState={{ checked: planMode }}
            accessibilityHint={t('mobile.chat.planModeHint')}
            hitSlop={{ top: 6, bottom: 6, left: 8, right: 4 }}
            style={{
              minHeight: 32,
              paddingHorizontal: spacing.md,
              justifyContent: 'center',
              borderRadius: radius.pill,
              borderWidth: 1,
              borderColor: planMode ? p.accent : p.line,
              backgroundColor: planMode ? p.accentSoft : 'transparent',
            }}
          >
            <T variant="small" style={{ color: planMode ? p.accent : p.muted, fontWeight: '600' }}>
              {t('mobile.chat.planMode')}
            </T>
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm }}>
          <TextInput
            testID="composer"
            value={input}
            onChangeText={setInput}
            placeholder={online ? t('mobile.chat.placeholder') : t('errors.MachineOffline')}
            placeholderTextColor={p.muted}
            editable={online}
            multiline
            accessibilityLabel={t('mobile.chat.placeholder')}
            style={{
              flex: 1,
              minHeight: 44,
              maxHeight: 160,
              borderColor: p.line,
              borderWidth: 1,
              borderRadius: radius.md,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              color: p.text,
              backgroundColor: p.bg,
              fontSize: font.body,
              textAlign: I18nManager.isRTL ? 'right' : 'left',
            }}
          />
          {busy || mirroring ? (
            <Button testID="stop" title={t('mobile.chat.stop')} kind="danger" onPress={stop} />
          ) : (
            <Button testID="send" title={t('mobile.chat.send')} onPress={() => void send()} disabled={!online || !input.trim()} />
          )}
        </View>
      </View>
      <Sheet visible={pickEndpoint} title={t('mobile.chat.endpoint')} onClose={() => setPickEndpoint(false)}>
        {endpoints.length === 0 ? <T variant="muted">{t('mobile.chat.noEndpoint')}</T> : null}
        <View style={{ marginHorizontal: -spacing.lg }}>
          {endpoints.map((e) => (
            <ListRow key={e.Name} title={e.Name} subtitle={[e.AdapterType, e.Model].filter(Boolean).join(' · ')} selected={e.Name === endpoint} onPress={() => void switchEndpoint(e)} />
          ))}
        </View>
        <ToggleRow label={t('mobile.chat.planMode')} hint={t('mobile.chat.planModeHint')} value={planMode} onChange={setPlanMode} />
      </Sheet>
    </KeyboardAvoidingView>
  );
}
