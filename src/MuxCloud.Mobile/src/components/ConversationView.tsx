import { useCallback, useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Alert, I18nManager, Keyboard, Platform, Pressable, ScrollView, TextInput, View, type ScrollViewInstance } from 'react-native';
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
import {
  applyMention,
  canonicalCommand,
  EFFORT_LEVELS,
  memoryNameFromText,
  mentionAtEnd,
  parseLabels,
  parseMemoryCommand,
  parseQuickMemory,
  parseTags,
  slashSuggestions,
  TRUST_LEVELS,
  type Suggestion,
} from '@/lib/chatCommands';
import { addQuestion, questionFrom } from '@/lib/questions';
import { contextPercent } from '@/lib/chatStats';
import { markSeen, rememberPrompt } from '@/storage/chatStore';
import { usePrefs } from '@/state/PrefsContext';
import { createMachineSocket } from '@/state/accountEvents';
import { useAuth } from '@/state/AuthContext';
import { useMachineApi } from '@/state/useMachineApi';
import type { MuxCheckpointStatus, MuxEndpoint, MuxEndpointSummary, MuxQuestion, MuxRunTask, MuxSessionDetail, MuxTrustLevel } from '@/types/mux';
import { useTheme } from '@/theme/ThemeContext';
import { font, radius, spacing } from '@/theme/palette';
import { ApprovalCard } from './ApprovalCard';
import { AskUserSheet, type QuestionAnswer } from './AskUserSheet';
import { EffortSheet, HistorySheet, InstructionsSheet, StatsSheet, TaskPlanCard, TrustSheet, TurnInfoSheet } from './ChatSheets';
import { ConnectionBanner } from './ConnectionBanner';
import { Sheet } from './Sheet';
import { TurnView } from './TurnView';
import { Button, ErrorBox, Field, ListRow, Loading, Notice, T, ToggleRow } from './ui';

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
  // ask_user questions waiting for an answer (this screen's own turn, or a mirrored run); the first one is shown.
  const [questions, setQuestions] = useState<MuxQuestion[]>([]);
  const [questionHidden, setQuestionHidden] = useState(false);
  const [trustOpen, setTrustOpen] = useState(false);
  const [endpoints, setEndpoints] = useState<MuxEndpointSummary[]>([]);
  const [endpoint, setEndpoint] = useState<string>(initialEndpoint ?? '');
  const [planMode, setPlanMode] = useState(false);
  // Auto-approve applies to this conversation only, and is offered only when the machine lets this caller approve
  // tools (a machine with remote approval off, or an older mux without the capabilities route, hides it).
  const [autoApprove, setAutoApprove] = useState(false);
  const [canAutoApprove, setCanAutoApprove] = useState(false);
  const [plan, setPlan] = useState<{
    text: string;
    executionPrompt: string;
  } | null>(null);
  const [pickEndpoint, setPickEndpoint] = useState(false);
  const [mirroring, setMirroring] = useState(false);
  const { prefs } = usePrefs();
  // Endpoint details (context window), model readiness, and context use for the composer indicators.
  const [endpointDetails, setEndpointDetails] = useState<MuxEndpoint[]>([]);
  const [modelState, setModelState] = useState<{
    state: 'loading' | 'ready' | 'unreachable';
    error?: string | null;
  } | null>(null);
  const [contextTokens, setContextTokens] = useState<number | null>(null);
  // `/cwd`: a folder for this conversation's next turns (sent as WorkingDirectory).
  const [cwdOverride, setCwdOverride] = useState<string | null>(null);
  const [checkpoint, setCheckpoint] = useState<MuxCheckpointStatus | null>(null);
  const [tasks, setTasks] = useState<{
    tasks: MuxRunTask[];
    completed: number;
    total: number;
  } | null>(null);
  const [infoTurn, setInfoTurn] = useState<Turn | null>(null);
  const [statsOpen, setStatsOpen] = useState(false);
  const [effortOpen, setEffortOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const [planFeedback, setPlanFeedback] = useState<string | null>(null);
  const [skillNames, setSkillNames] = useState<string[]>([]);
  const [fileSuggestions, setFileSuggestions] = useState<Suggestion[]>([]);
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
  const [keyboardShown, setKeyboardShown] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => {
      setKeyboardShown(true);
      // Keep the latest reply in view above the composer as the keyboard rises.
      setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 120);
    });
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardShown(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

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

  // Context window per endpoint and skill names for autocomplete (both optional extras).
  useEffect(() => {
    if (!online) return;
    void api
      .endpointsDetail()
      .then((r) => setEndpointDetails(r.Items ?? []))
      .catch(() => undefined);
    void api
      .skills()
      .then((r) =>
        setSkillNames(
          (r.Items ?? [])
            .filter((x) => x.Enabled && x.Valid)
            .map((x) => x.Name)
            .filter(Boolean),
        ),
      )
      .catch(() => undefined);
  }, [api, online]);

  // Model readiness for the chosen endpoint (POST /model/load), shown as a dot by the endpoint name.
  useEffect(() => {
    if (!online || !endpoint) return;
    let alive = true;
    void Promise.resolve().then(() => alive && setModelState({ state: 'loading' }));
    void api
      .loadModel(endpoint)
      .then((r) => alive && setModelState(r.Ok ? { state: 'ready' } : { state: 'unreachable', error: r.Error }))
      .catch((e: unknown) => alive && setModelState({ state: 'unreachable', error: e instanceof Error ? e.message : String(e) }));
    return () => {
      alive = false;
    };
  }, [api, online, endpoint]);

  const folder = cwdOverride || detail?.WorkingDirectory || workingDirectory || null;

  // Undo / redo of a turn's file changes are available when the folder is a git repository.
  const refreshCheckpoint = useCallback(() => {
    if (!online || !folder) {
      setCheckpoint(null);
      return;
    }
    void api
      .checkpoints(folder)
      .then(setCheckpoint)
      .catch(() => setCheckpoint(null));
  }, [api, online, folder]);
  useEffect(() => {
    void Promise.resolve().then(refreshCheckpoint);
  }, [refreshCheckpoint]);

  // This device has now seen the conversation (unread dots in the lists).
  useEffect(() => {
    if (sessionId) void markSeen(machineId, sessionId);
  }, [machineId, sessionId]);

  // The task plan of the run in progress, polled while it works.
  useEffect(() => {
    if (!runId || !online) return;
    let alive = true;
    const poll = () =>
      void api
        .run(runId)
        .then((r) => {
          if (!alive) return;
          if (r.Tasks && r.Tasks.length > 0) setTasks({ tasks: r.Tasks, completed: r.CompletedTaskCount, total: r.TotalTaskCount });
          if (r.FinalEstimatedTokens) setContextTokens(r.FinalEstimatedTokens);
        })
        .catch(() => undefined);
    poll();
    const timer = setInterval(poll, 3000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [api, runId, online]);

  // `@path` completion while a mention is being typed.
  const typedMention = mentionAtEnd(input);
  useEffect(() => {
    if (typedMention === null || !online) return;
    let alive = true;
    const timer = setTimeout(() => {
      void api
        .completeFiles(typedMention, folder, 12)
        .then((r) => alive && setFileSuggestions((r.Mentions ?? r.Paths ?? []).map((m) => ({ label: m.replace(/^@/, ''), insert: m }))))
        .catch(() => alive && setFileSuggestions([]));
    }, 200);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [api, typedMention, folder, online]);

  useEffect(() => {
    if (!online) return;
    void api
      .chatCapabilities()
      .then((c) => setCanAutoApprove(!!c?.AutoApproveTools))
      .catch(() => setCanAutoApprove(false));
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
        if (frame.eventType === 'ask_user') {
          const q = questionFrom(frame, Date.now());
          if (q) {
            Keyboard.dismiss();
            setQuestionHidden(false);
            setQuestions((list) => addQuestion(list, q));
          }
          return;
        }
        if (frame.eventType === 'ask_user_resolved') {
          const id = (frame as unknown as { questionId?: string }).questionId;
          setQuestions((list) => list.filter((q) => q.questionId !== id));
          return;
        }
        if (frame.eventType === 'approval_resolved') {
          setApprovals((list) => list.filter((a) => a.toolCallId !== frame.toolCallId));
          return;
        }
        if (frame.eventType === 'task_plan_updated') {
          const f = frame as unknown as { tasks?: { id: string; title: string; status: string }[]; completedCount?: number; totalCount?: number };
          const list = (f.tasks ?? []).map((x) => ({ Id: x.id, Title: x.title, Status: x.status }));
          if (list.length > 0) setTasks({ tasks: list, completed: f.completedCount ?? 0, total: f.totalCount ?? list.length });
          return;
        }
        if (frame.eventType === 'transcript_changed') {
          if (!stream.current && Date.now() - ownFinishedAt.current > 5000) void loadDetail();
          // Right after this screen's own turn, the change is usually the AI-generated title: take just the title.
          else if (!stream.current && sessionId)
            void api
              .session(sessionId)
              .then((d) => setDetail((current) => (current ? { ...current, Title: d.Title } : d)))
              .catch(() => undefined);
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
          const turn: Turn = {
            key: nextKey(),
            role: 'assistant',
            content: '',
            tools: [],
            pending: true,
          };
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
              setTurns((list) => [
                ...list,
                {
                  key: nextKey(),
                  role: 'system',
                  content: t('mobile.chat.stopped'),
                  tools: [],
                  displayOnly: true,
                },
              ]);
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
  }, [auth, machineId, sessionId, online, loadDetail, t, api]);

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

  /** Sends an ask_user answer; 404 means it was already answered elsewhere or timed out, so it just goes away. */
  const answerQuestion = async (q: MuxQuestion, a: QuestionAnswer) => {
    try {
      await api.answerQuestion({ RunId: q.runId, QuestionId: q.questionId, Answers: a.answers, Other: a.other || null, Skip: a.skip });
      setQuestions((list) => list.filter((x) => x.questionId !== q.questionId));
    } catch (e) {
      setQuestions((list) => list.filter((x) => x.questionId !== q.questionId));
      if (e instanceof ApiError && e.status === 404) note(t('mobile.ask.gone'));
      else setError(e);
    }
  };

  const runTurn = (text: string, options: { planMode: boolean; autoApprove?: boolean }) => {
    const user: Turn = {
      key: nextKey(),
      role: 'user',
      content: text,
      tools: [],
    };
    const reply: Turn = {
      key: nextKey(),
      role: 'assistant',
      content: '',
      tools: [],
      pending: true,
    };
    const history = historyForRequest(turns);
    setTurns((list) => [...list, user, reply]);
    setBusy(true);
    setPlan(null);
    setPlanFeedback(null);
    setTasks(null);
    setError(null);
    let ownRunId: string | null = null;
    const update = (event: ChatStreamEvent) => {
      if (event.type === 'run') {
        ownRunId = event.runId;
        reply.runId = event.runId;
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
            : [
                ...list,
                {
                  runId: a.RunId,
                  toolCallId: a.ToolCallId,
                  toolName: a.Name,
                  arguments: a.Arguments,
                  autoApproveSeconds: Math.max(0, a.ToolAutoApproveSeconds),
                  receivedAt: Date.now(),
                },
              ],
        );
        return;
      }
      if (event.type === 'plan') {
        setPlan({ text: event.text, executionPrompt: event.executionPrompt });
        return;
      }
      if (event.type === 'ask_user') {
        Keyboard.dismiss();
        setQuestionHidden(false);
        setQuestions((list) => addQuestion(list, event.question));
        return;
      }
      if (event.type === 'attachments') {
        user.attachments = event.attachments;
        setTurns((list) => list.map((x) => (x.key === user.key ? { ...user } : x)));
        return;
      }
      if (event.type === 'compacted') {
        const c = event.compaction;
        const notice: Turn = {
          key: nextKey(),
          role: 'system',
          content: t('mobile.compact.auto', { before: c.MessagesBefore, after: c.MessagesAfter, tokensBefore: c.EstimatedTokensBefore, tokensAfter: c.EstimatedTokensAfter }),
          tools: [],
          displayOnly: true,
        };
        // The notice goes before the reply being streamed, where the compaction happened.
        setTurns((list) => {
          const at = list.findIndex((x) => x.key === reply.key);
          return at < 0 ? [...list, notice] : [...list.slice(0, at), notice, ...list.slice(at)];
        });
        return;
      }
      if (event.type === 'done' && event.reply.Id && !sessionId) {
        setSessionId(event.reply.Id);
        onSessionCreated?.(event.reply.Id);
      }
      applyChatEvent(reply, event);
      setTurns((list) =>
        event.type === 'canceled'
          ? list.filter((x) => x.key !== reply.key && x.key !== user.key)
          : list.map((x) => (x.key === reply.key ? { ...reply, tools: [...reply.tools] } : x)),
      );
    };
    const finish = () => {
      stream.current = null;
      ownFinishedAt.current = Date.now();
      setBusy(false);
      setRunId(null);
      setApprovals([]);
      setQuestions([]);
      refreshCheckpoint();
      if (ownRunId)
        void api
          .run(ownRunId)
          .then((r) => {
            if (r.FinalEstimatedTokens) setContextTokens(r.FinalEstimatedTokens);
            if (r.Tasks && r.Tasks.length > 0) setTasks({ tasks: r.Tasks, completed: r.CompletedTaskCount, total: r.TotalTaskCount });
          })
          .catch(() => undefined);
    };
    stream.current = startChatStream({
      client: auth.client,
      machineId,
      request: {
        Endpoint: endpoint,
        Id: sessionId ?? '',
        WorkingDirectory: sessionId ? cwdOverride : cwdOverride || workingDirectory || null,
        Messages: [...history, { Role: 'user', Content: text }],
        PlanMode: options.planMode,
        AutoApproveTools: (options.autoApprove ?? autoApprove) && canAutoApprove,
        AskUser: true,
      },
      getAccessToken: () => auth.getAccessToken(),
      refresh: () => auth.refresh(),
      onEvent: update,
      onError: (status, code, message) => {
        applyChatEvent(reply, {
          type: 'error',
          message: t('errors.' + code, {
            defaultValue: message,
            status,
            seconds: 0,
          }),
        });
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

  /** A local note in the transcript (not sent to the model). */
  const note = (content: string) => setTurns((list) => [...list, { key: nextKey(), role: 'system', content, tools: [], displayOnly: true }]);
  /** A local markdown answer in the transcript (command output). */
  const answer = (content: string) => setTurns((list) => [...list, { key: nextKey(), role: 'assistant', content, tools: [] }]);

  const runCommand = async (command: string, args: string, text: string) => {
    switch (command) {
      case 'new':
        return onNewConversation?.();
      case 'help':
        setTurns((list) => [...list, { key: nextKey(), role: 'assistant', content: '', tools: [], card: 'help' }]);
        return;
      case 'stats':
      case 'context':
        setStatsOpen(true);
        return;
      case 'mirror':
        note(t('mobile.chat.mirrorAlways'));
        return;
      case 'history':
        setHistoryOpen(true);
        return;
      case 'instructions':
        setInstructionsOpen(true);
        return;
      case 'cwd':
        if (!args) {
          note(t('mobile.chat.cwdShow', { folder: folder || t('mobile.chat.defaultFolder') }));
          return;
        }
        setCwdOverride(args);
        note(t('mobile.chat.cwdSet', { folder: args }));
        return;
      case 'undo':
      case 'redo': {
        if (!folder) {
          note(t('mobile.chat.noFolder'));
          return;
        }
        try {
          const r = command === 'undo' ? await api.undo(folder) : await api.redo(folder);
          note(
            r.Restored
              ? t(command === 'undo' ? 'mobile.chat.undone' : 'mobile.chat.redone', { label: r.Label || '' })
              : t(command === 'undo' ? 'mobile.chat.nothingToUndo' : 'mobile.chat.nothingToRedo'),
          );
          setCheckpoint((c) => (c ? { ...c, CanUndo: r.CanUndo, CanRedo: r.CanRedo } : c));
        } catch (e) {
          setError(e);
        }
        return;
      }
      case 'memory': {
        const m = parseMemoryCommand(args);
        try {
          const list = await api.memory(folder);
          if (m.action === 'list') {
            answer(
              list.Memories.length === 0
                ? t('mobile.memory.none')
                : '**' + t('mobile.memory.title') + '**\n\n' + list.Memories.map((x) => '- `' + x.Name + '` (' + x.Scope + '): ' + x.Description).join('\n'),
            );
            return;
          }
          if (m.action === 'show') {
            const found = list.Memories.find((x) => x.Name === m.name);
            answer(found ? '**' + found.Name + '** (' + found.Scope + ')\n\n' + found.Content : t('mobile.memory.notFound', { name: m.name }));
            return;
          }
          if (m.action === 'delete') {
            const found = list.Memories.find((x) => x.Name === m.name);
            if (!found) {
              note(t('mobile.memory.notFound', { name: m.name }));
              return;
            }
            await api.deleteMemory(found.Name, found.Scope, folder);
            note(t('mobile.memory.deleted', { name: found.Name }));
            return;
          }
          const doomed = list.Memories.filter((x) => x.Scope === m.scope);
          if (doomed.length === 0) {
            note(t('mobile.memory.none'));
            return;
          }
          Alert.alert(t('mobile.memory.clearTitle', { count: doomed.length }), t('mobile.memory.clearBody'), [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('common.delete'),
              style: 'destructive',
              onPress: async () => {
                for (const x of doomed) await api.deleteMemory(x.Name, x.Scope, folder).catch(() => undefined);
                note(t('mobile.memory.cleared', { count: doomed.length }));
              },
            },
          ]);
        } catch (e) {
          setError(e);
        }
        return;
      }
      case 'label':
      case 'tag': {
        if (!sessionId || !detail) {
          note(t('mobile.chat.saveFirst'));
          return;
        }
        if (!args) {
          note(
            command === 'label'
              ? t('mobile.chat.labelsNow', { list: detail.Labels.join(', ') || t('common.none') })
              : t('mobile.chat.tagsNow', { list: detail.Tags.map((x) => x.Key + '=' + x.Value).join(', ') || t('common.none') }),
          );
          return;
        }
        try {
          await api.patchMetadata(sessionId, command === 'label' ? { AddLabels: parseLabels(args) } : { SetTags: parseTags(args) });
          note(t(command === 'label' ? 'mobile.chat.labelsAdded' : 'mobile.chat.tagsSet', { list: args }));
          await loadDetail();
        } catch (e) {
          setError(e);
        }
        return;
      }
      case 'effort': {
        const level = args.toLowerCase();
        if (!level) {
          setEffortOpen(true);
          return;
        }
        if (!(EFFORT_LEVELS as readonly string[]).includes(level)) {
          note(t('mobile.chat.badEffort', { list: EFFORT_LEVELS.join(', ') }));
          return;
        }
        try {
          const all = (await api.endpointsDetail()).Items ?? [];
          const saved = await api.saveEndpoints(all.map((e) => (e.Name === endpoint ? { ...e, ReasoningEffort: level === 'off' ? null : level } : e)));
          setEndpointDetails(saved.Items ?? all);
          note(t('mobile.chat.effortSet', { endpoint, level: t('mobile.effort.' + level) }));
        } catch (e) {
          setError(e);
        }
        return;
      }
      case 'endpoint': {
        if (!args) {
          setPickEndpoint(true);
          return;
        }
        const match = endpoints.find((e) => e.Name.toLowerCase() === args.toLowerCase());
        if (match) void switchEndpoint(match);
        else note(t('mobile.chat.unknownEndpoint', { name: args }));
        return;
      }
      case 'worktrees':
        return onOpenScreen?.('worktrees');
      case 'compact': {
        if (!sessionId) return note(t('mobile.chat.saveFirst'));
        if (busy) return note(t('mobile.compact.busy'));
        note(t('mobile.compact.running'));
        try {
          const r = await api.compact(sessionId, endpoint || undefined);
          // Reload first (the transcript changed), then add the result, which a reload would otherwise clear.
          if (r.Compacted) await loadDetail();
          note(
            r.Compacted
              ? t('mobile.compact.done', { before: r.MessagesBefore, after: r.MessagesAfter, tokensBefore: r.EstimatedTokensBefore, tokensAfter: r.EstimatedTokensAfter })
              : r.Message || t('mobile.compact.nothing'),
          );
        } catch (e) {
          if (e instanceof ApiError && e.status === 409) note(t('mobile.compact.busy'));
          else setError(e);
        }
        return;
      }
      case 'trust': {
        const level = args.trim().toLowerCase();
        if (!level) return setTrustOpen(true);
        if (!(TRUST_LEVELS as readonly string[]).includes(level)) return note(t('mobile.trust.bad', { list: TRUST_LEVELS.join(', ') }));
        if (!folder) return note(t('mobile.chat.noFolder'));
        try {
          const r = await api.setTrust(folder, level as MuxTrustLevel | 'reset');
          note(t('mobile.trust.set', { folder: r.ProjectRoot || r.WorkingDirectory, level: t('mobile.trust.' + r.Level) }));
        } catch (e) {
          setError(e);
        }
        return;
      }
      default:
        break;
    }
    if (SLASH_SCREENS[command]) return onOpenScreen?.(SLASH_SCREENS[command]);
    try {
      const expanded = (await api.expandSkill(text)) as {
        Matched?: boolean;
        Prompt?: string;
        Skill?: string;
      };
      if (expanded.Matched && expanded.Prompt) {
        runTurn(expanded.Prompt, { planMode });
        return;
      }
    } catch {
      // Fall through to the unknown-command notice.
    }
    note(t('mobile.chat.unknownCommand', { command: text }));
  };

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    void rememberPrompt(machineId, text);
    // "# text" (or "#global text") saves a memory without a model call, as on the desktop.
    const memo = parseQuickMemory(text);
    if (memo) {
      setInput('');
      try {
        const name = memoryNameFromText(memo.text);
        await api.saveMemory({ Name: name, Description: memo.text, Content: memo.text, Scope: memo.scope, WorkingDirectory: folder });
        note(t(memo.scope === 'global' ? 'mobile.memory.savedGlobal' : 'mobile.memory.saved', { name }));
      } catch (e) {
        setError(e);
      }
      return;
    }
    const slash = parseSlash(text);
    if (slash) {
      setInput('');
      await runCommand(canonicalCommand(slash.command), slash.args, text);
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
    if (!sessionId || !detail) return;
    // Same as the dashboard: note the switch in the transcript and persist the new endpoint on the conversation.
    const note = t('mobile.chat.switched', {
      endpoint: next.Name,
      model: next.Model,
    });
    setTurns((list) => [
      ...list,
      {
        key: nextKey(),
        role: 'system',
        content: note,
        tools: [],
        displayOnly: true,
      },
    ]);
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

  const contextWindow = endpointDetails.find((e) => e.Name === endpoint)?.ContextWindow ?? 0;
  const lastStats = [...turns].reverse().find((x) => x.role === 'assistant' && x.stats)?.stats;
  const usedTokens = contextTokens ?? (lastStats ? (lastStats.InputTokens ?? 0) + (lastStats.OutputTokens ?? 0) : null);
  const usedPercent = contextPercent(usedTokens, contextWindow);
  const suggestions: Suggestion[] =
    typedMention !== null && fileSuggestions.length > 0
      ? fileSuggestions
      : slashSuggestions(input, { endpoints: endpoints.map((e) => e.Name), skills: skillNames });
  const pickSuggestion = (sg: Suggestion) => {
    setInput((current) =>
      mentionAtEnd(current) !== null && typedMention !== null && fileSuggestions.length > 0 ? applyMention(current, sg.insert) : sg.insert,
    );
    setFileSuggestions([]);
  };
  const modelColor = modelState?.state === 'ready' ? p.success : modelState?.state === 'unreachable' ? p.danger : p.warning;
  const title = detail?.Title || (sessionId ? t('conversations.untitled') : t('conversations.newConversation'));

  return (
    // keyboard-controller lifts the composer on both platforms (edge-to-edge Android included). automaticOffset measures
    // where this view really sits on screen (below the header, above the tab bar, or in the tablet split view), so no
    // hard-coded offset can drift from the real layout.
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: p.bg }} behavior="padding" automaticOffset>
      <ScrollView
        ref={scroll}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      >
        <View style={{ gap: spacing.xs }}>
          <T variant="title">{title}</T>
          <T variant="small" numberOfLines={1}>
            {[machineName, folderName(folder || undefined)].filter(Boolean).join(' · ')}
          </T>
          {online && (sessionId || checkpoint?.IsRepository) ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs }}>
              {checkpoint?.IsRepository
                ? [
                    <HeaderAction
                      key="undo"
                      label={t('mobile.chat.undo')}
                      onPress={() => void runCommand('undo', '', '/undo')}
                      enabled={checkpoint.CanUndo && !busy}
                    />,
                    <HeaderAction
                      key="redo"
                      label={t('mobile.chat.redo')}
                      onPress={() => void runCommand('redo', '', '/redo')}
                      enabled={checkpoint.CanRedo && !busy}
                    />,
                  ]
                : null}
              {sessionId ? <HeaderAction label={t('mobile.stats.title')} onPress={() => setStatsOpen(true)} /> : null}
              <HeaderAction label={t('mobile.instructions.short')} onPress={() => setInstructionsOpen(true)} />
            </View>
          ) : null}
        </View>
        <ConnectionBanner />
        {!online ? <Notice tone="warning" text={t('machineDetail.offlineTitle', { name: machineName })} /> : null}
        {mirroring ? <Notice text={t('mobile.chat.mirroring')} /> : null}
        {loading ? <Loading /> : null}
        {!loading && turns.length === 0 ? (
          <View
            style={{
              paddingVertical: spacing.xxl,
              gap: spacing.sm,
              alignItems: 'center',
            }}
          >
            <T variant="title" style={{ textAlign: 'center' }}>
              {t('mobile.chat.emptyTitle')}
            </T>
            <T variant="muted" style={{ textAlign: 'center' }}>
              {t('mobile.chat.emptyBody', {
                machine: machineName,
                folder: folderName(workingDirectory) || t('mobile.chat.defaultFolder'),
              })}
            </T>
          </View>
        ) : null}
        {turns.map((turn) => (
          <TurnView key={turn.key} turn={turn} expandThinking={prefs.expandThinking} onInfo={setInfoTurn} onCommand={(command) => setInput(command)} />
        ))}
        {tasks ? <TaskPlanCard tasks={tasks.tasks} completed={tasks.completed} total={tasks.total} /> : null}
        {approvals.map((a) => (
          <ApprovalCard key={a.toolCallId} approval={a} onDecide={(d) => decide(a, d)} />
        ))}
        {questions.length > 0 && questionHidden ? (
          <Pressable
            onPress={() => setQuestionHidden(false)}
            accessibilityRole="button"
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderColor: p.warning, backgroundColor: p.warningSoft, borderRadius: radius.lg, padding: spacing.md }}
          >
            <Ionicons name="help-circle-outline" size={24} color={p.warning} />
            <View style={{ flex: 1 }}>
              <T style={{ fontWeight: '600' }}>{t('mobile.ask.waiting')}</T>
              <T variant="small" numberOfLines={2}>
                {questions[0].question}
              </T>
            </View>
            <T style={{ color: p.accent, fontWeight: '600' }}>{t('mobile.ask.answer')}</T>
          </Pressable>
        ) : null}
        {plan ? (
          <View
            style={{
              gap: spacing.sm,
              borderColor: p.accent,
              borderWidth: 1,
              borderRadius: radius.lg,
              padding: spacing.lg,
            }}
          >
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
            {canAutoApprove ? (
              <Button
                kind="secondary"
                title={t('mobile.chat.runPlanAuto')}
                accessibilityHint={t('mobile.chat.runPlanAutoHint')}
                onPress={() => {
                  const prompt = plan.executionPrompt;
                  setPlan(null);
                  setPlanMode(false);
                  runTurn(prompt, { planMode: false, autoApprove: true });
                }}
              />
            ) : null}
            {planFeedback === null ? (
              <Button kind="secondary" title={t('mobile.chat.keepPlanning')} onPress={() => setPlanFeedback('')} />
            ) : (
              <View style={{ gap: spacing.sm }}>
                <Field
                  label={t('mobile.chat.planFeedback')}
                  placeholder={t('mobile.chat.planFeedbackHint')}
                  value={planFeedback}
                  onChangeText={setPlanFeedback}
                  multiline
                />
                <Button
                  title={t('mobile.chat.sendFeedback')}
                  disabled={!planFeedback.trim()}
                  onPress={() => {
                    const feedback = planFeedback.trim();
                    setPlanFeedback(null);
                    runTurn(feedback, { planMode: true });
                  }}
                />
              </View>
            )}
          </View>
        ) : null}
        {error ? <ErrorBox error={error} onRetry={() => void loadDetail()} /> : null}
      </ScrollView>
      {/* The tab bar below already sits on the home indicator, so the composer adds no bottom inset of its own. */}
      <View
        style={{
          borderTopColor: p.line,
          borderTopWidth: 1,
          backgroundColor: p.panel,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.sm,
          gap: spacing.xs,
        }}
      >
        {modelState?.state === 'unreachable' ? (
          <Pressable onPress={() => Alert.alert(t('mobile.chat.modelUnreachable'), modelState.error || '')} accessibilityRole="button">
            <T variant="small" numberOfLines={2} style={{ color: p.danger }}>
              {t('mobile.chat.modelUnreachable') + (modelState.error ? ': ' + modelState.error : '')}
            </T>
          </Pressable>
        ) : null}
        {suggestions.length > 0 ? (
          <ScrollView horizontal keyboardShouldPersistTaps="always" showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.xs }}>
            {suggestions.map((sg) => (
              <Pressable
                key={sg.label}
                onPress={() => pickSuggestion(sg)}
                accessibilityRole="button"
                style={{
                  minHeight: 32,
                  paddingHorizontal: spacing.md,
                  justifyContent: 'center',
                  borderRadius: radius.pill,
                  backgroundColor: p.panelAlt,
                  borderWidth: 1,
                  borderColor: p.line,
                }}
              >
                <T variant="mono" style={{ color: p.text }} numberOfLines={1}>
                  {sg.label}
                </T>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
          }}
        >
          <Pressable
            onPress={() => setPickEndpoint(true)}
            onLongPress={() => {
              if (modelState?.state === 'unreachable') Alert.alert(t('mobile.chat.modelUnreachable'), modelState.error || '');
            }}
            accessibilityRole="button"
            accessibilityLabel={
              t('mobile.chat.endpoint') +
              (modelState ? ', ' + t('mobile.chat.model.' + modelState.state) : '') +
              (usedPercent !== null ? ', ' + t('mobile.chat.contextUsed', { percent: usedPercent }) : '')
            }
            style={{ flex: 1, minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}
          >
            {endpoint && modelState ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: modelColor }} /> : null}
            <T variant="small" numberOfLines={1} style={{ color: p.accent, flexShrink: 1 }}>
              {t('mobile.chat.endpointValue', {
                endpoint: endpoint || t('mobile.chat.noEndpointShort'),
              })}
            </T>
            {usedPercent !== null ? (
              <T variant="small" style={{ color: usedPercent >= 90 ? p.danger : usedPercent >= 75 ? p.warning : p.muted, fontVariant: ['tabular-nums'] }}>
                {t('mobile.chat.contextShort', { percent: usedPercent })}
              </T>
            ) : null}
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
            <T
              variant="small"
              style={{
                color: planMode ? p.accent : p.muted,
                fontWeight: '600',
              }}
            >
              {t('mobile.chat.planMode')}
            </T>
          </Pressable>
          {canAutoApprove ? (
            <Pressable
              testID="auto-approve"
              onPress={() => setAutoApprove((v) => !v)}
              accessibilityRole="switch"
              accessibilityState={{ checked: autoApprove }}
              accessibilityLabel={t('mobile.chat.autoApprove')}
              accessibilityHint={t('mobile.chat.autoApproveHint')}
              hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
              style={{
                minHeight: 32,
                paddingHorizontal: spacing.md,
                justifyContent: 'center',
                borderRadius: radius.pill,
                borderWidth: 1,
                borderColor: autoApprove ? p.warning : p.line,
                backgroundColor: autoApprove ? p.warningSoft : 'transparent',
              }}
            >
              <T
                variant="small"
                style={{
                  color: autoApprove ? p.warning : p.muted,
                  fontWeight: '600',
                }}
              >
                {t('mobile.chat.autoApprove')}
              </T>
            </Pressable>
          ) : null}
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            gap: spacing.sm,
          }}
        >
          <Pressable
            testID="history"
            onPress={() => setHistoryOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t('mobile.history.title')}
            hitSlop={6}
            style={{ width: 36, height: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="time-outline" size={22} color={p.muted} />
          </Pressable>
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
          {keyboardShown ? (
            <Pressable
              testID="hide-keyboard"
              onPress={() => Keyboard.dismiss()}
              accessibilityRole="button"
              accessibilityLabel={t('mobile.chat.hideKeyboard')}
              hitSlop={6}
              style={{
                width: 44,
                height: 44,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: p.line,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="chevron-down" size={22} color={p.muted} />
            </Pressable>
          ) : null}
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
            <ListRow
              key={e.Name}
              title={e.Name}
              subtitle={[e.AdapterType, e.Model].filter(Boolean).join(' · ')}
              selected={e.Name === endpoint}
              onPress={() => void switchEndpoint(e)}
            />
          ))}
        </View>
        <ToggleRow label={t('mobile.chat.planMode')} hint={t('mobile.chat.planModeHint')} value={planMode} onChange={setPlanMode} />
        {endpoint ? (
          <View style={{ marginHorizontal: -spacing.lg }}>
            <ListRow
              title={t('mobile.effort.short')}
              subtitle={t('mobile.effort.' + (endpointDetails.find((e) => e.Name === endpoint)?.ReasoningEffort || 'off').toLowerCase())}
              onPress={() => {
                setPickEndpoint(false);
                setTimeout(() => setEffortOpen(true), 400);
              }}
            />
          </View>
        ) : null}
      </Sheet>
      <TurnInfoSheet api={api} turn={infoTurn} contextWindow={contextWindow} onClose={() => setInfoTurn(null)} />
      <StatsSheet
        api={api}
        sessionId={sessionId}
        turns={turns}
        contextWindow={contextWindow}
        estimatedTokens={usedTokens}
        visible={statsOpen}
        onClose={() => setStatsOpen(false)}
      />
      <EffortSheet
        api={api}
        endpoint={endpoint}
        visible={effortOpen}
        onClose={() => setEffortOpen(false)}
        onSaved={(level) => {
          setEffortOpen(false);
          note(t('mobile.chat.effortSet', { endpoint, level: t('mobile.effort.' + level) }));
        }}
      />
      <HistorySheet
        machineId={machineId}
        visible={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onPick={(prompt) => {
          setHistoryOpen(false);
          setInput(prompt);
        }}
      />
      <InstructionsSheet api={api} workingDirectory={folder} visible={instructionsOpen} onClose={() => setInstructionsOpen(false)} />
      <AskUserSheet question={questions[0] ?? null} visible={questions.length > 0 && !questionHidden} onClose={() => setQuestionHidden(true)} onAnswer={answerQuestion} />
      <TrustSheet api={api} workingDirectory={folder} visible={trustOpen} onClose={() => setTrustOpen(false)} onSaved={(message) => note(message)} />
    </KeyboardAvoidingView>
  );
}

/** A small pill button in the conversation header (Undo, Redo, Stats, Instructions). */
function HeaderAction({ label, onPress, enabled = true }: { label: string; onPress: () => void; enabled?: boolean }) {
  const p = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!enabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !enabled }}
      hitSlop={6}
      style={{
        minHeight: 30,
        paddingHorizontal: spacing.md,
        justifyContent: 'center',
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: p.line,
        opacity: enabled ? 1 : 0.45,
      }}
    >
      <T variant="small" style={{ color: p.text, fontWeight: '600' }}>
        {label}
      </T>
    </Pressable>
  );
}
