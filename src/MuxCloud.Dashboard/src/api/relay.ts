import type { ApiClient } from './client';
import type { MuxListResponse, MuxSessionSummary } from '../types';

/** Path of a machine-local route through the relay: `/m/{machineId}{path}` (REST_API.md "Relay"). */
export function relayPath(machineId: string, path: string): string {
  return '/m/' + encodeURIComponent(machineId) + (path.startsWith('/') ? path : '/' + path);
}

/** Calls to a machine's own mux API through the relay. Responses are exactly what the machine returned. */
export const relayApi = {
  /** The machine's conversations (mux GET /v1.0/api/sessions). */
  sessions: (c: ApiClient, machineId: string, signal?: AbortSignal) =>
    c.get<MuxListResponse<MuxSessionSummary>>(relayPath(machineId, '/v1.0/api/sessions'), { signal }),
  /** Generic JSON call to a machine route. */
  call: <T>(c: ApiClient, machineId: string, method: string, path: string, body?: unknown) =>
    c.request<T>(relayPath(machineId, path), { method, body }),
  /** The URL of the machine's own dashboard, rendered to call back through the relay. */
  dashboardPath: (machineId: string) => relayPath(machineId, '/dashboard'),
};
