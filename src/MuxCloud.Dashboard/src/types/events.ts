import type { Entitlements, Machine } from './models';

/** Messages on the account events socket (WEBSOCKETS_API.md section 2.2). */
export type AccountEvent =
  | { type: 'server.connected'; timestampUtc: string; userId: string; heartbeatSeconds: number }
  | { type: 'machine.online'; timestampUtc: string; machine: Machine }
  | { type: 'machine.offline'; timestampUtc: string; machine: Machine }
  | { type: 'machine.updated'; timestampUtc: string; machine: Machine }
  | { type: 'machine.removed'; timestampUtc: string; machineId: string }
  | { type: 'subscription.updated'; timestampUtc: string; entitlements: Entitlements }
  | { type: 'ping'; timestampUtc: string };

export type AccountEventType = AccountEvent['type'];
