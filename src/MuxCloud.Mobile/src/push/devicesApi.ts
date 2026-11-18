import type { ApiClient } from '@dashboard/api';

/** A registered push device (proposed backend route, see the mobile README "Backend requirements"). */
export interface PushDevice {
  id: string;
  platform: 'ios' | 'android' | string;
  name?: string;
  createdUtc?: string;
}

export interface PushDeviceRequest {
  expoPushToken: string;
  platform: 'ios' | 'android';
  name: string;
}

/**
 * Push device registration. `POST /v1.0/api/devices` registers (or refreshes) this device's Expo push token for the
 * signed-in user; `DELETE /v1.0/api/devices/{id}` removes it at sign-out. The cloud sends `approval_requested` and
 * `run_completed` notifications (from the machine's `machine.status` pushes) to every registered device.
 */
export const devicesApi = {
  register: (c: ApiClient, request: PushDeviceRequest) => c.post<PushDevice>('/v1.0/api/devices', request),
  remove: (c: ApiClient, id: string) => c.delete<null>('/v1.0/api/devices/' + encodeURIComponent(id)),
};

/** Deep link carried in a notification's data: open the conversation on its machine. */
export interface PushDeepLink {
  machineId?: string;
  sessionId?: string;
  runId?: string;
  kind?: string;
}

/** Route for a notification's deep link, or null when it does not name a machine. */
export function routeForPush(data: unknown): string | null {
  const link = (data ?? {}) as PushDeepLink;
  if (!link.machineId || typeof link.machineId !== 'string') return null;
  const machine = '/machines/' + encodeURIComponent(link.machineId);
  if (link.sessionId && typeof link.sessionId === 'string') return machine + '/conversation/' + encodeURIComponent(link.sessionId);
  return machine;
}
