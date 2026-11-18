import { expect, test, type Browser, type BrowserContext, type FrameLocator, type Page } from '@playwright/test';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// End to end against REAL components: a running MuxCloud.Server, the scripted fake model (scripts/e2e/fake-llm.py),
// and real mux hubs started by this spec. scripts/e2e-real.sh builds and starts everything, then runs this file.
//
// Required environment (set by the script):
//   MUXCLOUD_E2E_BASE_URL   cloud URL, e.g. http://127.0.0.1:8760
//   MUXCLOUD_REAL_OUTBOX    File email provider directory
//   MUXCLOUD_REAL_MUX       path to the mux executable (Mux.Cli) built from Mux feature/v2.0.0
//   MUXCLOUD_REAL_WORKDIR   scratch directory for mux config dirs and project folders
//   MUXCLOUD_REAL_LLM_URL   fake model base URL, e.g. http://127.0.0.1:8790/v1
//   MUXCLOUD_REAL_ADMIN_EMAIL / MUXCLOUD_REAL_ADMIN_PASSWORD   server administrator, for request history
//   MUXCLOUD_REAL_HEARTBEAT_SECONDS   the server's Tunnel.HeartbeatSeconds (default 20)
const base = process.env.MUXCLOUD_E2E_BASE_URL ?? '';
const outbox = process.env.MUXCLOUD_REAL_OUTBOX ?? '';
const muxExe = process.env.MUXCLOUD_REAL_MUX ?? '';
const workdir = process.env.MUXCLOUD_REAL_WORKDIR ?? '';
const llmUrl = process.env.MUXCLOUD_REAL_LLM_URL ?? 'http://127.0.0.1:8790/v1';
const adminEmail = process.env.MUXCLOUD_REAL_ADMIN_EMAIL ?? '';
const adminPassword = process.env.MUXCLOUD_REAL_ADMIN_PASSWORD ?? '';
const heartbeat = Number(process.env.MUXCLOUD_REAL_HEARTBEAT_SECONDS ?? '20');
const enabled = !!(base && outbox && muxExe && workdir);

const email = 'owner-' + Date.now() + '@example.com';
const password = 'correct horse battery staple';

interface Hub {
  name: string;
  dir: string;
  project: string;
  port: number;
  proc: ChildProcess | null;
  log: string[];
  machineId: string;
}

function makeHub(name: string, port: number): Hub {
  const dir = join(workdir, name);
  const project = join(workdir, 'projects', name);
  mkdirSync(dir, { recursive: true });
  mkdirSync(project, { recursive: true });
  writeFileSync(
    join(dir, 'endpoints.json'),
    JSON.stringify({
      endpoints: [
        {
          name: 'fake',
          adapterType: 'openai-compatible',
          baseUrl: llmUrl,
          model: 'e2e-fake',
          isDefault: true,
          maxTokens: 1024,
          contextWindow: 32768,
          timeoutMs: 120000,
          autoApproveTools: false,
        },
      ],
    }),
  );
  return { name, dir, project, port, proc: null, log: [], machineId: '' };
}

function mux(hub: Hub, args: string[], input?: string): { code: number; out: string } {
  const r = spawnSync(muxExe, args, {
    cwd: hub.project,
    env: { ...process.env, MUX_CONFIG_DIR: hub.dir },
    input,
    encoding: 'utf8',
    timeout: 60_000,
  });
  return { code: r.status ?? -1, out: (r.stdout ?? '') + (r.stderr ?? '') };
}

interface MuxSettingsFile {
  maxAgentIterations?: number;
  rest: { hostname?: string; port?: number; apiKey?: string | null };
  cloud: { machineId?: string | null; machineSecret?: string | null };
  [key: string]: unknown;
}

function settings(hub: Hub): MuxSettingsFile {
  return JSON.parse(readFileSync(join(hub.dir, 'settings.json'), 'utf8')) as MuxSettingsFile;
}

function setRestPort(hub: Hub): void {
  const s = settings(hub);
  s.rest = { ...(s.rest ?? {}), hostname: '127.0.0.1', port: hub.port };
  writeFileSync(join(hub.dir, 'settings.json'), JSON.stringify(s, null, 2));
}

function login(hub: Hub): void {
  const r = mux(
    hub,
    ['cloud', 'login', '--email', email, '--password-stdin', '--server', base, '--name', hub.name],
    password + '\n',
  );
  expect(r.code, r.out).toBe(0);
  setRestPort(hub);
  hub.machineId = settings(hub).cloud.machineId ?? '';
  expect(hub.machineId).toMatch(/^mch_/);
}

function startHub(hub: Hub): void {
  hub.proc = spawn(muxExe, ['serve'], { cwd: hub.project, env: { ...process.env, MUX_CONFIG_DIR: hub.dir } });
  const push = (d: Buffer) => hub.log.push(d.toString());
  hub.proc.stdout?.on('data', push);
  hub.proc.stderr?.on('data', push);
}

function stopHub(hub: Hub, signal: NodeJS.Signals = 'SIGTERM'): void {
  if (hub.proc && hub.proc.exitCode === null) hub.proc.kill(signal);
  if (signal !== 'SIGSTOP') hub.proc = null;
}

function cloudStatus(hub: Hub): string {
  return mux(hub, ['cloud', 'status']).out;
}

async function machineRow(page: Page, name: string) {
  return page.getByRole('row').filter({ has: page.getByText(name, { exact: true }) });
}

// Waits for a run in the relayed mux dashboard to finish: the send button turns back into the arrow.
async function waitIdle(frame: FrameLocator): Promise<void> {
  await expect(frame.locator('#sendBtn')).toHaveText('➤', { timeout: 60_000 });
}

async function openView(frame: FrameLocator, view: string): Promise<void> {
  await frame.locator('.sidebar .nav-item[data-view="' + view + '"]').click();
}

async function newChat(frame: FrameLocator, folder?: string): Promise<void> {
  await openView(frame, 'chat');
  await frame.locator('#newChatBtn').click();
  if (folder !== undefined) await frame.locator('#cwdInput').fill(folder);
}

async function send(frame: FrameLocator, text: string): Promise<void> {
  await frame.locator('#composer').fill(text);
  await frame.locator('#sendBtn').click();
}

test.describe.configure({ mode: 'serial' });

test.describe('real mux through Mux Cloud', () => {
  test.skip(!enabled, 'run through scripts/e2e-real.sh');
  test.setTimeout(240_000);

  let browser: Browser;
  let context: BrowserContext;
  let page: Page;
  const hubA = makeHubLazy('machine-a', Number(process.env.MUXCLOUD_REAL_PORT_A ?? '8771'));
  const hubB = makeHubLazy('machine-b', Number(process.env.MUXCLOUD_REAL_PORT_B ?? '8772'));

  function makeHubLazy(name: string, port: number): Hub {
    return enabled ? makeHub(name, port) : { name, dir: '', project: '', port, proc: null, log: [], machineId: '' };
  }

  test.beforeAll(async ({ browser: b }) => {
    browser = b;
    context = await browser.newContext({ baseURL: base, viewport: { width: 1440, height: 900 } });
    page = await context.newPage();
  });

  test.afterAll(async () => {
    for (const hub of [hubA, hubB]) {
      if (hub.proc) {
        hub.proc.kill('SIGCONT');
        hub.proc.kill('SIGTERM');
      }
    }
    await context?.close();
  });

  test('sign up in the dashboard, verify by email, and sign in', async () => {
    await page.goto('/signup');
    await page.getByLabel('First name').fill('Owner');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByLabel('Confirm password').fill(password);
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();

    let token = '';
    await expect
      .poll(() => {
        const file = readdirSync(outbox).find((f) => f.endsWith('.txt') && f.includes(email));
        const match = file ? /verify\?token=([A-Za-z0-9_-]+)/.exec(readFileSync(join(outbox, file), 'utf8')) : null;
        token = match?.[1] ?? '';
        return token;
      })
      .not.toBe('');
    await page.goto('/verify?token=' + token);
    await expect(page.getByText('is verified')).toBeVisible();

    await page.goto('/login');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/machines$/);
    await expect(page.getByTestId('machines-first-run')).toBeVisible();
  });

  test('connecting mux shows the machine online live, and a stopped machine goes offline', async () => {
    login(hubA);
    startHub(hubA);
    // No reload: the account events socket must deliver machine.online.
    const rowA = await machineRow(page, 'machine-a');
    await expect(rowA).toBeVisible({ timeout: 30_000 });
    await expect(rowA.getByText('Online')).toBeVisible({ timeout: 30_000 });
    await expect.poll(() => cloudStatus(hubA), { timeout: 30_000 }).toContain('Mux Cloud : Connected');

    // Bearer clients: mobile login, ws-ticket, and the events socket see machine-b come online.
    const loginRes = await fetch(base + '/v1.0/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, client: 'mobile' }),
    });
    expect(loginRes.status).toBe(200);
    const bearer = ((await loginRes.json()) as { accessToken: string }).accessToken;
    const ticketRes = await fetch(base + '/v1.0/api/ws-tickets', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + bearer },
    });
    expect(ticketRes.status).toBe(201);
    const ticket = ((await ticketRes.json()) as { ticket: string }).ticket;
    const events: string[] = [];
    const ws = new WebSocket(base.replace(/^http/, 'ws') + '/v1.0/events?ticket=' + encodeURIComponent(ticket));
    ws.onmessage = (m) => events.push(String(m.data));
    await expect.poll(() => events.some((e) => e.includes('server.connected'))).toBe(true);

    login(hubB);
    startHub(hubB);
    await expect
      .poll(() => events.some((e) => e.includes('machine.online') && e.includes(hubB.machineId)), { timeout: 30_000 })
      .toBe(true);
    const rowB = await machineRow(page, 'machine-b');
    await expect(rowB.getByText('Online')).toBeVisible({ timeout: 30_000 });

    const list = await fetch(base + '/v1.0/api/machines', { headers: { Authorization: 'Bearer ' + bearer } });
    const items = ((await list.json()) as { items: { id: string; online: boolean }[] }).items;
    expect(items.map((m) => m.id).sort()).toEqual([hubA.machineId, hubB.machineId].sort());

    const relayed = await fetch(base + '/m/' + hubA.machineId + '/v1.0/api/sessions', {
      headers: { Authorization: 'Bearer ' + bearer },
    });
    expect(relayed.status).toBe(200);
    expect(await relayed.json()).toHaveProperty('Items');

    stopHub(hubB);
    await expect(rowB.getByText('Offline')).toBeVisible({ timeout: 30_000 });
    await expect
      .poll(() => events.some((e) => e.includes('machine.offline') && e.includes(hubB.machineId)), { timeout: 30_000 })
      .toBe(true);
    ws.close();

    await page.getByLabel('State').selectOption({ label: 'Offline' });
    await expect(await machineRow(page, 'machine-b')).toBeVisible();
    await expect(await machineRow(page, 'machine-a')).toHaveCount(0);
    await page.getByLabel('State').selectOption({ label: 'All' });
  });

  test('chat through the relay streams the reply as it is generated', async () => {
    await (await machineRow(page, 'machine-a')).getByText('machine-a', { exact: true }).click();
    await expect(page).toHaveURL(new RegExp('/machines/' + hubA.machineId));
    const frame = page.frameLocator('[data-testid="machine-frame"]');
    await expect(frame.locator('.sidebar .nav-item[data-view="chat"]')).toBeVisible({ timeout: 30_000 });

    await newChat(frame, hubA.project);
    await send(frame, 'Say hello');
    // Sample the transcript while the fake model streams ten chunks 150 ms apart.
    const lengths = new Set<number>();
    const started = Date.now();
    while (Date.now() - started < 10_000) {
      const text = (await frame.locator('#messages').innerText()) ?? '';
      const at = text.indexOf('Hello from');
      if (at >= 0) lengths.add(text.length);
      if (text.includes('ten small chunks.')) break;
      await page.waitForTimeout(60);
    }
    await expect(frame.locator('#messages')).toContainText('Hello from the fake model, streamed in ten small chunks.');
    expect(lengths.size, 'the reply should arrive in several pieces, not all at once').toBeGreaterThanOrEqual(3);
    await waitIdle(frame);
    await expect(frame.locator('#convoList .convo-item')).toHaveCount(1);
  });

  test('a tool call can be approved and denied remotely', async () => {
    const frame = page.frameLocator('[data-testid="machine-frame"]');
    await newChat(frame);
    await send(frame, 'E2E_TOOL approve this one');
    const dialog = frame.locator('dialog[open]');
    await expect(dialog).toBeVisible({ timeout: 30_000 });
    await dialog.getByRole('button', { name: 'Approve', exact: true }).click();
    await expect(frame.locator('#messages')).toContainText('Tool finished. TOOL_OUTPUT_SEEN', { timeout: 30_000 });
    await waitIdle(frame);

    await newChat(frame);
    await send(frame, 'E2E_TOOL deny this one');
    await expect(dialog).toBeVisible({ timeout: 30_000 });
    await dialog.getByRole('button', { name: 'Deny', exact: true }).click();
    await expect(frame.locator('#messages')).toContainText('Tool finished. TOOL_OUTPUT_MISSING', { timeout: 30_000 });
    await waitIdle(frame);
  });

  test('a running run can be cancelled remotely', async () => {
    const frame = page.frameLocator('[data-testid="machine-frame"]');
    await newChat(frame);
    await send(frame, 'E2E_SLOW count slowly');
    await expect(frame.locator('#messages')).toContainText('slow-2', { timeout: 30_000 });
    await frame.locator('#sendBtn').click();
    await waitIdle(frame);
    const text = await frame.locator('#messages').innerText();
    expect(text).not.toContain('slow-20');
  });

  test('conversations page lists the machine and its deep link opens the conversation', async () => {
    await page.goto('/conversations');
    const row = page.getByRole('row').filter({ hasText: 'Say hello' });
    await expect(row).toBeVisible({ timeout: 30_000 });
    await row.getByText('Say hello').first().click();
    await expect(page).toHaveURL(/\?session=/);
    const frame = page.frameLocator('[data-testid="machine-frame"]');
    await expect(frame.locator('#messages')).toContainText('Hello from the fake model', { timeout: 30_000 });
    await expect(frame.locator('#convoList .convo-item.active')).toContainText('Say hello');
  });

  test('rename and delete a conversation and edit a setting remotely', async () => {
    const frame = page.frameLocator('[data-testid="machine-frame"]');
    const item = frame.locator('#convoList .convo-item').filter({ hasText: 'Say hello' });
    page.once('dialog', (d) => d.accept('Renamed remotely'));
    await item.hover();
    await item.locator('.convo-menu').click();
    await frame.locator('.ctxmenu .ctxitem', { hasText: 'Rename' }).click();
    await expect(frame.locator('#convoList .convo-item').filter({ hasText: 'Renamed remotely' })).toBeVisible();

    const doomed = frame.locator('#convoList .convo-item').filter({ hasText: 'deny this one' });
    await doomed.hover();
    await doomed.locator('.convo-menu').click();
    await frame.locator('.ctxmenu .ctxitem', { hasText: 'Delete' }).click();
    await frame.locator('#modalFoot button', { hasText: 'Confirm' }).click();
    await expect(frame.locator('#convoList .convo-item').filter({ hasText: 'deny this one' })).toHaveCount(0);

    // Settings view: change a value and save. It must land in the machine's settings.json.
    await openView(frame, 'settings');
    // Wait for the form to load from the machine before editing, or the load overwrites the edit.
    await expect(frame.locator('#s_maxAgentIterations')).toHaveValue(String(settings(hubA).maxAgentIterations ?? 256));
    await frame.locator('#s_maxAgentIterations').fill('77');
    await frame.locator('#saveSettingsBtn').click();
    await expect.poll(() => settings(hubA).maxAgentIterations, { timeout: 15_000 }).toBe(77);
    // The machine stays signed in after a remote save.
    expect(settings(hubA).cloud.machineSecret).toMatch(/^mcs_/);
    // The relayed page never saw the local API key, and saving must not clear it or move the port.
    expect(settings(hubA).rest.apiKey).toMatch(/^mux_/);
    expect(settings(hubA).rest.port).toBe(hubA.port);
  });

  test('turning off remote tool approval denies tools for relayed runs', async () => {
    const r = mux(hubA, ['cloud', 'remote-approval', 'off']);
    expect(r.code, r.out).toBe(0);
    await page.goto('/machines/' + hubA.machineId);
    const frame = page.frameLocator('[data-testid="machine-frame"]');
    await expect(frame.locator('.sidebar .nav-item[data-view="chat"]')).toBeVisible({ timeout: 30_000 });
    await expect
      .poll(
        async () => {
          const res = await page.request.post('/m/' + hubA.machineId + '/v1.0/api/chat/approve', {
            headers: { Origin: base, 'Content-Type': 'application/json' },
            data: { RunId: 'run_none', ToolCallId: 'call_none', Decision: 'y' },
          });
          return res.status();
        },
        { timeout: 15_000 },
      )
      .toBe(403);

    await newChat(frame);
    await send(frame, 'E2E_TOOL should be refused');
    await expect(frame.locator('#messages')).toContainText('Tool finished. TOOL_OUTPUT_MISSING', { timeout: 30_000 });
    await expect(frame.locator('dialog[open]')).toHaveCount(0);
    await waitIdle(frame);
    expect(mux(hubA, ['cloud', 'remote-approval', 'on']).code).toBe(0);
  });

  test('a frozen machine is evicted by heartbeat, then reconnects and comes back online', async () => {
    await page.goto('/machines');
    const row = await machineRow(page, 'machine-a');
    await expect(row.getByText('Online')).toBeVisible();
    hubA.proc!.kill('SIGSTOP');
    // Three missed heartbeats, plus slack.
    await expect(row.getByText('Offline')).toBeVisible({ timeout: (heartbeat * 4 + 15) * 1000 });
    hubA.proc!.kill('SIGCONT');
    await expect(row.getByText(/Online|Needs approval/)).toBeVisible({ timeout: 90_000 });

    stopHub(hubA, 'SIGKILL');
    await expect(row.getByText('Offline')).toBeVisible({ timeout: 30_000 });
    startHub(hubA);
    await expect(row.getByText('Online')).toBeVisible({ timeout: 60_000 });
  });

  test('request history never records relay bodies', async () => {
    test.skip(!adminEmail || !adminPassword, 'set MUXCLOUD_REAL_ADMIN_EMAIL and MUXCLOUD_REAL_ADMIN_PASSWORD');
    const res = await fetch(base + '/v1.0/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: adminPassword, client: 'mobile' }),
    });
    const admin = ((await res.json()) as { accessToken: string }).accessToken;
    const list = await fetch(base + '/v1.0/api/request-history?pathContains=%2Fm%2F&pageSize=100', {
      headers: { Authorization: 'Bearer ' + admin },
    });
    expect(list.status).toBe(200);
    const items = ((await list.json()) as { items: { id: string; isRelay: boolean }[] }).items;
    const relays = items.filter((i) => i.isRelay);
    expect(relays.length).toBeGreaterThan(0);
    for (const entry of relays.slice(0, 20)) {
      const detail = (await (
        await fetch(base + '/v1.0/api/request-history/' + entry.id, { headers: { Authorization: 'Bearer ' + admin } })
      ).json()) as Record<string, unknown>;
      expect(detail.requestBody ?? '').toBe('');
      expect(detail.responseBody ?? '').toBe('');
      expect(JSON.stringify(detail.requestHeaders ?? {}).toLowerCase()).not.toContain('bearer ');
    }
  });

  test('signing out on the machine revokes it in the cloud and removes it from the list', async () => {
    await page.goto('/machines');
    const row = await machineRow(page, 'machine-b');
    await expect(row).toBeVisible();
    const r = mux(hubB, ['cloud', 'logout']);
    expect(r.code, r.out).toBe(0);
    expect(r.out).toContain('Signed this machine out of Mux Cloud.');
    expect(settings(hubB).cloud.machineSecret ?? null).toBeNull();
    // machine.updated arrives over the events socket; revoked machines are hidden unless "Show revoked" is on.
    await expect(row).toHaveCount(0, { timeout: 15_000 });
    await page.getByLabel('Show revoked').check();
    await expect((await machineRow(page, 'machine-b')).getByText('Revoked')).toBeVisible();
    await page.getByLabel('Show revoked').uncheck();
  });

  test('revoking a machine closes its tunnel and mux stops reconnecting', async () => {
    await page.goto('/machines');
    const row = await machineRow(page, 'machine-a');
    await row.getByRole('button', { name: 'More actions' }).click();
    await page.getByRole('menuitem', { name: 'Revoke' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Revoke' }).click();
    await expect(page.getByText('Machine revoked.')).toBeVisible();
    await expect.poll(() => cloudStatus(hubA), { timeout: 30_000 }).toContain('Revoked');
    const before = hubA.log.join('').length;
    await page.waitForTimeout(8_000);
    expect(cloudStatus(hubA)).toContain('Revoked');
    expect(hubA.log.join('').slice(before)).not.toMatch(/Connecting|Reconnecting/);
  });
});
