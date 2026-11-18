import { relayPath } from '@dashboard/api';
import { EventsClient, type EventsConnectionState, type SocketLike } from '@dashboard/lib';
import type { AccountEvent } from '@dashboard/types';
import type { AuthController } from '@/auth/AuthController';
import { MachineSocket, type MachineSocketOptions } from '@/relay/machineSocket';

/** WebSocket factory used in the app: React Native's global WebSocket. Tests inject fakes. */
export const nativeSocketFactory = (url: string): SocketLike => new WebSocket(url) as unknown as SocketLike;

/** URL of a ticket-authenticated socket: `wss://host<path>?ticket=...` (REST_API.md "WebSocket tickets"). */
export async function ticketUrl(auth: AuthController, path: string): Promise<string> {
  const ticket = await auth.wsTicket();
  return auth.client.wsUrl(path, { ticket });
}

/**
 * The account events client (`/v1.0/events`) wired for mobile: each connection attempt fetches a fresh single-use
 * ticket, and a 4401 close signs the app out.
 */
export function createAccountEvents(
  auth: AuthController,
  handlers: { onEvent: (event: AccountEvent) => void; onStateChange?: (state: EventsConnectionState) => void },
  socketFactory: (url: string) => SocketLike = nativeSocketFactory,
): EventsClient {
  return new EventsClient({
    getUrl: () => ticketUrl(auth, '/v1.0/events'),
    socketFactory,
    onEvent: handlers.onEvent,
    onStateChange: handlers.onStateChange,
    onUnauthorized: () => {
      void auth.signOut();
    },
  });
}

/** A machine's relayed mux WebSocket (`/m/{id}/v1.0/ws`) with ticket authentication. */
export function createMachineSocket(
  auth: AuthController,
  machineId: string,
  options: Omit<MachineSocketOptions, 'getUrl' | 'socketFactory'> & { socketFactory?: (url: string) => SocketLike },
): MachineSocket {
  return new MachineSocket({
    ...options,
    getUrl: () => ticketUrl(auth, relayPath(machineId, '/v1.0/ws')),
    socketFactory: options.socketFactory ?? nativeSocketFactory,
  });
}
