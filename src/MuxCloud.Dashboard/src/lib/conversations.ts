import type { Machine, MuxSessionSummary } from '../types';

/** A conversation row in the cross-machine list. */
export interface ConversationRow {
  key: string;
  machineId: string;
  machineName: string;
  session: MuxSessionSummary;
}

/** Outcome of loading one machine's sessions. */
export interface MachineLoadResult {
  machine: Machine;
  sessions: MuxSessionSummary[] | null;
  errorCode: string | null;
}

/** Merge per-machine results into rows sorted by last update, newest first. */
export function mergeConversations(results: MachineLoadResult[]): ConversationRow[] {
  const rows: ConversationRow[] = [];
  for (const result of results) {
    for (const session of result.sessions ?? []) {
      rows.push({ key: result.machine.id + '/' + session.Id, machineId: result.machine.id, machineName: result.machine.name, session });
    }
  }
  return rows.sort((a, b) => (b.session.UpdatedUtc ?? b.session.CreatedUtc ?? '').localeCompare(a.session.UpdatedUtc ?? a.session.CreatedUtc ?? ''));
}

/** Filter rows by machine and by a search over title, model, endpoint, and labels. */
export function filterConversations(rows: ConversationRow[], machineId: string, search: string): ConversationRow[] {
  const term = search.trim().toLowerCase();
  return rows.filter((row) => {
    if (machineId && row.machineId !== machineId) return false;
    if (!term) return true;
    const s = row.session;
    const haystack = [s.Title, s.Model, s.EndpointName, s.WorkingDirectory, ...(s.Labels ?? []), row.machineName].join(' ').toLowerCase();
    return haystack.includes(term);
  });
}

/** Run tasks with a concurrency limit, preserving order. */
export async function mapWithConcurrency<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await task(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}
