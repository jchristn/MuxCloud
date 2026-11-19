/** Pure helpers for conversation status, context usage, the stats sheet, and `<details>` blocks (exported for tests). */
import type { MuxRunSummary, MuxSessionSummary } from '@/types/mux';

/** Share of the context window in use, 0 to 100, or null when either number is unknown. */
export function contextPercent(estimatedTokens: number | null | undefined, contextWindow: number | null | undefined): number | null {
  if (!estimatedTokens || !contextWindow || contextWindow <= 0) return null;
  return Math.max(0, Math.min(100, Math.round((estimatedTokens / contextWindow) * 100)));
}

export type SessionStatus = 'running' | 'approval' | 'error' | 'unread';

/**
 * Status dot for each conversation, from the machine's run list (`GET /runs`, which keeps finished runs for about five
 * minutes) and when this device last opened each conversation. A live run wins; then a recent failure; then unread
 * (changed since last opened, or since `baseline` for conversations never opened here).
 */
export function sessionStatuses(runs: MuxRunSummary[], sessions: MuxSessionSummary[], seen: Record<string, number>, baseline: number): Record<string, SessionStatus> {
  const out: Record<string, SessionStatus> = {};
  for (const run of runs) {
    if (!run.SessionId) continue;
    const status = (run.Status || '').toLowerCase();
    if (!run.IsTerminal) out[run.SessionId] = status === 'awaiting_approval' ? 'approval' : out[run.SessionId] === 'approval' ? 'approval' : 'running';
    else if (status === 'failed' && !out[run.SessionId]) out[run.SessionId] = 'error';
  }
  for (const s of sessions) {
    if (out[s.Id] || !s.UpdatedUtc) continue;
    const updated = Date.parse(s.UpdatedUtc);
    if (Number.isFinite(updated) && updated > (seen[s.Id] ?? baseline)) out[s.Id] = 'unread';
  }
  return out;
}

/** Tokens per assistant turn, oldest first (the stats sheet's chart). */
export function tokensPerTurn(turns: { role: string; stats?: { TotalTokens?: number; InputTokens?: number; OutputTokens?: number } }[]): number[] {
  return turns
    .filter((t) => t.role === 'assistant' && t.stats)
    .map((t) => t.stats?.TotalTokens ?? (t.stats?.InputTokens ?? 0) + (t.stats?.OutputTokens ?? 0));
}

export type MarkdownSegment = { kind: 'markdown'; text: string } | { kind: 'details'; summary: string; body: string; open: boolean };

/** Split reply text into markdown and `<details><summary>…</summary>…</details>` blocks, which render collapsible. */
export function splitDetails(text: string): MarkdownSegment[] {
  const out: MarkdownSegment[] = [];
  const re = /<details(\s+open)?\s*>\s*(?:<summary>([\s\S]*?)<\/summary>)?([\s\S]*?)<\/details>/gi;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text ?? '')) !== null) {
    if (m.index > last) out.push({ kind: 'markdown', text: text.slice(last, m.index) });
    out.push({ kind: 'details', summary: (m[2] ?? '').replace(/<[^>]+>/g, '').trim(), body: (m[3] ?? '').trim(), open: !!m[1] });
    last = m.index + m[0].length;
  }
  if (last < (text ?? '').length) out.push({ kind: 'markdown', text: text.slice(last) });
  return out.filter((s) => s.kind === 'details' || s.text.trim().length > 0);
}

/** Pretty-print a JSON string for display; other text is returned unchanged. */
export function prettyJson(text: string | null | undefined): string {
  const value = (text ?? '').trim();
  if (!value || !/^[[{]/.test(value)) return value;
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}
