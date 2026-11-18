import type { AccountEvent, Machine } from '../types';

/** Apply one account event to a machine list. Returns a new array (or the same one when nothing changed). */
export function applyMachineEvent(machines: Machine[], event: AccountEvent): Machine[] {
  switch (event.type) {
    case 'machine.online':
    case 'machine.offline':
    case 'machine.updated': {
      const index = machines.findIndex((m) => m.id === event.machine.id);
      if (index < 0) return sortMachines([...machines, event.machine]);
      const next = machines.slice();
      next[index] = { ...machines[index], ...event.machine };
      return next;
    }
    case 'machine.removed':
      return machines.some((m) => m.id === event.machineId) ? machines.filter((m) => m.id !== event.machineId) : machines;
    default:
      return machines;
  }
}

/** Online first, then most recently seen, then by name. */
export function sortMachines(machines: Machine[]): Machine[] {
  return machines.slice().sort((a, b) => {
    if (a.online !== b.online) return a.online ? -1 : 1;
    const seen = (b.lastSeenUtc ?? '').localeCompare(a.lastSeenUtc ?? '');
    if (seen !== 0) return seen;
    return a.name.localeCompare(b.name);
  });
}

/** Display status of a machine. */
export type MachineStatus = 'online' | 'offline' | 'revoked' | 'approval';

export function machineStatus(machine: Machine): MachineStatus {
  if (machine.revoked) return 'revoked';
  if (!machine.online) return 'offline';
  return machine.awaitingApproval > 0 ? 'approval' : 'online';
}

export interface MachineTotals {
  total: number;
  online: number;
  activeRuns: number;
  awaitingApproval: number;
}

export function machineTotals(machines: Machine[]): MachineTotals {
  return machines.reduce<MachineTotals>(
    (t, m) => ({
      total: t.total + 1,
      online: t.online + (m.online ? 1 : 0),
      activeRuns: t.activeRuns + (m.online ? m.activeRuns : 0),
      awaitingApproval: t.awaitingApproval + (m.online ? m.awaitingApproval : 0),
    }),
    { total: 0, online: 0, activeRuns: 0, awaitingApproval: 0 },
  );
}
