import type { Page, Route, WebSocketRoute } from '@playwright/test';

/** Fixtures and route mocks that stand in for a Mux Cloud server (REST_API.md, WEBSOCKETS_API.md). */
export const now = new Date('2026-11-17T18:00:00Z');
const iso = (offsetMs: number) => new Date(now.getTime() + offsetMs).toISOString();

export const user = {
  id: 'usr_01JDUSER0000000000000000',
  email: 'ada@example.com',
  firstName: 'Ada',
  lastName: 'Lovelace',
  emailVerified: true,
  isAdmin: true,
  active: true,
  tenantId: 'ten_01JDTENANT00000000000000',
  accountId: 'acct_01JDACCOUNT0000000000000',
  createdUtc: iso(-90 * 86400_000),
};

export const entitlements = {
  accountId: user.accountId,
  planCode: 'free',
  features: [
    { key: 'web.access', enabled: true, limit: null },
    { key: 'mobile.access', enabled: true, limit: null },
    { key: 'machines.max', enabled: true, limit: null },
    { key: 'relay.concurrentStreams.max', enabled: true, limit: null },
  ],
};

export function machine(id: string, name: string, online: boolean, extra: Record<string, unknown> = {}) {
  return {
    id,
    name,
    hostname: name + '.local',
    os: 'macOS 26.0 arm64',
    muxVersion: '2.0.0',
    protocolVersion: 1,
    online,
    lastSeenUtc: online ? iso(0) : iso(-3 * 3600_000),
    lastConnectedUtc: iso(-86400_000),
    activeRuns: online ? 1 : 0,
    awaitingApproval: 0,
    remoteToolApproval: true,
    secretLast4: 'Xa9Q',
    revoked: false,
    createdUtc: iso(-30 * 86400_000),
    userId: user.id,
    ...extra,
  };
}

export const machines = [
  machine('mch_01JDSTUDIO00000000000000', 'studio-mac', true, { awaitingApproval: 1 }),
  machine('mch_01JDLAPTOP00000000000000', 'travel-laptop', false),
  machine('mch_01JDBUILD000000000000000', 'build-box-with-a-rather-long-name', true, {
    os: 'Ubuntu 24.04 x64',
    activeRuns: 3,
  }),
];

const page = <T>(items: T[]) => ({ items, pageNumber: 1, pageSize: 25, totalCount: items.length });

export interface MockOptions {
  authenticated?: boolean;
  machineList?: ReturnType<typeof machine>[];
  failSessionsFor?: string;
  emptySessionsFor?: string[];
}

export interface MockHandle {
  /** Push an account event to every open events socket. */
  emit: (event: Record<string, unknown>) => void;
  requests: string[];
}

function json(route: Route, status: number, body: unknown, headers: Record<string, string> = {}) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: body === null ? '' : JSON.stringify(body),
    headers,
  });
}

const openapi = {
  openapi: '3.0.1',
  paths: {
    '/v1.0/api/health': { get: { tags: ['Health'], summary: 'Health check' } },
    '/v1.0/api/machines': {
      get: {
        tags: ['Machines'],
        summary: 'List machines',
        parameters: [{ name: 'online', in: 'query', schema: { type: 'boolean' } }],
      },
    },
    '/v1.0/api/machines/{id}': {
      get: { tags: ['Machines'], summary: 'Get machine' },
      delete: { tags: ['Machines'], summary: 'Delete machine' },
    },
  },
};

export async function mockServer(pw: Page, options: MockOptions = {}): Promise<MockHandle> {
  let authenticated = options.authenticated ?? true;
  const list = options.machineList ?? machines;
  const sockets: WebSocketRoute[] = [];
  const requests: string[] = [];

  await pw.routeWebSocket(/\/v1\.0\/events/, (ws) => {
    sockets.push(ws);
    ws.send(JSON.stringify({ type: 'server.connected', timestampUtc: iso(0), userId: user.id, heartbeatSeconds: 20 }));
  });

  await pw.route(/\/(v1\.0|m)\//, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();
    requests.push(method + ' ' + path + url.search);

    if (path.startsWith('/m/')) {
      const [, , id, ...rest] = path.split('/');
      const local = '/' + rest.join('/');
      if (local === '/dashboard')
        return route.fulfill({
          status: 200,
          contentType: 'text/html',
          body:
            '<!doctype html><html><body style="font-family:sans-serif"><h1 id="mux-dashboard">mux dashboard for ' +
            id +
            '</h1></body></html>',
        });
      if (local === '/v1.0/api/sessions') {
        if (options.failSessionsFor === id)
          return json(route, 504, { error: 'Timeout', message: 'The machine did not answer in time.' });
        if (options.emptySessionsFor?.includes(id)) return json(route, 200, { Items: [], Count: 0 });
        return json(route, 200, {
          Items: [
            {
              Id: 'ses-' + id.slice(-4) + '-1',
              Title: 'Refactor the relay for ' + id.slice(4, 10),
              Model: 'claude-opus-5-5',
              EndpointName: 'anthropic',
              MessageCount: 12,
              WorkingDirectory: '/Users/ada/Code/Mux',
              UpdatedUtc: iso(-600_000),
              Labels: ['relay'],
            },
            {
              Id: 'ses-' + id.slice(-4) + '-2',
              Title: 'Write tests',
              Model: 'qwen3-coder',
              MessageCount: 4,
              WorkingDirectory: '/home/ada/proj',
              UpdatedUtc: iso(-86400_000),
            },
          ],
          Count: 2,
        });
      }
      return json(route, 404, { error: 'NotFound' });
    }

    if (path === '/v1.0/api/auth/me')
      return authenticated
        ? json(route, 200, { user, sessionId: 'ses_1', entitlements })
        : json(route, 401, { error: 'Unauthorized' });
    if (path === '/v1.0/api/auth/refresh') return json(route, 401, { error: 'InvalidToken' });
    if (path === '/v1.0/api/auth/login') {
      const body = request.postDataJSON() as { email: string; password: string };
      if (body.password === 'wrong') return json(route, 401, { error: 'InvalidCredentials', message: 'bad' });
      if (body.email === 'new@example.com') return json(route, 403, { error: 'EmailNotVerified' });
      if (body.password === 'locked') return json(route, 429, { error: 'TooManyAttempts' }, { 'Retry-After': '120' });
      authenticated = true;
      return json(route, 200, { sessionId: 'ses_1', user });
    }
    if (path === '/v1.0/api/auth/logout') {
      authenticated = false;
      return route.fulfill({ status: 204 });
    }
    if (path === '/v1.0/api/auth/signup') {
      const body = request.postDataJSON() as { email: string };
      if (body.email === 'taken@example.com') return json(route, 409, { error: 'EmailInUse' });
      return json(route, 201, { userId: 'usr_new', email: body.email, status: 'pending_verification' });
    }
    if (path === '/v1.0/api/auth/verify') return json(route, 200, { verified: true, email: user.email });
    if (path.startsWith('/v1.0/api/auth/')) return json(route, 202, { accepted: true });

    if (!authenticated) return json(route, 401, { error: 'Unauthorized' });

    if (path === '/v1.0/api/machines') {
      let items = list;
      if (url.searchParams.get('includeRevoked') !== 'true') items = items.filter((m) => !m.revoked);
      if (url.searchParams.get('online') === 'true') items = items.filter((m) => m.online);
      if (url.searchParams.get('online') === 'false') items = items.filter((m) => !m.online);
      const name = url.searchParams.get('name');
      if (name) items = items.filter((m) => m.name.includes(name));
      return json(route, 200, page(items));
    }
    const machineMatch = /^\/v1\.0\/api\/machines\/([^/]+)(\/.*)?$/.exec(path);
    if (machineMatch) {
      const m = list.find((x) => x.id === decodeURIComponent(machineMatch[1]));
      if (!m) return json(route, 404, { error: 'NotFound' });
      if (machineMatch[2] === '/connections')
        return json(
          route,
          200,
          page([
            {
              id: 'mcn_1',
              machineId: m.id,
              remoteIp: '198.51.100.4',
              muxVersion: '2.0.0',
              connectedUtc: iso(-3600_000),
              closeCode: 4409,
              closeReason: 'replaced',
              bytesIn: 18233,
              bytesOut: 9921,
            },
          ]),
        );
      if (method === 'PUT') return json(route, 200, { ...m, name: (request.postDataJSON() as { name: string }).name });
      if (machineMatch[2] === '/revoke') return json(route, 200, { ...m, revoked: true, online: false });
      if (method === 'DELETE') return route.fulfill({ status: 204 });
      return json(route, 200, m);
    }
    if (path === '/v1.0/api/account') return json(route, 200, user);
    if (path === '/v1.0/api/account/sessions')
      return json(
        route,
        200,
        page([
          {
            id: 'ses_1',
            client: 'web',
            deviceName: 'Chrome on macOS',
            sourceIp: '203.0.113.7',
            userAgent: 'Mozilla/5.0',
            createdUtc: iso(-3600_000),
            lastUsedUtc: iso(-60_000),
            expiresUtc: iso(3600_000),
            current: true,
          },
          {
            id: 'ses_2',
            client: 'mobile',
            deviceName: 'iPhone',
            sourceIp: '203.0.113.9',
            createdUtc: iso(-86400_000),
            lastUsedUtc: iso(-7200_000),
            expiresUtc: iso(86400_000 * 20),
            current: false,
          },
        ]),
      );
    if (path === '/v1.0/api/billing/subscription') return json(route, 200, null);
    if (path === '/v1.0/api/billing/entitlements') return json(route, 200, entitlements);
    if (path === '/v1.0/api/billing/plans')
      return json(route, 200, [
        {
          id: 'pln_1',
          code: 'free',
          name: 'Free',
          priceCents: 0,
          currency: 'usd',
          interval: 'month',
          features: entitlements.features.map((f) => ({ key: f.key, limit: null })),
        },
      ]);
    if (path === '/v1.0/api/admin/stats')
      return json(route, 200, {
        users: 12,
        machines: 30,
        onlineMachines: 18,
        liveConnections: 18,
        relayStreams: 4,
        eventSubscribers: 7,
      });
    if (path === '/v1.0/api/admin/users')
      return json(
        route,
        200,
        page([
          user,
          { ...user, id: 'usr_2', email: 'grace@example.com', isAdmin: false, firstName: 'Grace', lastName: 'Hopper' },
        ]),
      );
    if (path === '/v1.0/api/admin/machines') return json(route, 200, page(list));
    if (path === '/v1.0/api/admin/plans')
      return json(route, 200, [
        {
          id: 'pln_1',
          code: 'free',
          name: 'Free',
          priceCents: 0,
          currency: 'usd',
          interval: 'month',
          active: true,
          public: true,
          features: [{ key: 'machines.max', limit: null }],
        },
      ]);
    if (path === '/v1.0/api/admin/audit')
      return json(
        route,
        200,
        page([
          {
            id: 'aud_1',
            eventType: 'auth.login',
            result: 'Success',
            userId: user.id,
            sourceIp: '203.0.113.7',
            createdUtc: iso(-120_000),
          },
        ]),
      );
    if (path === '/v1.0/api/admin/settings')
      return json(route, 200, {
        rest: { hostname: '0.0.0.0', port: 8800, ssl: false },
        database: { type: 'Postgresql', server: 'postgres', password: '(set)' },
        email: { provider: 'Mailgun', apiKey: '(not set)' },
        environmentOverrides: ['database.password'],
      });
    if (path === '/v1.0/api/request-history/summary') {
      const from = new Date(url.searchParams.get('fromUtc')!).getTime();
      const minutes = Number(url.searchParams.get('bucketMinutes'));
      const buckets = Array.from({ length: 30 }, (_, i) => ({
        bucketStartUtc: new Date(from + i * 3 * minutes * 60_000).toISOString(),
        bucketEndUtc: new Date(from + (i * 3 + 1) * minutes * 60_000).toISOString(),
        successCount: 5 + (i % 7) * 3,
        failureCount: i % 5 === 0 ? 2 : 0,
        averageDurationMs: 12 + i,
      }));
      return json(route, 200, {
        totalCount: 500,
        totalSuccess: 480,
        totalFailure: 20,
        averageDurationMs: 18.4,
        buckets,
      });
    }
    if (path === '/v1.0/api/request-history')
      return json(
        route,
        200,
        page([
          {
            id: 'req_1',
            method: 'GET',
            path: '/v1.0/api/machines',
            statusCode: 200,
            durationMs: 3.41,
            responseBytes: 812,
            userId: user.id,
            sourceIp: '203.0.113.7',
            isRelay: false,
            createdUtc: iso(-60_000),
          },
          {
            id: 'req_2',
            method: 'POST',
            path: '/m/mch_x/v1.0/api/chat/stream',
            pathTemplate: '/m/{machineId}/...',
            statusCode: 503,
            durationMs: 1.2,
            isRelay: true,
            userId: user.id,
            createdUtc: iso(-120_000),
          },
        ]),
      );
    if (path === '/v1.0/api/request-history/req_1')
      return json(route, 200, {
        id: 'req_1',
        method: 'GET',
        path: '/v1.0/api/machines',
        statusCode: 200,
        durationMs: 3.41,
        createdUtc: iso(-60_000),
        requestHeaders: { Accept: 'application/json' },
        responseHeaders: { 'Content-Type': 'application/json' },
        responseBody: '{"items":[]}',
        requestBody: '',
      });
    if (path === '/v1.0/api/health')
      return json(route, 200, { status: 'healthy', product: 'MuxCloud', version: '0.1.0-alpha', utc: iso(0) });
    return json(route, 404, { error: 'NotFound' });
  });

  await pw.route('**/openapi.json', (route) => json(route, 200, openapi));

  return {
    requests,
    emit: (event) => {
      for (const ws of sockets) ws.send(JSON.stringify({ timestampUtc: iso(0), ...event }));
    },
  };
}
