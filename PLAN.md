# Mux Cloud Plan

Status: approved direction, decisions recorded in section 9 (2026-11-17). Implementation has not started.

Production runs at `https://app.usemux.ai` (one environment, no staging). The marketing site at `https://usemux.ai` (`~/Websites/usemux.ai`) gains Log in and Sign up links to the app. Email goes out through Mailgun from `hello@latticetech.ai`. The operator is Lattice AI, LLC.

Mux Cloud lets a developer reach the mux agents running on their own machines from anywhere: a browser on another computer, or a phone or tablet. Each mux machine keeps one persistent outbound WebSocket to the cloud. The cloud authenticates the user, keeps a registry of their machines and whether each is online, and relays REST and WebSocket traffic from the cloud dashboard and the mobile app down that tunnel to the machine's local `mux serve` API. The cloud stores accounts, machines, and billing state. It does not store conversations. Those stay on the machine, and the cloud passes them through.

**Parity rule.** A user on Mux Cloud interacts with mux on a remote machine exactly as if they were sitting at that machine. Everything the local dashboard and API can do works remotely, with no reduced remote mode and no relay-only restrictions: conversations, tool approvals, settings, endpoints and provider keys, MCP servers, hooks, skills and skill packs, memory, worktrees, checkpoints, usage, and palettes. The only remote-specific control is the owner's `cloud.allowRemoteToolApproval` switch, and that switch is itself editable remotely like any other setting. The mobile app is measured against the same rule: a `parity.json` maps every mux dashboard feature to a mobile screen.

The work spans two repositories:

| Repository | Contents |
| --- | --- |
| `jchristn/MuxCloud` (this repo, `~/Code/MuxCloud`) | Cloud backend, cloud web dashboard, mobile app, tunnel protocol package, Docker deployment, docs |
| `jchristn/Mux` (`~/Code/Mux`, branch `feature/v2.0.0`) | Tunnel client, "connect to Mux Cloud" on every surface, dashboard base-path support, the API gaps the cloud needs |

All Mux work happens on `feature/v2.0.0` and is not merged to `main` until it has been tested and validated end to end against a running Mux Cloud.

Reference patterns: Armada Proxy (`~/Code/Armada`, tunnel and relay), Xeno (`~/Code/Xeno`, server layout, auth, onboarding, email), and the requirements in `~/Code/Agents/requirements`.

---

## 1. Architecture

```
  Browser (cloud dashboard)        Mobile app (iOS / Android)
            |  HTTPS + WSS (cookie)          |  HTTPS + WSS (bearer / ticket)
            v                                v
  +------------------------------------------------------------+
  |                     MuxCloud.Server                         |
  |  /v1.0/api/*        accounts, machines, billing, auth       |
  |  /v1.0/events       per-user live events (machine online)   |
  |  /m/{machineId}/*   relay to a machine (REST, SSE, WS)      |
  |  /v1.0/tunnel       machine tunnel endpoint                 |
  |  ConnectionRegistry (in memory)   Database (Postgres, etc)  |
  +------------------------------------------------------------+
            ^  one persistent outbound WSS per machine
            |
  +----------------------------+     +----------------------------+
  | Machine A: Mux.Agent       |     | Machine B: mux serve       |
  |  CloudTunnelClient         |     |  CloudTunnelClient         |
  |  -> 127.0.0.1:8710 MuxServer|    |  -> 127.0.0.1:8710 MuxServer|
  +----------------------------+     +----------------------------+
```

### 1.1 What the user sees

The cloud web dashboard is a React app with sign up, email verification, login, password reset, account pages, a machines list with online and offline state, and later billing. Selecting a machine opens that machine's own mux dashboard. The cloud requests the page from the machine through the tunnel and shows it inside the cloud shell, which keeps the machine switcher and account menu visible. Serving the machine's own page means the web view always matches the mux version installed on that machine, and the cloud never maintains a second copy of the mux UI.

The mobile app is an Expo / React Native app with a machine list (online or offline, last seen, mux version), a conversation list per machine with filters, a conversation view with streaming output, tool approvals, cancel, and the session management actions (rename, tag, label, delete, export), and "new conversation" with an endpoint, model, and working-directory picker. It talks to the same relay using the mux REST and WebSocket API.

### 1.2 Why a persistent WebSocket

The machine dials out, so it needs no inbound port, no port forwarding, and no dynamic DNS, and it works behind NAT and corporate firewalls. One long-lived connection carries many concurrent multiplexed streams. Online and offline state falls out of the connection itself: the machine is online while its tunnel is up and answering heartbeats.

---

## 2. Tunnel protocol (MuxCloud.Protocol)

The protocol is defined in `src/MuxCloud.Protocol`, a dependency-free library (System.Text.Json only) targeting `net8.0;net10.0`, published to NuGet so Mux consumes exactly the same contracts. It is documented in full in this repo's `WEBSOCKETS_API.md`.

### 2.1 Lessons from Armada.Proxy

Armada's proxy is a sound starting point, but it is a single-tenant operator relay. Five things change for a hosted multi-tenant service:

| Armada behavior | Mux Cloud design |
| --- | --- |
| Agent handles relayed requests one at a time. Its receive loop awaits each request, so one slow call stalls every other request, socket frame, and heartbeat on the tunnel. | Receive loop only parses and dispatches. Each stream runs on its own task with a bounded concurrency limit (default 32). Sends share one `SemaphoreSlim` send lock. |
| Responses are fully buffered and base64'd, capped at 8 MiB. SSE chat streaming cannot work. | Streamed responses: `http.response.start`, `http.response.chunk`, `http.response.end`. Request bodies are still capped (default 8 MiB). |
| Each browser WS frame is a request awaiting a 202, serialized per socket. | Relayed WebSockets are channels: `ws.open`, `ws.frame`, `ws.close` flow both directions without per-frame acks. |
| Reconnect race: when the old tunnel finally closes, its cleanup marks the instance offline, killing the newer session and its browser sockets. | Each connection has a `ConnectionId` generation. Cleanup only clears the registry entry if it still holds that same `ConnectionId`. A newer connection closes the older one with close code `4409 replaced`. |
| Shared password. Any client with it can claim any instance ID and take it over. All sessions see all instances. | Machines are enrolled to a tenant and user, and authenticate with a per-machine secret. A machine ID cannot be claimed by another account. Every lookup is tenant-scoped. |

Armada also keeps every relayed frame in an event buffer, never evicts stale instances, and leaves the agent's loopback request running after the proxy times out. Mux Cloud stores no relayed payloads, evicts on missed heartbeats, and propagates cancellation (`http.cancel`) to the machine.

### 2.2 Envelope

One JSON text frame per message. Body bytes travel base64-encoded in `data` fields of chunk messages. (A later protocol version may move bodies to binary frames. The version field allows that without breaking older machines.)

```json
{
  "type": "http.request",
  "streamId": "str_...",
  "timestampUtc": "2026-11-17T18:00:00.000Z",
  "payload": { }
}
```

| Type | Direction | Purpose |
| --- | --- | --- |
| `tunnel.hello` | machine to cloud | First frame. `machineId`, `protocolVersion`, `muxVersion`, `capabilities[]`, `timestampUtc`, `nonce`, `proof` |
| `tunnel.welcome` | cloud to machine | Accepted. `connectionId`, `heartbeatSeconds`, `maxRequestBodyBytes`, `maxConcurrentStreams`, `serverVersion`, `capabilities[]` |
| `tunnel.ping` / `tunnel.pong` | both | Heartbeat, either side may initiate. Pong echoes the ping's `nonce`. |
| `tunnel.goaway` | cloud to machine | Server draining (deploy). Machine reconnects after `retryAfterSeconds`. |
| `http.request` | cloud to machine | `method`, `path`, `query`, `headers`, `contentType`, `bodyBase64` (bounded) |
| `http.response.start` | machine to cloud | `statusCode`, `headers`, `contentType` |
| `http.response.chunk` | machine to cloud | `data` (base64). SSE bodies arrive as a sequence of these. |
| `http.response.end` | machine to cloud | Normal completion |
| `http.cancel` | cloud to machine | Browser disconnected or timed out. Machine aborts the loopback call. |
| `ws.open` | cloud to machine | `channelId`, `path`, `query`, `subprotocols` |
| `ws.opened` | machine to cloud | Loopback socket is open |
| `ws.frame` | both | `channelId`, `text` |
| `ws.close` | both | `channelId`, `code`, `reason` |
| `stream.error` | machine to cloud | `streamId` or `channelId`, `code`, `message` (policy denial, loopback failure, too large) |
| `machine.status` | machine to cloud | Optional status push (mux version change, display name change, active run count) so the machine list stays current without polling |

Correlation uses cloud-generated `streamId` and `channelId` values. The cloud keeps a `ConcurrentDictionary` of pending streams per connection. On tunnel loss it fails all of them and closes the relayed browser sockets with `1001`.

### 2.3 Handshake and machine credentials

1. **Enrollment** (once per machine, over HTTPS). The user enters email and password in any mux surface. Mux calls `POST /v1.0/api/machines/enroll` with those credentials plus `machineName`, `hostname`, `os`, `muxVersion`, and a stable `fingerprint` (SHA-256 of machine name and config directory, like Armada). The cloud verifies the password, checks the `machines.max` entitlement, and returns `machineId` and a one-time-shown `machineSecret` (`mcs_` plus 48 high-entropy characters). Mux stores those in `settings.json` under `cloud`. **The password is never stored on the machine.** Re-enrolling the same fingerprint for the same user reuses the machine record and rotates the secret.
2. **Handshake** (every connection). The first frame is `tunnel.hello` with `proof = hex(HMAC-SHA256(machineSecret, "mux-tunnel:" + machineId + ":" + timestampUtc + ":" + nonce))`. The cloud stores the secret AES-256-GCM encrypted (an HMAC proof needs the secret itself, so a one-way verifier cannot work), with a key derived from the signing key, and only its last four characters in clear. It checks the timestamp is within plus or minus 120 seconds, rejects replayed nonces for 5 minutes, and compares in constant time. A failed handshake counts toward a per-IP and per-machine lockout.
3. **Revocation.** Deleting a machine or revoking its credential in the dashboard closes the live tunnel with `4403 revoked`. The machine stops reconnecting and shows "Disconnected from Mux Cloud: credential revoked" with a prompt to sign in again.

Close codes: `4400` bad handshake, `4401` bad credential, `4403` revoked, `4409` replaced by a newer connection, `4426` protocol version unsupported, `4429` rate limited, `4503` server draining.

### 2.4 Heartbeat, stale detection, reconnect

- Both sides send `tunnel.ping` every `heartbeatSeconds` (default 20). Three missed pongs mean the connection is dead: the cloud evicts it and marks the machine offline, and the machine reconnects.
- The machine is shown "online" only after `tunnel.welcome`, not when the socket opens. (Armada marks itself connected before the handshake is accepted.)
- Reconnect uses exponential backoff with plus or minus 20% jitter: base 2 seconds, cap 60 seconds, reset after a successful welcome. `4401`, `4403`, and `4426` stop retrying and surface the reason to the user.
- `tunnel.goaway` lets the cloud drain for a deploy without a reconnect storm.

### 2.5 Machine-side forwarding and policy

The machine forwards relayed requests to its own loopback `MuxServer` (`127.0.0.1:{rest.port}`) with its own local API key. It strips every cloud header, adds `X-Mux-Relay: cloud`, and adds `X-Mux-Base-Path: /m/{machineId}`. **The cloud is only a relay.** It never adds, removes, or rewrites capabilities. A small `CloudRoutePolicy` in Mux applies the owner's one switch:

- Under the parity rule, the policy does not block or mask any route. A relayed request gets exactly the response a local request would, so secrets are masked remotely only where the local dashboard already masks them (for example the REST API key and the machine secret).
- Remote tool approval is **on by default** once a machine is connected. The owner turns it off with `cloud.allowRemoteToolApproval: false` from the settings file, any surface (local or remote), or `MUX_CLOUD_ALLOW_REMOTE_TOOL_APPROVAL=false`. When it is off, relayed runs deny any tool that would prompt, and local runs are unaffected.
- New conversations may use any working directory on the machine. The machine checks that the directory exists and returns 400 if not. Recent session directories are offered as suggestions.

### 2.6 Scale and hosting

Version 1 runs one `MuxCloud.Server` node. A machine's tunnel terminates on that node, and every relay request finds the machine in the in-memory `ConnectionRegistry`. The design leaves room for multiple nodes later: the `machine_connections` table records which node holds each tunnel, and a node that receives a relay request for a machine connected elsewhere forwards it node to node. That forwarding is out of scope for version 1, but nothing in the protocol or data model blocks it.

---

## 3. Browser and mobile access

### 3.1 Cloud authentication

Interactive login is email and password. It returns an opaque access token (60 minutes, AES-256 with a random IV per AUTHENTICATION.md) backed by an `authsessions` row, plus a rotating refresh token (30 days, stored hashed) for mobile.

- **Browser:** the access token lives in an `HttpOnly; Secure; SameSite=Strict` cookie, not localStorage, because the relayed mux dashboard is same-origin HTML the cloud does not author. The cookie also travels on WebSocket upgrades, which solves the "browsers cannot set upgrade headers" gap. State-changing relay requests and WS upgrades must carry an `Origin` that matches the cloud origin.
- **Mobile:** `Authorization: Bearer` for REST. For WebSockets, a single-use ticket from `POST /v1.0/api/ws-tickets` (30-second lifetime) passed as `?ticket=`. Tokens live in `expo-secure-store` (`AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`), with optional biometric unlock, following Armada.Mobile.

Signup, verification, and reset follow Xeno's onboarding flow:
- `POST /v1.0/api/auth/signup` creates the user inactive and emails a verification link.
- `POST /v1.0/api/auth/verify` activates the user.
- `POST /v1.0/api/auth/password/forgot` and `/reset` handle password reset.
- Auth routes are rate limited per IP and per email, with lockout.
- An optional captcha follows Xeno's `Onboarding.Captcha` pattern.

### 3.2 Relay routes

Everything under `/m/{machineId}/` is relayed after the prefix is stripped:

| Cloud path | Machine path |
| --- | --- |
| `GET /m/{machineId}/dashboard` | `GET /dashboard` (rendered with base path, no API key) |
| `ANY /m/{machineId}/v1.0/api/*` | `ANY /v1.0/api/*` (SSE streams through) |
| `WS /m/{machineId}/v1.0/ws` | `WS /v1.0/ws` |

Each relay request authenticates the cloud user, loads the machine by `(tenantId, machineId)` (returning 404 for another tenant's machine), checks the `web.access` or `mobile.access` entitlement, and checks that the machine is online (503 `machine_offline` if not). The cloud's request-history capture **excludes relay routes**, so no conversation content lands in the cloud database. Only method, path template, status, duration, and byte counts are recorded for relay traffic.

### 3.3 Live account events

`WS /v1.0/events` gives each signed-in client a per-user stream: `machine.online`, `machine.offline`, `machine.updated` (name, version, active runs), `machine.removed`, `subscription.updated`. The machine list on web and mobile updates without polling. Its structure is documented in `WEBSOCKETS_API.md` alongside the tunnel.

---

## 4. Billing readiness

Billing is not built in version 1, but the model is in place so it can be added without a migration rewrite. The code checks **entitlements**, never plan names, so "one subscription for everything" and "pay per feature, such as mobile" are both data changes, not code changes.

| Table | Purpose |
| --- | --- |
| `accounts` (`acct_`) | Billing owner. One per signup in version 1, sitting above the user's tenant per AUTHENTICATION.md. |
| `plans` (`pln_`) | Catalog: `code`, `name`, `priceCents`, `currency`, `interval`, `active`, `public` |
| `planfeatures` (`pfe_`) | `planId`, `featureKey`, `limitValue` (null means unlimited, 0 means disabled) |
| `subscriptions` (`sub_`) | `accountId`, `planId`, `status` (`Trialing`, `Active`, `PastDue`, `Canceled`, `Expired`), `provider`, `providerCustomerId`, `providerSubscriptionId`, `currentPeriodEndUtc`, `cancelAtPeriodEnd` |
| `entitlementoverrides` (`eno_`) | Admin grants (comps, betas) per account and feature |

Feature keys to start with: `web.access`, `mobile.access`, `machines.max`, `relay.concurrentStreams.max`. `IEntitlementService.GetEffectiveAsync(accountId)` merges active subscriptions and overrides, is cached per account, and is invalidated on change.

The payment side sits behind `IBillingProvider` (`CreateCheckoutAsync`, `CreatePortalSessionAsync`, `HandleWebhookAsync`). Version 1 ships `NullBillingProvider` and seeds a single `free` plan that enables everything, so nothing is gated during alpha. A Stripe provider is the expected later addition. The dashboard gets a "Plan and billing" page that shows the current plan and entitlements now and gains checkout and portal buttons later.

---

## 5. MuxCloud repository layout

```
MuxCloud/
  README.md  CHANGELOG.md  LICENSE.md  DOCKERHUB_README.md  PLAN.md
  REST_API.md  WEBSOCKETS_API.md  EMAIL.md  SECURITY.md  CLAUDE.md
  assets/            logos, icon.png, postman/MuxCloud.postman_collection.json, grafana/
  docker/            compose.yaml, server/, dashboard/, muxcloud.json, update.bat/.sh, factory/reset.bat/.sh
  .github/workflows/ tests.yml (3 OS + DB provider matrix), dashboard and mobile checks
  src/
    MuxCloud.sln
    MuxCloud.Protocol/   tunnel envelope and payload models, proofs, close codes (NuGet)
    MuxCloud.Core/       models, enums, settings, database (Sqlite, Postgresql, Mysql, SqlServer),
                         services (auth, machines, entitlements, billing, audit), IdGenerator, Constants
    MuxCloud.Email/      provider boundary (Disabled, File, Mailgun), templates (verify, reset, welcome, machine added)
    MuxCloud.Server/     Program, Bootstrapper, MuxCloudServer, Routes/* registrars, Relay/, Tunnel/, Events/
    MuxCloud.Dashboard/  React 19 + Vite + React Router 7 + i18next, TypeScript
    MuxCloud.Mobile/     Expo + React Native + expo-router, TypeScript, shares api/types/i18n with the dashboard
    Test.Shared/  Test.Automated/  Test.Xunit3/  Test.Nunit/
```

Conventions, taken from the requirements and from what worked in Xeno and Armada:

- **Code style:** CODE_STYLE.md throughout.
- **Watson 7.x:** use the current version (Mux and Xeno use 7.3.2). Each feature gets one route-registrar class, with `UseOpenApi` metadata on every route.
- **Handler code:** handlers live in per-feature handler or service classes, not in one giant server class. Xeno puts 11,500 lines of handlers on a partial `XenoServer`. MuxCloud does not repeat that.
- **Request pipeline:** an `ExecuteRouteAsync` wrapper maps exceptions to status codes and to the `{ "error": "<Code>", "message": "..." }` body. Authorization uses `RequestContext` and `RequirePermissionAsync`, as in Xeno.
- **Database:** hand-written SQL per engine. All four engines (`Sqlite`, `Postgresql`, `Mysql`, `SqlServer`). Ordered `SchemaMigration` with a `schema_migrations` table. SQLite is the dev default and Postgres runs in production.
- **IDs:** PrettyId k-sortable, with prefixes in `Constants.cs`: `ten_`, `usr_`, `crd_`, `ses_`, `acct_`, `mch_`, `mcn_`, `pln_`, `pfe_`, `sub_`, `eno_`, `evf_` (email verification), `pwr_` (password reset), `aud_`, `req_`, `str_` (stream), `chn_` (channel).
- **Routes:** a single versioned tree. `/v1.0/api/...` for REST, matching Mux. No duplicate `/api/v1` tree.
- **Settings:** settings file `muxcloud.json` with `MUXCLOUD_*` env overrides. Logging via SyslogLogging. Telemetry via Watson 7.1+ built-ins plus a `muxcloud_*` Meter and ActivitySource.
- **Tests:** Touchstone, with one shared suite run by `Test.Automated`, `Test.Xunit3`, and `Test.Nunit`. The provider matrix runs in CI against MySQL 8.4, Postgres 16, and SQL Server 2022. AOT is recorded as "Not supported" initially, with the reason in the README.
- **Docker:** `.yaml` files, curl healthchecks against `127.0.0.1` at `interval: 5s` and `retries: 2`, `depends_on` with `service_healthy`, and `update.bat` / `update.sh` plus a factory reset.
- **Versioning:** MuxCloud starts at `0.1.0-alpha`. Mux's version is not changed unless explicitly requested.

### 5.1 Core data model (beyond billing)

| Entity | Key fields |
| --- | --- |
| `Tenant` | `name`, `accountId`, `active`, `isprotected` |
| `User` | `tenantId`, `email` (unique across the service), `firstName`, `lastName`, `passwordHash`, `passwordAlgorithm`, `emailVerifiedUtc`, `isAdmin`, `isTenantAdmin`, `active` |
| `Credential` | API key pairs for programmatic access, per AUTHENTICATION.md. Deferred: 0.1.0 ships bearer access tokens and machine secrets only. |
| `AuthSession` | Access and refresh sessions, revocable, with `sourceIp`, `userAgent`, `expiresUtc`, `revokedUtc` |
| `Machine` | `tenantId`, `userId`, `name`, `hostname`, `os`, `fingerprint`, `muxVersion`, `protocolVersion`, `secretVerifier`, `secretLast4`, `lastSeenUtc`, `lastConnectedUtc`, `lastDisconnectedUtc`, `revokedUtc`, `active` |
| `MachineConnection` | Connection history: `machineId`, `connectionId`, `nodeId`, `remoteIp`, `connectedUtc`, `disconnectedUtc`, `closeCode`, `bytesIn`, `bytesOut` |
| `AuditRecord` | Logins, failures, enrollments, revocations, settings changes, entitlement changes |

Live online state comes from the `ConnectionRegistry` in memory. `lastSeenUtc` is persisted at most once a minute.

### 5.2 REST surface (summary; full detail goes in REST_API.md)

| Area | Routes |
| --- | --- |
| Health | `GET /v1.0/api/health` |
| Auth | `POST /v1.0/api/auth/signup`, `/verify`, `/verify/resend`, `/login`, `/refresh`, `/logout`, `/password/forgot`, `/password/reset`, `GET /v1.0/api/auth/me` |
| Account | `GET` and `PUT /v1.0/api/account` (profile), `POST /v1.0/api/account/password`, `GET` and `DELETE /v1.0/api/account/sessions[/{id}]`, `DELETE /v1.0/api/account` |
| Machines | `POST /v1.0/api/machines/enroll`, `GET /v1.0/api/machines` (filter: `online`, `name`), `GET`, `PUT` (rename), and `DELETE /v1.0/api/machines/{id}`, `POST /v1.0/api/machines/{id}/revoke`, `GET /v1.0/api/machines/{id}/connections` |
| Billing | `GET /v1.0/api/billing/plans`, `GET /v1.0/api/billing/subscription`, `GET /v1.0/api/billing/entitlements`, and later `POST /checkout`, `POST /portal`, `POST /webhooks/{provider}` |
| Tickets | `POST /v1.0/api/ws-tickets` |
| Admin | Users, accounts, plans, overrides, audit, request history, settings (system admin only) |
| Relay | `/m/{machineId}/...` (section 3.2) |
| WebSocket | `/v1.0/tunnel`, `/v1.0/events` (WEBSOCKETS_API.md) |

### 5.3 Cloud dashboard pages

| Route | Purpose |
| --- | --- |
| `/login`, `/signup`, `/verify`, `/forgot`, `/reset` | Public auth flow, with the language selector |
| `/machines` | Machine list: online and offline, last seen, mux version, active runs, filter and search. "Add a machine" shows the steps for each mux surface. |
| `/machines/{id}` | Cloud shell plus that machine's relayed mux dashboard in a same-origin frame, with a machine switcher in the top bar |
| `/conversations` | Optional cross-machine view: conversations from every online machine, filterable by machine (fans out `GET /sessions` per machine) |
| `/account` | Profile, password, active sessions (revoke), delete account |
| `/account/billing` | Plan and entitlements now, checkout and portal later |
| `/admin/*` | System admin only: users, plans, overrides, audit, request history, server settings |

The shell, tables, modals, theming, and i18n follow FRONTEND_ARCHITECTURE.md and DASHBOARD_STYLE_AND_USABILITY.md (route inventory first, Playwright visual QA at 1280, 768, and 390 px in both themes). I am using TypeScript rather than plain `.jsx` because the API client and models are shared with the mobile app, which is how Armada.Dashboard and Armada.Mobile work.

### 5.4 Mobile app

Expo plus React Native plus expo-router, structured after Armada.Mobile:

- **Screens:** sign in, sign up, machines (tab), machine detail with conversations, conversation, new conversation, approvals inbox, account, settings.
- **Shared code:** `sharing.config.js` and Metro aliases reuse the dashboard's `api/`, `types/`, and `i18n/` modules. A `parity.json` maps every relevant machine and conversation feature to a mobile screen.
- **Conversation transport:** `POST /m/{id}/v1.0/api/chat/stream` (SSE through the relay) to send and stream, and `WS /m/{id}/v1.0/ws` subscribed by session to watch runs started elsewhere.
- **Push notifications** (Expo Push) for "tool approval waiting" and "run finished" on machines the user is watching. The machine emits these as `machine.status` events and the cloud fans them out. Payloads carry no conversation content.
- **Layouts** for phones and tablets: split view on tablets, with the machine and conversation list beside the conversation.

---

### 5.5 Email

`MuxCloud.Email` copies the provider and sender setup from Xeno and BjjWithJoel (TrellisKit), which already send through Mailgun from `latticetech.ai`:

- **Providers:**
  - `Disabled`.
  - `File`: writes rendered messages to a folder, for development and tests.
  - `Mailgun`: SendWithMailgun 1.2.1, `MailgunSender.SendAsync(to, from, subject, body, isHtml, token)`, sending domain `latticetech.ai`, base URL configurable for the US or EU region.
  - The API key comes from `MUXCLOUD_MAILGUN_API_KEY`, never from the checked-in settings.
  - SendWithMailgun sends one body format per message, so HTML is sent. The plain-text rendering is kept for the File provider and tests.
- **Sender:** `"Mux Cloud" <hello@latticetech.ai>`. The support contact in every footer and in the legal pages is `hello@latticetech.ai`.
- **Layout:** follows TrellisKit's `StandardEmailLayout`, built with HtmlPageBuilder 1.2.0.
  - A complete, inline-styled HTML document: a preheader, then a card at most 600 px wide that is fluid down to 360 px.
  - Inside the card: the Mux logo (an absolute URL to the repo's `assets/`), an H1 heading, then content blocks.
  - Footer below a rule: brand name, a "Questions?" support line, and privacy and terms links.
  - `color-scheme` meta and a `prefers-color-scheme` dark style.
  - A matching plain-text version.
  - Every value is HTML-encoded.
- **Blocks:** paragraph, button with an "If the button does not work, copy this link" fallback, callout (info, success, warning, danger), key/value fields table, code, list, divider.
- **Templates:** one class per template, each with a key, subject, preheader, heading, and blocks, plus sample values for a preview route and tests.
  - verify email, password reset, password changed, welcome
  - new machine enrolled (security notice: name, OS, IP, time, and "not you? revoke it" link)
  - machine revoked, account deleted
  - admin test message

### 5.6 Website and legal pages

`~/Websites/usemux.ai` (repo `jchristn/usemux.ai`) gets Log in and Sign up links in the nav and the hero, pointing to `https://app.usemux.ai/login` and `/signup`. Those links ship in phase 4, once the app is live, so the site never points at a page that does not exist.

Signup requires accepting Terms of Service and a Privacy Policy for Lattice AI, LLC, with the acceptance version recorded on the user. I will draft them modeled on `~/Code/BjjWithJoel/bjjwithjoel/legal/` (terms, privacy, account deletion), with placeholders such as the mailing address marked for you to fill in. They are served from the dashboard at `/legal/terms`, `/legal/privacy`, and `/legal/account-deletion`, which the app stores also require.

## 6. Mux changes (branch `feature/v2.0.0`)

The engineering review of Mux found several gaps the cloud depends on. They are listed first because the cloud cannot work without them.

1. **Approval requests are missing from the WebSocket.** Today an approval prompt only goes out on the SSE response of `/chat/stream`. A WebSocket subscriber sees `tool_call_proposed` and nothing else, while `docs/REST_API.md` claims an `approval_required` event exists. Fix: emit an `approval_requested` frame into the `RunHandle` ring (so `subscribe` replays it), and an `approval_resolved` frame. Make the WS `approve` action honor `runId` rather than "most recently attached run".
2. **The always-on hub is read-only.** `Mux.Agent` and Desktop's embedded server host `MuxServer` with `allowInteractiveTools: false`, so any tool that would prompt is denied. When the machine is connected to the cloud and `cloud.allowRemoteToolApproval` is true (the default), the hub hosts with interactive approvals on, so writes prompt the remote user instead of failing.
3. **The dashboard HTML embeds the local API key** (`var API_KEY="__MUX_API_KEY__"`) and uses absolute `/v1.0/...` paths. Fix: add a `__MUX_BASE_PATH__` placeholder and a `BASE` variable. Prefix inside the single `api()` helper, the one direct `fetch("/v1.0/api/chat/stream")`, and the three WebSocket URL builders (factored into one `wsUrl()`). When the request carries `X-Mux-Relay: cloud`, render an empty API key and use `X-Mux-Base-Path`. That is roughly six edits in `DashboardTemplate.cs` plus `DashboardPage.Render`.
4. **New conversations have no working-directory choice.** The dashboard never sends `WorkingDirectory`, so web chats run in the hub process's current directory. Fix:
   - Add `GET /v1.0/api/workspaces`, returning the working directories of recent sessions (most recent first) plus the user's home directory, as suggestions. Any existing directory is accepted.
   - Expose `WorkingDirectory` on `SessionSummary` and `SessionDetailDto`.
   - Add a directory picker to the dashboard's new-chat flow, which the mobile app and VS Code can share.
5. **Settings persistence.** `LoadSettings` rewrites `settings.json` on every load. The new `cloud` block must be copied in `NormalizeSettingsForPersistence` or it is silently deleted, and it needs a test in the settings suites.

Then the feature itself:

6. **`CloudSettings`** (`settings.json` `cloud` block), with `MUX_CLOUD_*` env overrides:
   - Connection and identity: `enabled`, `serverUrl`, `machineId`, `machineName`, `machineSecret`.
   - Remote permissions: `allowRemoteToolApproval` (default true).
   - The default `serverUrl` is `https://app.usemux.ai`, overridable for self-hosting.
   - Timing: `heartbeatSeconds`, `reconnectMaxDelaySeconds`, `allowInvalidCertificates`.
7. **`Mux.Core/Cloud/`**:
   - `CloudEnrollmentClient`: email and password in, machine credential out, password discarded.
   - `CloudTunnelClient`: persistent WSS, handshake, heartbeat, reconnect, multiplexed dispatch.
   - `CloudRelayForwarder`: streams to the loopback `MuxServer` with cancellation.
   - `CloudRoutePolicy`.
   - `CloudStatus`: the state surfaced to every UI.
8. **Hosting the tunnel.** Whichever process owns the hub port runs the tunnel. That is normally `Mux.Agent`, or `mux serve` when it is the hub. A lock file in the config directory guarantees one tunnel per machine. The agent watches the `cloud` settings block so connecting from any surface takes effect without restarting the agent.
9. **Connect UI on every surface:**
   - CLI: `mux cloud login`, `mux cloud logout`, `mux cloud status`.
   - TUI: a `/cloud` slash command and a "Mux Cloud" section in the settings modal.
   - Desktop: a Mux Cloud window (sign in, status, disconnect) next to Local Server.
   - Local dashboard: a Mux Cloud panel in Settings.
   - VS Code: `Mux: Connect to Mux Cloud`, plus status in the status bar.
   - Tray agent: a menu item showing state and offering Connect or Disconnect.
   - Every surface shows the same states: Disabled, Connecting, Connected, Reconnecting (with the reason), Signed out, Revoked.
10. **Docs:**
    - New `WEBSOCKETS_API.md` at the Mux repo root, documenting `/v1.0/ws` fully: connect, auth, every `eventType`, every client `action`, replay semantics, approval frames. Today that material is a short section of `docs/REST_API.md`.
    - A "Mux Cloud tunnel (client side)" section in `WEBSOCKETS_API.md` that links to this repo's protocol reference.
    - Updates to `docs/REST_API.md` (workspaces, session working directory, relay headers), `docs/CONFIG.md` (the `cloud` block), `README.md`, and `CHANGELOG.md`.
11. **Tests:**
    - Tunnel client against an in-process fake cloud: handshake, heartbeat loss, reconnect, replacement, revocation, concurrent streams, SSE pass-through, WS channels, cancellation.
    - Route policy.
    - Base-path rendering.
    - Settings round-trip.
    - Approval frames on the WebSocket.

---

## 7. Security model

The cloud relays a remote-control channel into a developer's machine, so the threat model is explicit:

- Under the parity rule, an authenticated remote user has the same power as a local user, so the account credential is effectively a key to the machine. That makes account security the main control:
  - email verification
  - strong password hashing
  - rate limits and lockout
  - session listing and revocation
  - per-machine revocation
  - an emailed notice whenever a new machine is enrolled
  - MFA, as the first post-version-1 item

  Every connect screen states that the account can operate the machine remotely, including approving tools, and shows how to switch remote tool approval off.
- The machine still enforces the one owner switch (`allowRemoteToolApproval`). The cloud authenticates and relays, and never adds or removes capabilities on its own.
- The cloud operator can see relayed traffic in memory while it passes through, though it is not stored. The README and the connect screens say so plainly. End-to-end encryption between the client and the machine is a possible later protocol version, not version 1.
- **Credentials:**
  - Passwords are hashed with PBKDF2-SHA256, 600,000 iterations, per-user salt.
  - Machine secrets are stored AES-256-GCM encrypted, never in clear.
  - Refresh tokens are stored hashed.
  - Every secret comparison is constant time.
- **Rate limits:** auth, enrollment, and tunnel handshakes are rate limited per IP and per account. Failed handshakes share the lockout.
- **Browser:** HttpOnly cookies, `SameSite=Strict`, Origin checks on writes and WS upgrades, CSP `frame-ancestors 'self'` on relayed dashboard pages, and no tokens in localStorage.
- **Audit:** logins, failures, enrollments, revocations, entitlement changes, and admin actions.
- **Data minimization:** relay request history stores no bodies, and push notifications carry no content.

---

## 8. Phases and exit criteria

| Phase | Work | Exit criteria |
| --- | --- | --- |
| 0. Foundations | MuxCloud repo skeleton, CLAUDE.md, solution, CI, Docker, `MuxCloud.Protocol` with contracts and proof helpers, WEBSOCKETS_API.md (tunnel and events) drafted | Builds on 3 OS, protocol unit tests pass |
| 1. Mux groundwork (`feature/v2.0.0`) | Gaps 1 to 5 in section 6, Mux `WEBSOCKETS_API.md` | Existing Mux test suite green, new frames and base path covered by tests |
| 2. Cloud backend | Auth, signup, verification, reset, email, machines, enrollment, tunnel endpoint, connection registry, relay (REST, SSE, WS), events WS, entitlements with the free plan, audit, request history, REST_API.md, Postman | Provider matrix green, end-to-end test with a fake machine passes |
| 3. Mux tunnel client | Section 6 items 6 to 9, CLI first, then TUI, Desktop, dashboard, VS Code, tray | A real mux on `feature/v2.0.0` connects to a local MuxCloud in Docker. Conversations list, stream, approve, cancel, and start through the relay. |
| 4. Cloud dashboard | Auth pages, machines, relayed machine view, cross-machine conversations, account, billing page, admin, legal pages, i18n, Playwright QA, Log in and Sign up links on usemux.ai | Simulated user test report with no S1 or S2 findings open |
| 5. Mobile app | Machines, conversations, chat, approvals, new conversation, push, tablet layouts | Runs on iOS and Android simulators and devices against the Docker stack, parity check passes |
| 6. Validation | Simulated user testing across all surfaces, benchmark harness for relay throughput and latency, security review, docs pass | Your sign-off, then merge `feature/v2.0.0` into Mux `main` |

Phases 1 and 2 can run in parallel once phase 0 fixes the protocol contracts.

---

## 9. Decisions

Resolved with you on 2026-11-17:

1. **Identity model.** Each signup gets a personal tenant and account. Email is unique across the whole service, and login is email and password only, with no tenant ID. Team sharing of machines comes later as tenant membership. This is a recorded departure from AUTHENTICATION.md, which makes email unique per tenant and uses `x-tenant-guid` at login.
2. **Password hashing.** PBKDF2-SHA256, 600,000 iterations, per-user salt, with `passwordAlgorithm` stored so the cost can be raised later. This is a recorded departure from the plain SHA-256 in AUTHENTICATION.md.
3. **Remote tool approval.** On by default when a machine is connected. The owner disables it with `cloud.allowRemoteToolApproval: false`.
4. **Working directories.** Remote users may start conversations in any existing directory. Recent session directories are offered as suggestions.
5. **Mobile distribution.** App Store and Google Play, as an approved exception to the INSTALLERS.md no-paid-certificate policy. Alpha ships through TestFlight and Play internal testing, then public listings.

Defaults I will use unless you say otherwise:

6. **Protocol package location.** `MuxCloud.Protocol` lives here and is published to NuGet, and Mux consumes the package. For local development, an MSBuild property switches Mux to a `ProjectReference` at `../MuxCloud`.
7. **Hosting.** `https://app.usemux.ai` serves the dashboard, REST API, relay, tunnel, and events on one origin. There is no staging environment. It runs on a single node for version 1, with Postgres in production, behind a TLS-terminating reverse proxy that supports WebSocket upgrades. Still open, needed before deployment but not before building: the hosting provider.
8. **Email.** Mailgun through SendWithMailgun from `hello@latticetech.ai` (sending domain `latticetech.ai`), as in Xeno and BjjWithJoel. The File provider is used for development.
9. **MFA.** TOTP comes after version 1.
10. **Mux version.** The branch name suggests 2.0.0. Per VERSIONING.md I will not change Mux's version number until you explicitly ask.
11. **Cross-machine conversation view** on the web dashboard. In version 1. It costs one fan-out per online machine.
12. **Parity.** Full parity with no exceptions. Remote users can do everything a local user can, including editing the machine's `cloud` block.
13. **Domain.** `app.usemux.ai` for the app. `usemux.ai` stays the marketing site and links to the app.
14. **Git.** Commit and push at each milestone: MuxCloud on `main`, Mux on `feature/v2.0.0`.
15. **Legal.** Terms and privacy for Lattice AI, LLC, drafted from the BjjWithJoel legal pages, with placeholders for you to fill in.
