import type { ApiClient } from './client';
import type { Machine, MachineConnection, MachineQuery, Page, PageQuery } from '../types';

const base = '/v1.0/api/machines';
const one = (id: string) => base + '/' + encodeURIComponent(id);

/** Machine routes (REST_API.md "Machines"). Enrollment is done by mux itself, not by the dashboard. */
export const machinesApi = {
  list: (c: ApiClient, query?: MachineQuery) => c.get<Page<Machine>>(base, { query }),
  get: (c: ApiClient, id: string) => c.get<Machine>(one(id)),
  rename: (c: ApiClient, id: string, name: string) => c.put<Machine>(one(id), { name }),
  revoke: (c: ApiClient, id: string) => c.post<Machine>(one(id) + '/revoke', {}),
  remove: (c: ApiClient, id: string) => c.delete<null>(one(id)),
  connections: (c: ApiClient, id: string, query?: PageQuery) =>
    c.get<Page<MachineConnection>>(one(id) + '/connections', { query }),
};
