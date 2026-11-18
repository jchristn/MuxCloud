import { describe, expect, it } from 'vitest';
import type { Machine } from '../types';
import { applyMachineEvent, machineStatus, machineTotals, sortMachines } from './machines';

const m = (id: string, online: boolean, extra: Partial<Machine> = {}): Machine => ({
  id, name: id, online, activeRuns: 0, awaitingApproval: 0, remoteToolApproval: true, revoked: false, createdUtc: '2026-01-01T00:00:00Z', ...extra,
});

describe('machine helpers', () => {
  it('applies online, updated, and removed events', () => {
    let list = [m('a', false), m('b', true)];
    list = applyMachineEvent(list, { type: 'machine.online', timestampUtc: 't', machine: m('a', true, { activeRuns: 2 }) });
    expect(list.find((x) => x.id === 'a')).toMatchObject({ online: true, activeRuns: 2 });
    list = applyMachineEvent(list, { type: 'machine.online', timestampUtc: 't', machine: m('c', true) });
    expect(list).toHaveLength(3);
    list = applyMachineEvent(list, { type: 'machine.removed', timestampUtc: 't', machineId: 'b' });
    expect(list.map((x) => x.id).sort()).toEqual(['a', 'c']);
  });
  it('sorts online first and computes totals and status', () => {
    const sorted = sortMachines([m('z', false), m('y', true, { lastSeenUtc: '2026-01-02' }), m('x', true, { lastSeenUtc: '2026-01-03' })]);
    expect(sorted.map((x) => x.id)).toEqual(['x', 'y', 'z']);
    expect(machineTotals([m('a', true, { activeRuns: 2, awaitingApproval: 1 }), m('b', false, { activeRuns: 5 })])).toEqual({ total: 2, online: 1, activeRuns: 2, awaitingApproval: 1 });
    expect(machineStatus(m('a', true, { awaitingApproval: 1 }))).toBe('approval');
    expect(machineStatus(m('a', true, { revoked: true }))).toBe('revoked');
  });
});
