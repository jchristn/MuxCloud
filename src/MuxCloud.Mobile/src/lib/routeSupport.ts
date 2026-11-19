import { ApiError } from '@dashboard/api';

/**
 * True when the machine's mux does not have a route yet (404 Not Found or 405 Method Not Allowed). Features are gated
 * on whether their route answers, never on the reported mux version: development builds keep the old version number.
 */
export function isMissingRoute(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 404 || error.status === 405);
}
