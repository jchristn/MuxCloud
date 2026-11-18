/**
 * A failed Mux Cloud request. `code` is the stable error code from the body (`{ "error": "<Code>" }`), which clients
 * localize; `message` is the server's English text, shown only when no translation exists.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly retryAfterSeconds: number | null;
  readonly body: unknown;

  constructor(status: number, code: string, message: string, retryAfterSeconds: number | null = null, body: unknown = null) {
    super(message || code);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
    this.body = body;
  }

  /** True for network failures (no HTTP response at all). */
  get isNetwork(): boolean {
    return this.status === 0;
  }
}

/** Codes the client produces itself, without a server response. */
export const ClientErrorCodes = {
  Network: 'NetworkError',
  InvalidJson: 'InvalidJson',
  Aborted: 'Aborted',
} as const;
