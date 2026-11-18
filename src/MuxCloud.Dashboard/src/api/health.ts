import type { ApiClient } from './client';
import type { HealthResponse } from '../types';

export const healthApi = {
  get: (c: ApiClient) => c.get<HealthResponse>('/v1.0/api/health', { skipRefresh: true }),
};
