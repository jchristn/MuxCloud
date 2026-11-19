import { ApiError } from '@dashboard/api';

/** True when a route is missing on the machine (404): it runs a mux older than the feature needs (2.0). */
export function isMissingRoute(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}
