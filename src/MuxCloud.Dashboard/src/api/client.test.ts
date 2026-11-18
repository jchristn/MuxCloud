import { describe, expect, it, vi } from 'vitest';
import { ApiClient } from './client';
import { ApiError } from './ApiError';
import { authApi } from './auth';
import { machinesApi } from './machines';
import { relayApi } from './relay';

function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });
}

describe('ApiClient', () => {
  it('sends cookies in cookie mode and builds query strings', async () => {
    const fetchImpl = vi.fn(async () => json(200, { items: [], pageNumber: 1, pageSize: 25, totalCount: 0 }));
    const client = new ApiClient({ fetchImpl });
    await machinesApi.list(client, { online: true, name: 'mac', pageNumber: 2 });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/v1.0/api/machines?online=true&name=mac&pageNumber=2');
    expect(init.credentials).toBe('include');
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it('adds the bearer token and Accept-Language in bearer mode', async () => {
    const fetchImpl = vi.fn(async () => json(200, { user: {}, sessionId: 's', entitlements: { accountId: 'a', planCode: 'free', features: [] } }));
    const client = new ApiClient({ baseUrl: 'https://app.usemux.ai/', authMode: 'bearer', getAccessToken: () => 'mca_1', getLocale: () => 'de', fetchImpl });
    await authApi.me(client);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://app.usemux.ai/v1.0/api/auth/me');
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer mca_1');
    expect(headers['Accept-Language']).toBe('de');
    expect(init.credentials).toBe('omit');
  });

  it('refreshes once on 401 and retries (cookie mode)', async () => {
    const responses = [json(401, { error: 'Unauthorized' }), json(200, { sessionId: 's2' }), json(200, { id: 'usr_1' })];
    const fetchImpl = vi.fn(async () => responses.shift()!);
    const client = new ApiClient({ fetchImpl });
    const user = await client.get<{ id: string }>('/v1.0/api/account');
    expect(user.id).toBe('usr_1');
    expect((fetchImpl.mock.calls[1] as unknown as [string])[0]).toBe('/v1.0/api/auth/refresh');
  });

  it('shares one refresh between concurrent 401s and reports unauthorized when refresh fails', async () => {
    const onUnauthorized = vi.fn();
    let refreshCalls = 0;
    const fetchImpl = vi.fn(async (url: string) => {
      if (url.endsWith('/auth/refresh')) {
        refreshCalls++;
        return json(401, { error: 'InvalidToken' });
      }
      return json(401, { error: 'Unauthorized' });
    });
    const client = new ApiClient({ fetchImpl: fetchImpl as unknown as typeof fetch, onUnauthorized });
    await Promise.allSettled([client.get('/v1.0/api/a'), client.get('/v1.0/api/b')]);
    expect(refreshCalls).toBe(1);
    expect(onUnauthorized).toHaveBeenCalled();
  });

  it('does not refresh for the login route itself', async () => {
    const fetchImpl = vi.fn(async () => json(401, { error: 'InvalidCredentials', message: 'nope' }));
    const client = new ApiClient({ fetchImpl });
    await expect(authApi.login(client, { email: 'a@b.c', password: 'x' })).rejects.toMatchObject({ code: 'InvalidCredentials', status: 401 });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('parses error bodies and Retry-After', async () => {
    const fetchImpl = vi.fn(async () => json(429, { error: 'TooManyAttempts', message: 'slow down' }, { 'Retry-After': '60' }));
    const client = new ApiClient({ fetchImpl });
    const error = (await client.post('/v1.0/api/auth/login', {}).catch((e) => e)) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe('TooManyAttempts');
    expect(error.retryAfterSeconds).toBe(60);
    expect(error.message).toBe('slow down');
  });

  it('turns network failures into NetworkError and 204 into null', async () => {
    const failing = new ApiClient({ fetchImpl: vi.fn(async () => { throw new TypeError('offline'); }) });
    await expect(failing.get('/x')).rejects.toMatchObject({ code: 'NetworkError', status: 0 });
    const ok = new ApiClient({ fetchImpl: vi.fn(async () => new Response(null, { status: 204 })) });
    expect(await ok.delete('/x')).toBeNull();
  });

  it('builds relay paths and WebSocket URLs', () => {
    expect(relayApi.dashboardPath('mch_1')).toBe('/m/mch_1/dashboard');
    const client = new ApiClient({ baseUrl: 'https://app.usemux.ai' });
    expect(client.wsUrl('/v1.0/events', { ticket: 'wst_1' })).toBe('wss://app.usemux.ai/v1.0/events?ticket=wst_1');
    const sameOrigin = new ApiClient();
    expect(sameOrigin.wsUrl('/v1.0/events', undefined, 'http://127.0.0.1:5173')).toBe('ws://127.0.0.1:5173/v1.0/events');
  });
});
