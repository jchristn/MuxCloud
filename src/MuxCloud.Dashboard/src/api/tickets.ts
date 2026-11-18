import type { ApiClient } from './client';
import type { WsTicket } from '../types';

/** WebSocket tickets (REST_API.md "WebSocket tickets"). Bearer only; browsers use the session cookie. */
export const ticketsApi = {
  create: (c: ApiClient) => c.post<WsTicket>('/v1.0/api/ws-tickets', {}),
};
