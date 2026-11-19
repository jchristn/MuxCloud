import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';
import { formatNumber } from '@dashboard/lib';
import { EFFORT_LEVELS, TRUST_LEVELS } from '@/lib/chatCommands';
import { contextPercent, tokensPerTurn } from '@/lib/chatStats';
import { formatDuration } from '@/lib/duration';
import type { Turn } from '@/lib/transcript';
import type { MuxApi } from '@/relay/muxApi';
import { loadPromptHistory } from '@/storage/chatStore';
import type { MuxEndpoint, MuxInstructions, MuxRunState, MuxRunTask, MuxTrust } from '@/types/mux';
import { useTheme } from '@/theme/ThemeContext';
import { font, radius, spacing } from '@/theme/palette';
import { Sheet } from './Sheet';
import { Button, Empty, ErrorBox, KeyValues, ListRow, Loading, Notice, T } from './ui';

const ms = (lang: string, v: unknown) => (typeof v === 'number' && v > 0 ? formatDuration(lang, v) : '–');
const num = (lang: string, v: unknown) => (typeof v === 'number' ? formatNumber(lang, v) : '–');

/** Details of one reply: the run's counters (while mux still has the run) and the turn's timing and tokens. */
export function TurnInfoSheet({ api, turn, contextWindow, onClose }: { api: MuxApi; turn: Turn | null; contextWindow: number; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [run, setRun] = useState<MuxRunState | null>(null);
  const [gone, setGone] = useState(false);
  const runId = turn?.runId;
  useEffect(() => {
    let alive = true;
    void Promise.resolve().then(() => {
      if (!alive) return;
      setRun(null);
      setGone(false);
    });
    if (!runId) return;
    void api
      .run(runId)
      .then((r) => alive && setRun(r))
      .catch(() => alive && setGone(true));
    return () => {
      alive = false;
    };
  }, [api, runId]);
  const s = turn?.stats;
  const pct = contextPercent(run?.FinalEstimatedTokens, contextWindow);
  const rows: [string, string][] = [
    [t('mobile.turn.model'), turn?.model || run?.Model || '–'],
    [t('mobile.turn.ttft'), ms(lang, s?.TtftMs)],
    [t('mobile.turn.streaming'), ms(lang, s?.StreamingMs)],
    [t('mobile.turn.total'), ms(lang, s?.TotalMs)],
    [t('mobile.turn.tokensIn'), num(lang, s?.InputTokens ?? run?.InputTokens)],
    [t('mobile.turn.tokensOut'), num(lang, s?.OutputTokens ?? run?.OutputTokens)],
  ];
  if (run) {
    rows.push(
      [t('mobile.turn.status'), run.Status],
      [t('mobile.turn.modelCalls'), num(lang, run.IterationsCompleted)],
      [t('mobile.turn.toolCalls'), num(lang, run.ToolCallCount)],
      [t('mobile.turn.errors'), num(lang, run.ErrorCount)],
      [t('mobile.turn.context'), run.FinalEstimatedTokens ? num(lang, run.FinalEstimatedTokens) + (pct !== null ? ' (' + pct + '%)' : '') : '–'],
    );
  }
  return (
    <Sheet visible={turn !== null} title={t('mobile.chat.turnInfo')} onClose={onClose}>
      <KeyValues rows={rows} />
      {run?.LastError ? <Notice tone="danger" text={run.LastError} /> : null}
      {runId && !run && !gone ? <Loading /> : null}
      {gone || !runId ? <T variant="small">{t('mobile.turn.runGone')}</T> : null}
    </Sheet>
  );
}

/** `/stats`: the conversation's totals, latency percentiles, tokens per turn, and context use, with Copy JSON. */
/** "avg · p95 · p99" for a latency row, or a single dash when the conversation has no timed calls yet. */
function spread(lang: string, avg: unknown, p95: unknown, p99: unknown): string {
  return avg || p95 || p99 ? [ms(lang, avg), ms(lang, p95), ms(lang, p99)].join(' · ') : '–';
}

export function StatsSheet({
  api,
  sessionId,
  turns,
  contextWindow,
  estimatedTokens,
  visible,
  onClose,
}: {
  api: MuxApi;
  sessionId: string | null;
  turns: Turn[];
  contextWindow: number;
  estimatedTokens: number | null;
  visible: boolean;
  onClose: () => void;
}) {
  const p = useTheme();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [metrics, setMetrics] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!visible || !sessionId) return;
    let alive = true;
    void Promise.resolve().then(() => alive && setError(null));
    void api
      .usageSummary('all', { session: sessionId })
      .then((r) => alive && setMetrics((r.Metrics ?? {}) as Record<string, unknown>))
      .catch((e) => alive && setError(e));
    return () => {
      alive = false;
    };
  }, [api, sessionId, visible]);
  const series = tokensPerTurn(turns);
  const max = Math.max(1, ...series);
  const m = metrics ?? {};
  const pct = contextPercent(estimatedTokens, contextWindow);
  const replies = turns.filter((x) => x.role === 'assistant' && !x.card).length;
  const json = { sessionId, turns: replies, contextTokens: estimatedTokens, contextWindow, contextPercent: pct, tokensPerTurn: series, metrics: m };
  return (
    <Sheet
      visible={visible}
      title={t('mobile.stats.title')}
      onClose={onClose}
      footer={
        <Button
          kind="secondary"
          title={copied ? t('common.copied') : t('mobile.stats.copyJson')}
          onPress={async () => {
            await Clipboard.setStringAsync(JSON.stringify(json, null, 2));
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        />
      }
    >
      {!sessionId ? <Empty title={t('mobile.chat.noStats')} /> : null}
      {error ? <ErrorBox error={error} /> : null}
      {sessionId && !metrics && !error ? <Loading /> : null}
      <KeyValues
        rows={[
          [t('mobile.stats.turns'), num(lang, replies)],
          [t('mobile.stats.calls'), num(lang, m.Calls)],
          [t('mobile.stats.tokens'), num(lang, m.TotalTokens)],
          [t('mobile.turn.tokensIn'), num(lang, m.InputTokens)],
          [t('mobile.turn.tokensOut'), num(lang, m.OutputTokens)],
          [t('mobile.usage.cost'), typeof m.CostUsd === 'number' ? formatNumber(lang, m.CostUsd, { style: 'currency', currency: 'USD' }) : '–'],
          [t('mobile.turn.context'), estimatedTokens ? num(lang, estimatedTokens) + (pct !== null ? ' / ' + num(lang, contextWindow) + ' (' + pct + '%)' : '') : '–'],
        ]}
      />
      <T variant="small" style={{ fontWeight: '600' }}>
        {t('mobile.stats.latency')}
      </T>
      <KeyValues
        rows={[
          [t('mobile.stats.ttft'), spread(lang, m.AvgTtftMs, m.P95TtftMs, m.P99TtftMs)],
          [t('mobile.stats.totalTime'), spread(lang, m.AvgTotalMs, m.P95TotalMs, m.P99TotalMs)],
          [t('mobile.stats.throughput'), typeof m.AvgTokensPerSec === 'number' ? formatNumber(lang, Math.round(m.AvgTokensPerSec)) + ' tok/s' : '–'],
        ]}
      />
      <T variant="small">{t('mobile.stats.percentiles')}</T>
      {series.length > 0 ? (
        <View style={{ gap: spacing.xs }}>
          <T variant="small" style={{ fontWeight: '600' }}>
            {t('mobile.stats.perTurn')}
          </T>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 90 }} accessible accessibilityLabel={t('mobile.stats.perTurn')}>
            {series.map((v, i) => (
              <View key={i} style={{ flex: 1, maxWidth: 24, height: Math.max(3, (v / max) * 84), backgroundColor: p.accent, borderRadius: 2 }} />
            ))}
          </View>
        </View>
      ) : null}
    </Sheet>
  );
}

/** `/effort`: the reasoning effort of the conversation's endpoint (saved on the endpoint, as the desktop app does). */
export function EffortSheet({ api, endpoint, visible, onClose, onSaved }: { api: MuxApi; endpoint: string; visible: boolean; onClose: () => void; onSaved: (level: string) => void }) {
  const { t } = useTranslation();
  const [items, setItems] = useState<MuxEndpoint[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  useEffect(() => {
    if (!visible) return;
    let alive = true;
    void Promise.resolve().then(() => alive && setError(null));
    void api
      .endpointsDetail()
      .then((r) => alive && setItems(r.Items ?? []))
      .catch((e) => alive && setError(e));
    return () => {
      alive = false;
    };
  }, [api, visible]);
  const current = (items ?? []).find((e) => e.Name === endpoint);
  const level = (current?.ReasoningEffort || 'off').toLowerCase();
  const pick = async (next: string) => {
    if (!items || !current) return;
    try {
      const saved = await api.saveEndpoints(items.map((e) => (e.Name === endpoint ? { ...e, ReasoningEffort: next === 'off' ? null : next } : e)));
      setItems(saved.Items ?? items);
      onSaved(next);
    } catch (e) {
      setError(e);
    }
  };
  return (
    <Sheet visible={visible} title={t('mobile.effort.title', { endpoint })} onClose={onClose}>
      <T variant="muted">{t('mobile.effort.intro')}</T>
      {error ? <ErrorBox error={error} /> : null}
      {!items && !error ? <Loading /> : null}
      {items && !current ? <Notice tone="warning" text={t('mobile.chat.noEndpoint')} /> : null}
      {current ? (
        <View style={{ marginHorizontal: -spacing.lg }}>
          {EFFORT_LEVELS.map((v) => (
            <ListRow key={v} title={t('mobile.effort.' + v)} subtitle={t('mobile.effort.' + v + 'Hint')} selected={v === level} onPress={() => void pick(v)} />
          ))}
        </View>
      ) : null}
    </Sheet>
  );
}

/** Recent prompts sent to this machine from this device; tap one to put it back in the message box. */
export function HistorySheet({ machineId, visible, onClose, onPick }: { machineId: string; visible: boolean; onClose: () => void; onPick: (prompt: string) => void }) {
  const { t } = useTranslation();
  const [items, setItems] = useState<string[] | null>(null);
  useEffect(() => {
    if (!visible) return;
    let alive = true;
    void loadPromptHistory(machineId).then((list) => alive && setItems(list));
    return () => {
      alive = false;
    };
  }, [machineId, visible]);
  return (
    <Sheet visible={visible} title={t('mobile.history.title')} onClose={onClose}>
      {items && items.length === 0 ? <Empty title={t('mobile.history.empty')} body={t('mobile.history.emptyBody')} /> : null}
      <View style={{ marginHorizontal: -spacing.lg }}>
        {(items ?? []).map((prompt, i) => (
          <ListRow key={i + prompt.slice(0, 20)} title={prompt.length > 140 ? prompt.slice(0, 140) + '…' : prompt} onPress={() => onPick(prompt)} />
        ))}
      </View>
    </Sheet>
  );
}

/** `/instructions`: the project instruction files a run in the conversation's folder loads. */
export function InstructionsSheet({ api, workingDirectory, visible, onClose }: { api: MuxApi; workingDirectory: string | null; visible: boolean; onClose: () => void }) {
  const p = useTheme();
  const { t } = useTranslation();
  const [data, setData] = useState<MuxInstructions | null>(null);
  const [error, setError] = useState<unknown>(null);
  useEffect(() => {
    if (!visible) return;
    let alive = true;
    void Promise.resolve().then(() => {
      if (!alive) return;
      setData(null);
      setError(null);
    });
    void api
      .instructions(workingDirectory)
      .then((r) => alive && setData(r))
      .catch((e) => alive && setError(e));
    return () => {
      alive = false;
    };
  }, [api, workingDirectory, visible]);
  return (
    <Sheet visible={visible} title={t('mobile.instructions.title')} onClose={onClose}>
      {error ? <ErrorBox error={error} /> : null}
      {!data && !error ? <Loading /> : null}
      {data ? (
        <>
          <T variant="small">{data.WorkingDirectory}</T>
          {!data.Enabled ? <Notice tone="warning" text={t('mobile.instructions.disabled')} /> : null}
          {data.Sources.length === 0 ? <Empty title={t('mobile.instructions.none')} body={t('mobile.instructions.noneBody')} /> : null}
          {data.Sources.map((src) => (
            <T key={src} variant="mono" numberOfLines={2}>
              {src}
            </T>
          ))}
          {data.DroppedSources.length > 0 ? <Notice tone="warning" text={t('mobile.instructions.dropped', { list: data.DroppedSources.join(', ') })} /> : null}
          {data.Text ? (
            <View style={{ backgroundColor: p.codeBg, borderRadius: radius.sm, padding: spacing.md }}>
              <T variant="mono" selectable style={{ fontSize: font.mono - 1 }}>
                {data.Text}
              </T>
            </View>
          ) : null}
        </>
      ) : null}
    </Sheet>
  );
}

/** The run's task plan (the model's to-do list), live while the run works. */
export function TaskPlanCard({ tasks, completed, total }: { tasks: MuxRunTask[]; completed: number; total: number }) {
  const p = useTheme();
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);
  if (tasks.length === 0) return null;
  const mark = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'completed' || s === 'done') return { glyph: '✓', color: p.success };
    if (s === 'in_progress' || s === 'running') return { glyph: '◐', color: p.warning };
    if (s === 'failed' || s === 'blocked') return { glyph: '✗', color: p.danger };
    if (s === 'skipped' || s === 'canceled') return { glyph: '–', color: p.muted };
    return { glyph: '○', color: p.muted };
  };
  return (
    <View style={{ borderWidth: 1, borderColor: p.line, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: p.panel }}>
      <Pressable onPress={() => setOpen((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded: open }} style={{ flexDirection: 'row', padding: spacing.md, gap: spacing.sm, alignItems: 'center' }}>
        <T style={{ flex: 1, fontWeight: '600' }}>{t('mobile.tasks.title')}</T>
        <T variant="small">{t('mobile.tasks.progress', { completed, total })}</T>
        <T variant="small">{open ? '▾' : '▸'}</T>
      </Pressable>
      {open ? (
        <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.md, gap: spacing.xs }}>
          {tasks.map((task) => {
            const m = mark(task.Status);
            return (
              <View key={task.Id} style={{ flexDirection: 'row', gap: spacing.sm }}>
                <T style={{ color: m.color, width: 16 }}>{m.glyph}</T>
                <T style={{ flex: 1, color: task.Status.toLowerCase() === 'completed' ? p.muted : p.text }}>{task.Title}</T>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

/**
 * `/trust`: which of the project's checked-in skills mux loads. Skills with commands run code from the repository, so
 * they load only when the project is trusted. Reset forgets the choice (mux then behaves like Playbooks only).
 */
export function TrustSheet({
  api,
  workingDirectory,
  visible,
  onClose,
  onSaved,
}: {
  api: MuxApi;
  workingDirectory: string | null;
  visible: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const { t } = useTranslation();
  const [trust, setTrust] = useState<MuxTrust | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!visible) return;
    let alive = true;
    void Promise.resolve().then(() => {
      if (!alive) return;
      setTrust(null);
      setError(null);
      api
        .trust(workingDirectory)
        .then((r) => alive && setTrust(r))
        .catch((e) => alive && setError(e));
    });
    return () => {
      alive = false;
    };
  }, [api, workingDirectory, visible]);

  const pick = async (level: (typeof TRUST_LEVELS)[number]) => {
    const dir = trust?.WorkingDirectory || workingDirectory;
    if (!dir) return;
    setBusy(true);
    try {
      const r = await api.setTrust(dir, level);
      onSaved(t('mobile.trust.set', { folder: r.ProjectRoot || r.WorkingDirectory, level: t('mobile.trust.' + r.Level) }));
      onClose();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet visible={visible} title={t('mobile.trust.title')} onClose={onClose}>
      <T variant="muted">{t('mobile.trust.intro')}</T>
      {error ? <ErrorBox error={error} /> : null}
      {!trust && !error ? <Loading /> : null}
      {trust ? (
        <>
          <KeyValues
            rows={[
              [t('mobile.trust.project'), trust.ProjectRoot || trust.WorkingDirectory],
              [t('mobile.trust.current'), t('mobile.trust.' + trust.Level)],
            ]}
          />
          <View style={{ marginHorizontal: -spacing.lg }}>
            {TRUST_LEVELS.map((level) => (
              <ListRow
                key={level}
                title={t('mobile.trust.' + level)}
                subtitle={t('mobile.trust.' + level + 'Hint')}
                selected={trust.Level === level}
                onPress={busy ? undefined : () => void pick(level)}
              />
            ))}
          </View>
        </>
      ) : null}
    </Sheet>
  );
}
