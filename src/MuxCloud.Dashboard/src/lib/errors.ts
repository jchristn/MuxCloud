import { ApiError } from '../api/ApiError';

/** Error codes the catalog translates under `errors.<code>`. Anything else falls back to `errors.generic`. */
export const KNOWN_ERROR_CODES = [
  'BadRequest',
  'Unauthorized',
  'InvalidCredentials',
  'InvalidToken',
  'EntitlementExceeded',
  'Forbidden',
  'EmailNotVerified',
  'OriginNotAllowed',
  'AccountDisabled',
  'NotFound',
  'Conflict',
  'EmailInUse',
  'BodyTooLarge',
  'TooManyAttempts',
  'NotImplemented',
  'MachineOffline',
  'TooManyStreams',
  'Timeout',
  'InternalServerError',
  'NetworkError',
  'InvalidJson',
  'Aborted',
] as const;

export type KnownErrorCode = (typeof KNOWN_ERROR_CODES)[number];

/** The translation key and interpolation values for an error. */
export interface ErrorText {
  key: string;
  values: Record<string, string | number>;
  /** The server's own message, for a details line. */
  detail: string;
}

export function errorText(error: unknown): ErrorText {
  if (error instanceof ApiError) {
    const code = (KNOWN_ERROR_CODES as readonly string[]).includes(error.code) ? error.code : 'generic';
    const values: Record<string, string | number> = { status: error.status };
    if (error.retryAfterSeconds !== null) values.seconds = error.retryAfterSeconds;
    return { key: 'errors.' + code, values, detail: error.message };
  }
  return { key: 'errors.generic', values: { status: 0 }, detail: error instanceof Error ? error.message : String(error) };
}
