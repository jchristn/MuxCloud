import type { ApiClient } from './client';
import type {
  DeletedCountResponse,
  Page,
  RequestHistoryDetail,
  RequestHistoryEntry,
  RequestHistoryQuery,
  RequestHistorySummary,
} from '../types';

const base = '/v1.0/api/request-history';

/** Request history routes (REST_API.md "Request history"). Admin only. */
export const requestHistoryApi = {
  list: (c: ApiClient, query?: RequestHistoryQuery) => c.get<Page<RequestHistoryEntry>>(base, { query }),
  summary: (c: ApiClient, fromUtc: string, toUtc: string, bucketMinutes: number) =>
    c.get<RequestHistorySummary>(base + '/summary', { query: { fromUtc, toUtc, bucketMinutes } }),
  get: (c: ApiClient, id: string) => c.get<RequestHistoryDetail>(base + '/' + encodeURIComponent(id)),
  remove: (c: ApiClient, id: string) => c.delete<null>(base + '/' + encodeURIComponent(id)),
  removeMatching: (c: ApiClient, query: Omit<RequestHistoryQuery, 'pageNumber' | 'pageSize'>) =>
    c.delete<DeletedCountResponse>(base, undefined, { query }),
};
