import type { ApiClient } from './client';
import type { AccountUpdateRequest, AuthSession, Page, PageQuery, PasswordChangeRequest, User } from '../types';

const base = '/v1.0/api/account';

/** Account routes (REST_API.md "Account"). */
export const accountApi = {
  get: (c: ApiClient) => c.get<User>(base),
  update: (c: ApiClient, request: AccountUpdateRequest) => c.put<User>(base, request),
  changePassword: (c: ApiClient, request: PasswordChangeRequest) => c.post<null>(base + '/password', request),
  sessions: (c: ApiClient, query?: PageQuery) => c.get<Page<AuthSession>>(base + '/sessions', { query }),
  revokeSession: (c: ApiClient, id: string) => c.delete<null>(base + '/sessions/' + encodeURIComponent(id)),
  deleteAccount: (c: ApiClient, password: string) => c.delete<null>(base, { password }),
};
