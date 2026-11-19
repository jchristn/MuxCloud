import type { MuxQuestion } from '@/types/mux';

type Obj = Record<string, unknown>;

/** Reads a field by its PascalCase (REST, SSE) or camelCase (WebSocket frame) name. */
function field(o: Obj, name: string): unknown {
  return o[name] ?? o[name.charAt(0).toLowerCase() + name.slice(1)];
}

/**
 * Normalizes an `ask_user` question from the chat stream (PascalCase) or a run frame (camelCase). Returns null without
 * the ids an answer needs. mux always allows Other and Skip, so both default to true.
 */
export function questionFrom(data: unknown, now: number): MuxQuestion | null {
  if (!data || typeof data !== 'object') return null;
  const o = data as Obj;
  const runId = String(field(o, 'RunId') ?? '');
  const questionId = String(field(o, 'QuestionId') ?? '');
  if (!runId || !questionId) return null;
  const options = ((field(o, 'Options') as Obj[] | undefined) ?? [])
    .map((x) => ({ label: String(field(x, 'Label') ?? ''), description: (field(x, 'Description') as string | undefined) || undefined }))
    .filter((x) => x.label);
  return {
    runId,
    questionId,
    sessionId: (field(o, 'SessionId') as string | undefined) || undefined,
    question: String(field(o, 'Question') ?? ''),
    options,
    multiSelect: field(o, 'MultiSelect') === true,
    allowOther: field(o, 'AllowOther') !== false,
    allowSkip: field(o, 'AllowSkip') !== false,
    timeoutSeconds: Number(field(o, 'TimeoutSeconds') ?? 0) || 0,
    receivedAt: now,
  };
}

/** Seconds left before an unanswered question times out (and the model picks a default); null without a timeout. */
export function questionSecondsLeft(q: MuxQuestion, now: number): number | null {
  if (!q.timeoutSeconds) return null;
  return Math.max(0, Math.ceil(q.timeoutSeconds - (now - q.receivedAt) / 1000));
}

/** Adds a question to a pending list once (a reconnect replays the same frame). */
export function addQuestion(list: MuxQuestion[], q: MuxQuestion): MuxQuestion[] {
  return list.some((x) => x.questionId === q.questionId) ? list : [...list, q];
}

/** 125 seconds as 2:05. */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}
