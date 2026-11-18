import type { ApiClient } from './client';
import type {
  AdminMachineQuery,
  AdminSettings,
  AdminStats,
  AdminUserQuery,
  AdminUserUpdate,
  AuditQuery,
  AuditRecord,
  EntitlementOverride,
  EntitlementOverrideRequest,
  Machine,
  Page,
  Plan,
  PlanRequest,
  User,
} from '../types';

const base = '/v1.0/api/admin';
const enc = encodeURIComponent;

/** Admin routes (REST_API.md "Admin"). Every route requires isAdmin. */
export const adminApi = {
  stats: (c: ApiClient) => c.get<AdminStats>(base + '/stats'),
  users: (c: ApiClient, query?: AdminUserQuery) => c.get<Page<User>>(base + '/users', { query }),
  user: (c: ApiClient, id: string) => c.get<User>(base + '/users/' + enc(id)),
  updateUser: (c: ApiClient, id: string, update: AdminUserUpdate) => c.put<User>(base + '/users/' + enc(id), update),
  deleteUser: (c: ApiClient, id: string) => c.delete<null>(base + '/users/' + enc(id)),
  machines: (c: ApiClient, query?: AdminMachineQuery) => c.get<Page<Machine>>(base + '/machines', { query }),
  plans: (c: ApiClient) => c.get<Plan[]>(base + '/plans'),
  createPlan: (c: ApiClient, plan: PlanRequest) => c.post<Plan>(base + '/plans', plan),
  updatePlan: (c: ApiClient, id: string, plan: PlanRequest) => c.put<Plan>(base + '/plans/' + enc(id), plan),
  overrides: (c: ApiClient, accountId: string) =>
    c.get<EntitlementOverride[]>(base + '/accounts/' + enc(accountId) + '/overrides'),
  createOverride: (c: ApiClient, accountId: string, request: EntitlementOverrideRequest) =>
    c.post<EntitlementOverride>(base + '/accounts/' + enc(accountId) + '/overrides', request),
  deleteOverride: (c: ApiClient, accountId: string, id: string) =>
    c.delete<null>(base + '/accounts/' + enc(accountId) + '/overrides/' + enc(id)),
  audit: (c: ApiClient, query?: AuditQuery) => c.get<Page<AuditRecord>>(base + '/audit', { query }),
  settings: (c: ApiClient) => c.get<AdminSettings>(base + '/settings'),
  testEmail: (c: ApiClient, to: string) => c.post<unknown>(base + '/email/test', { to }),
};
