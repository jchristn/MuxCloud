import type { ChatStreamEvent } from '@/relay/chatStream';
import type { MuxAttachments, MuxChatMessage, MuxChatStats, MuxSessionDetail, MuxWsFrame } from '@/types/mux';

/** A tool call shown inside an assistant turn. */
export interface ToolLine {
  id: string;
  name: string;
  status: 'running' | 'ok' | 'fail' | string;
  elapsedMs?: number;
  /** JSON arguments, when known (saved turns and mirrored runs). */
  arguments?: string;
  /** The tool's output, when known (saved turns). */
  result?: string;
}

/** One rendered turn. `pending` marks the assistant turn still streaming. */
export interface Turn {
  key: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  thinking?: string;
  tools: ToolLine[];
  model?: string;
  stats?: MuxChatStats;
  pending?: boolean;
  error?: boolean;
  displayOnly?: boolean;
  /** Run that produced this turn, for the turn info sheet (`GET /runs/{id}`). */
  runId?: string;
  /** Local-only rich content rendered instead of `content` (the clickable help card). */
  card?: 'help';
  /** On a user turn: what its `@path` mentions attached (the `attachments` chat event). */
  attachments?: MuxAttachments;
  /** The text mux saved, when it differs from what is shown (a prompt with its mentioned files appended). */
  sentContent?: string;
}

/** A pending tool approval, from the SSE `approval` event or a WebSocket `approval_requested` frame. */
export interface PendingApproval {
  runId: string;
  toolCallId: string;
  toolName: string;
  arguments: string;
  autoApproveSeconds: number;
  receivedAt: number;
  sessionId?: string;
}

/**
 * Turn a stored transcript into display turns, the way the local mux dashboard does: tool-role messages fold into the
 * preceding assistant turn as tool lines, and assistant tool calls are listed by name.
 */
export function turnsFromDetail(detail: MuxSessionDetail | null): Turn[] {
  if (!detail) return [];
  const turns: Turn[] = [];
  detail.Messages.forEach((m: MuxChatMessage, index) => {
    const role = (m.Role || 'assistant').toLowerCase();
    if (role === 'tool') {
      const last = turns[turns.length - 1];
      if (last && last.role === 'assistant') {
        const line = last.tools.find((t) => t.id === m.ToolCallId);
        if (line) {
          line.status = 'ok';
          line.result = m.Content ?? '';
        }
      }
      return;
    }
    // mux saves a user prompt with its @mentioned files appended; show the prompt and an attachments line instead,
    // and keep the full text so the next turn's history still carries the files.
    const mention = role === 'user' ? splitMentionBlock(m.Content ?? '') : null;
    turns.push({
      key: 'm' + index,
      role: role === 'user' || role === 'system' ? role : 'assistant',
      content: mention ? mention.text : (m.Content ?? ''),
      sentContent: mention ? m.Content : undefined,
      attachments: mention?.attachments,
      thinking: m.Reasoning ?? undefined,
      tools: (m.ToolCalls ?? []).map((c) => ({ id: c.Id, name: c.Name, status: 'ok', arguments: c.Arguments })),
      model: m.Model ?? undefined,
      stats: m.Stats ?? undefined,
      displayOnly: m.DisplayOnly,
    });
  });
  return turns;
}

/** Apply one chat-stream event to the streaming assistant turn (mutates and returns it). */
export function applyChatEvent(turn: Turn, event: ChatStreamEvent): Turn {
  switch (event.type) {
    case 'token':
      turn.content += event.text;
      break;
    case 'thinking':
      turn.thinking = (turn.thinking ?? '') + event.text;
      break;
    case 'tool': {
      const existing = turn.tools.find((t) => t.id === event.tool.Id);
      // mux 2.0.0 sends the arguments on the running event and the (possibly truncated) result on the finished one.
      const result = event.tool.Result ? event.tool.Result + (event.tool.ResultTruncated ? '\n...' : '') : undefined;
      if (existing) {
        existing.status = event.tool.Status;
        existing.elapsedMs = event.tool.ElapsedMs;
        if (event.tool.Arguments) existing.arguments = event.tool.Arguments;
        if (result !== undefined) existing.result = result;
      } else {
        turn.tools.push({
          id: event.tool.Id,
          name: event.tool.Name,
          status: event.tool.Status,
          elapsedMs: event.tool.ElapsedMs,
          arguments: event.tool.Arguments ?? undefined,
          result,
        });
      }
      break;
    }
    case 'done':
      turn.content = event.reply.Content || turn.content;
      turn.model = event.reply.Model || turn.model;
      turn.stats = event.reply.Stats ?? turn.stats;
      turn.pending = false;
      break;
    case 'error':
      turn.content = turn.content ? turn.content + '\n\n' + event.message : event.message;
      turn.error = true;
      turn.pending = false;
      break;
    case 'canceled':
      turn.pending = false;
      break;
    default:
      break;
  }
  return turn;
}

/** Apply one mirrored run frame (a run started elsewhere) to a live turn. Returns true when the run finished. */
export function applyRunFrame(turn: Turn, frame: MuxWsFrame): boolean {
  switch (frame.eventType) {
    case 'assistant_text':
      turn.content += frame.text ?? '';
      return false;
    case 'assistant_thinking':
      turn.thinking = (turn.thinking ?? '') + (frame.text ?? '');
      return false;
    case 'tool_call_proposed': {
      // Replayed runs (after a reconnect) send the same proposal again: keep one line per tool call.
      const id = frame.toolCall?.id ?? '';
      const existing = id ? turn.tools.find((t) => t.id === id) : undefined;
      if (existing) existing.status = 'running';
      else turn.tools.push({ id, name: frame.toolCall?.name ?? '', status: 'running', arguments: frame.toolCall?.arguments });
      return false;
    }
    case 'tool_call_completed': {
      const ok = frame.result?.success !== false;
      const line = turn.tools.find((t) => t.id === frame.toolCallId);
      if (line) {
        line.status = ok ? 'ok' : 'fail';
        line.elapsedMs = frame.elapsedMs;
      } else {
        turn.tools.push({ id: frame.toolCallId ?? '', name: frame.toolName ?? '', status: ok ? 'ok' : 'fail', elapsedMs: frame.elapsedMs });
      }
      return false;
    }
    case 'error':
      turn.content += (turn.content ? '\n\n' : '') + (frame.message ?? 'error');
      turn.error = true;
      return false;
    case 'run_completed':
      turn.pending = false;
      // A canceled or failed run leaves its unfinished tool calls behind; they will not complete now.
      for (const t of turn.tools) if (t.status === 'running') t.status = 'canceled';
      return true;
    default:
      return false;
  }
}

/** Approval from a WebSocket frame, or null for any other frame. */
export function approvalFromFrame(frame: MuxWsFrame, now: number): PendingApproval | null {
  if (frame.eventType !== 'approval_requested' || !frame.runId || !frame.toolCallId) return null;
  return {
    runId: frame.runId,
    toolCallId: frame.toolCallId,
    toolName: frame.toolName ?? '',
    arguments: frame.arguments ?? '',
    autoApproveSeconds: Math.max(0, frame.toolAutoApproveSeconds ?? 0),
    receivedAt: now,
    sessionId: frame.sessionId,
  };
}

/** Seconds left before an approval auto-approves, or null when it never does. */
export function secondsRemaining(approval: PendingApproval, now: number): number | null {
  if (approval.autoApproveSeconds <= 0) return null;
  return Math.max(0, Math.ceil(approval.autoApproveSeconds - (now - approval.receivedAt) / 1000));
}

/** Messages to send with the next turn, the way the local dashboard builds them (no pending or local-only turns). */
export function historyForRequest(turns: Turn[]): { Role: string; Content: string; DisplayOnly?: boolean }[] {
  return turns
    .filter((t) => !t.pending && !t.error && (t.role === 'user' || t.role === 'assistant' || (t.role === 'system' && t.displayOnly)))
    .map((t) => (t.displayOnly ? { Role: t.role, Content: t.content, DisplayOnly: true } : { Role: t.role, Content: t.sentContent ?? t.content }));
}

/**
 * Splits mux's `<mentioned-files>` block (FileMentionResolver.BuildBlock) off a saved user prompt. Returns null when
 * the prompt has none; otherwise the prompt text and the attached paths with their line or entry counts.
 */
export function splitMentionBlock(content: string): { text: string; attachments: MuxAttachments } | null {
  const start = content.lastIndexOf('<mentioned-files>');
  if (start < 0 || !content.trimEnd().endsWith('</mentioned-files>')) return null;
  const block = content.slice(start);
  const attached: MuxAttachments['Attached'] = [];
  for (const m of block.matchAll(/<(file|directory) path="([^"]*)" (?:lines|entries)="(\d+)"/g)) {
    attached.push({ Path: m[2], Kind: m[1], Lines: m[1] === 'file' ? Number(m[3]) : undefined });
  }
  return { text: content.slice(0, start).trimEnd(), attachments: { Attached: attached, Skipped: [], Notes: [], TotalBytes: 0 } };
}

/** Parse a chat slash command. Built-in commands win over skills with the same name. */
export function parseSlash(text: string): { command: string; args: string } | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith('/')) return null;
  const space = trimmed.indexOf(' ');
  return space < 0 ? { command: trimmed.slice(1).toLowerCase(), args: '' } : { command: trimmed.slice(1, space).toLowerCase(), args: trimmed.slice(space + 1).trim() };
}

/** Chat commands that open a management screen, mapped to the mobile route segment (mirrors the dashboard CHAT_HELP). */
export const SLASH_SCREENS: Record<string, string> = {
  usage: 'usage',
  endpoints: 'endpoints',
  models: 'endpoints',
  mcp: 'mcp',
  prompts: 'prompts',
  skills: 'skills',
  subagents: 'subagents',
  pricing: 'pricing',
  plugins: 'hooks',
  hooks: 'hooks',
  commands: 'commands',
  keybindings: 'keybindings',
  settings: 'settings',
  processes: 'processes',
  search: 'search',
};
