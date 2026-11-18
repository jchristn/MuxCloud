import { describe, expect, it } from 'vitest';
import type { Machine } from '../types';
import { filterConversations, mapWithConcurrency, mergeConversations } from './conversations';

const machine = (id: string): Machine => ({
  id,
  name: 'host-' + id,
  online: true,
  activeRuns: 0,
  awaitingApproval: 0,
  remoteToolApproval: true,
  revoked: false,
  createdUtc: 'x',
});

describe('conversation fan-out', () => {
  it('merges and sorts newest first, then filters', () => {
    const rows = mergeConversations([
      { machine: machine('a'), sessions: [{ Id: '1', Title: 'Refactor', UpdatedUtc: '2026-01-01' }], errorCode: null },
      {
        machine: machine('b'),
        sessions: [{ Id: '2', Title: 'Tests', UpdatedUtc: '2026-02-01', Labels: ['ci'] }],
        errorCode: null,
      },
      { machine: machine('c'), sessions: null, errorCode: 'MachineOffline' },
    ]);
    expect(rows.map((r) => r.session.Id)).toEqual(['2', '1']);
    expect(filterConversations(rows, 'a', '')).toHaveLength(1);
    expect(filterConversations(rows, '', 'ci')).toHaveLength(1);
  });
  it('limits concurrency and keeps order', async () => {
    let running = 0;
    let peak = 0;
    const out = await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (n) => {
      running++;
      peak = Math.max(peak, running);
      await new Promise((r) => setTimeout(r, 5));
      running--;
      return n * 2;
    });
    expect(out).toEqual([2, 4, 6, 8, 10]);
    expect(peak).toBe(2);
  });
});
