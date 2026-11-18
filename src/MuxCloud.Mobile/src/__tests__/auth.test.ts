import { AuthController } from '@/auth/AuthController';
import { memoryTokenStorage } from '@/auth/tokens';
import { fakeFetch } from './fakes';

const user = { id: 'usr_1', email: 'ada@example.com', emailVerified: true, isAdmin: false, tenantId: 't', accountId: 'a', createdUtc: '2026-11-17T00:00:00Z' };
const login = (n: number, expires = '2999-01-01T00:00:00Z') => ({
  sessionId: 'ses_1',
  user,
  accessToken: 'mca_' + n,
  accessTokenExpiresUtc: expires,
  refreshToken: 'mcr_' + n,
  refreshTokenExpiresUtc: '2999-01-01T00:00:00Z',
});
const SERVER = 'https://app.usemux.ai';

describe('AuthController', () => {
  it('signs in as a mobile client and persists the tokens per server', async () => {
    const storage = memoryTokenStorage();
    const { impl, calls } = fakeFetch({ 'POST /v1.0/api/auth/login': [{ status: 200, body: login(1) }] });
    const auth = new AuthController({ serverUrl: SERVER, storage, fetchImpl: impl, deviceName: 'Test phone' });
    await auth.signIn(' ada@example.com ', 'pw');
    expect(calls[0].body).toEqual({ email: 'ada@example.com', password: 'pw', client: 'mobile', deviceName: 'Test phone' });
    expect(auth.getState()).toMatchObject({ status: 'signedIn', user: { id: 'usr_1' } });
    expect(await storage.load(SERVER)).toMatchObject({ accessToken: 'mca_1', refreshToken: 'mcr_1' });
    expect(await storage.load('https://other.example')).toBeNull();
  });

  it('refreshes once after a 401, rotates the tokens, and retries with the new access token', async () => {
    const storage = memoryTokenStorage();
    await storage.save(SERVER, { accessToken: 'mca_1', refreshToken: 'mcr_1' });
    const { impl, calls } = fakeFetch({
      'GET /v1.0/api/auth/me': [{ status: 401, body: { error: 'InvalidToken' } }, { status: 200, body: { user, sessionId: 'ses_1', entitlements: {} } }],
      'POST /v1.0/api/auth/refresh': [{ status: 200, body: login(2) }],
    });
    const auth = new AuthController({ serverUrl: SERVER, storage, fetchImpl: impl });
    await auth.restore();
    expect(auth.getState().status).toBe('signedIn');
    const refresh = calls.filter((c) => c.url.endsWith('/auth/refresh'));
    expect(refresh).toHaveLength(1);
    expect(refresh[0].body).toEqual({ refreshToken: 'mcr_1' });
    expect(calls[calls.length - 1].headers.Authorization).toBe('Bearer mca_2');
    expect(await storage.load(SERVER)).toMatchObject({ refreshToken: 'mcr_2' });
  });

  it('shares one refresh between concurrent callers (refresh tokens rotate)', async () => {
    const storage = memoryTokenStorage();
    await storage.save(SERVER, { accessToken: 'a', refreshToken: 'r' });
    const { impl, calls } = fakeFetch({ 'POST /v1.0/api/auth/refresh': [{ status: 200, body: login(3) }] });
    const auth = new AuthController({ serverUrl: SERVER, storage, fetchImpl: impl });
    await auth.restore().catch(() => undefined);
    const results = await Promise.all([auth.refresh(), auth.refresh(), auth.refresh()]);
    expect(results).toEqual([true, true, true]);
    expect(calls.filter((c) => c.url.endsWith('/auth/refresh'))).toHaveLength(1);
  });

  it('signs out when the refresh token is rejected', async () => {
    const storage = memoryTokenStorage();
    await storage.save(SERVER, { accessToken: 'a', refreshToken: 'r' });
    const { impl } = fakeFetch({
      'GET /v1.0/api/auth/me': [{ status: 401, body: { error: 'InvalidToken' } }],
      'POST /v1.0/api/auth/refresh': [{ status: 401, body: { error: 'InvalidToken' } }],
    });
    const auth = new AuthController({ serverUrl: SERVER, storage, fetchImpl: impl });
    await auth.restore();
    expect(auth.getState().status).toBe('signedOut');
    expect(await storage.load(SERVER)).toBeNull();
  });

  it('keeps the saved session when the server is unreachable at startup', async () => {
    const storage = memoryTokenStorage();
    await storage.save(SERVER, { accessToken: 'a', refreshToken: 'r' });
    const offline = (async () => {
      throw new TypeError('Network request failed');
    }) as typeof fetch;
    const auth = new AuthController({ serverUrl: SERVER, storage, fetchImpl: offline });
    await auth.restore();
    expect(auth.getState().status).toBe('signedIn');
    expect(await storage.load(SERVER)).not.toBeNull();
  });

  it('refreshes before the access token expires instead of waiting for a 401', async () => {
    const storage = memoryTokenStorage();
    const now = Date.parse('2026-11-17T12:00:00Z');
    const { impl, calls } = fakeFetch({
      'POST /v1.0/api/auth/login': [{ status: 200, body: login(1, '2026-11-17T12:00:10Z') }],
      'POST /v1.0/api/auth/refresh': [{ status: 200, body: login(2) }],
    });
    const auth = new AuthController({ serverUrl: SERVER, storage, fetchImpl: impl, now: () => now });
    await auth.signIn('ada@example.com', 'pw');
    expect(await auth.getAccessToken()).toBe('mca_2');
    expect(calls.filter((c) => c.url.endsWith('/auth/refresh'))).toHaveLength(1);
  });

  it('gets a single-use WebSocket ticket with the bearer token', async () => {
    const storage = memoryTokenStorage();
    const { impl, calls } = fakeFetch({
      'POST /v1.0/api/auth/login': [{ status: 200, body: login(1) }],
      'POST /v1.0/api/ws-tickets': [{ status: 201, body: { ticket: 'wst_1', expiresUtc: '2999-01-01T00:00:00Z' } }],
    });
    const auth = new AuthController({ serverUrl: SERVER, storage, fetchImpl: impl });
    await auth.signIn('ada@example.com', 'pw');
    expect(await auth.wsTicket()).toBe('wst_1');
    expect(calls[1].headers.Authorization).toBe('Bearer mca_1');
  });
});
