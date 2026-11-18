import { relayPath, type ApiClient } from '@dashboard/api';
import type { SseEvent } from '@/lib/sse';
import { streamSse, type SseHandle, type XhrLike } from '@/lib/sseTransport';
import type { MuxApprovalRequest, MuxChatReply, MuxChatRequest, MuxToolEvent } from '@/types/mux';

/** Typed events of `POST /v1.0/api/chat/stream` (mux ChatRoutes.cs). */
export type ChatStreamEvent =
  | { type: 'run'; runId: string; sessionId: string }
  | { type: 'token'; text: string }
  | { type: 'thinking'; text: string }
  | { type: 'tool'; tool: MuxToolEvent }
  | { type: 'approval'; approval: MuxApprovalRequest }
  | { type: 'plan'; plan: unknown; text: string; executionPrompt: string }
  | { type: 'done'; reply: MuxChatReply }
  | { type: 'canceled' }
  | { type: 'error'; message: string };

/** Map one server-sent event to a typed chat event. Unknown or malformed events return null. */
export function toChatEvent(event: SseEvent): ChatStreamEvent | null {
  let data: unknown;
  try {
    data = JSON.parse(event.data);
  } catch {
    return null;
  }
  const obj = (data ?? {}) as Record<string, unknown>;
  switch (event.event) {
    case 'run':
      return { type: 'run', runId: String(obj.RunId ?? ''), sessionId: String(obj.SessionId ?? '') };
    case 'token':
      return typeof data === 'string' ? { type: 'token', text: data } : null;
    case 'thinking':
      return typeof data === 'string' ? { type: 'thinking', text: data } : null;
    case 'tool':
      return { type: 'tool', tool: data as MuxToolEvent };
    case 'approval':
      return { type: 'approval', approval: data as MuxApprovalRequest };
    case 'plan':
      return { type: 'plan', plan: obj.plan, text: String(obj.text ?? ''), executionPrompt: String(obj.executionPrompt ?? '') };
    case 'done':
      return { type: 'done', reply: data as MuxChatReply };
    case 'canceled':
      return { type: 'canceled' };
    case 'error':
      return { type: 'error', message: typeof data === 'string' ? data : String(obj.message ?? obj.Message ?? 'error') };
    default:
      return null;
  }
}

export interface ChatStreamOptions {
  client: ApiClient;
  machineId: string;
  request: MuxChatRequest;
  getAccessToken: () => Promise<string | null>;
  /** Called once after a 401 to rotate tokens; true means retry. */
  refresh: () => Promise<boolean>;
  onEvent: (event: ChatStreamEvent) => void;
  /** HTTP failure before streaming began, with the parsed error code and message. */
  onError: (status: number, code: string, message: string) => void;
  onDone: () => void;
  xhrFactory?: () => XhrLike;
}

/**
 * Start a chat turn on a machine through the relay and stream its events. One automatic retry after a 401 (rotated
 * access token). Returns a handle whose abort() stops reading; the relay then tells the machine to cancel.
 */
export function startChatStream(options: ChatStreamOptions): SseHandle {
  let current: SseHandle | null = null;
  let aborted = false;

  const attempt = async (retried: boolean) => {
    const token = await options.getAccessToken();
    if (aborted) return;
    current = streamSse({
      url: options.client.url(relayPath(options.machineId, '/v1.0/api/chat/stream')),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
      body: JSON.stringify(options.request),
      xhrFactory: options.xhrFactory,
      onEvent: (event) => {
        const typed = toChatEvent(event);
        if (typed) options.onEvent(typed);
      },
      onError: (status, bodyText) => {
        if (status === 401 && !retried) {
          void options.refresh().then((ok) => {
            if (aborted) return;
            if (ok) void attempt(true);
            else options.onError(401, 'Unauthorized', 'Your session ended. Sign in again.');
          });
          return;
        }
        const { code, message } = parseError(status, bodyText);
        options.onError(status, code, message);
      },
      onDone: options.onDone,
    });
  };

  void attempt(false);
  return {
    abort() {
      aborted = true;
      current?.abort();
    },
  };
}

/** Error code and message from a Mux Cloud (`error`/`message`) or mux (`Error`/`Message`) error body. */
export function parseError(status: number, bodyText: string): { code: string; message: string } {
  if (status === 0) return { code: 'NetworkError', message: 'Could not reach Mux Cloud. Check your connection.' };
  try {
    const body = JSON.parse(bodyText) as Record<string, unknown>;
    const code = String(body.error ?? body.Error ?? 'HttpError' + status);
    const message = String(body.message ?? body.Message ?? 'HTTP ' + status);
    return { code, message };
  } catch {
    return { code: 'HttpError' + status, message: 'HTTP ' + status };
  }
}
