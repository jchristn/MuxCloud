# Mux Cloud REST API

This is the reference for every REST route Mux Cloud serves. The WebSocket surfaces (`/v1.0/tunnel`, `/v1.0/events`, and relayed machine sockets) are in [WEBSOCKETS_API.md](WEBSOCKETS_API.md).

## Conventions

| Topic | Rule |
| --- | --- |
| Base URL | `https://app.usemux.ai`. A local server defaults to `http://127.0.0.1:8800`. |
| Versioning | Every REST route is under `/v1.0/api/`. There is no second route tree. |
| Format | JSON request and response bodies, `Content-Type: application/json`, camelCase names, UTC ISO 8601 timestamps. Null properties are omitted. |
| IDs | PrettyId k-sortable strings with a type prefix: `usr_`, `ten_`, `acct_`, `ses_`, `mch_`, `mcn_`, `pln_`, `sub_`, `eno_`, `aud_`, `req_`. |
| Errors | `{ "error": "<Code>", "message": "<human readable>" }`. `error` is a stable code clients can localize. |
| Paging | List routes take `pageNumber` (1-based, default 1) and `pageSize` (default 25, minimum 1, maximum 1000) and return `{ "items": [...], "pageNumber": 1, "pageSize": 25, "totalCount": 248 }`. |
| OpenAPI | `GET /openapi.json` (document) and `GET /swagger` (browser UI). |

### Status codes

| Status | Meaning |
| --- | --- |
| 200 | OK |
| 201 | Created |
| 202 | Accepted (the request was queued, or a privacy-preserving answer that reveals nothing, for example "if that email exists, we sent a link") |
| 204 | No content |
| 400 | `BadRequest`: validation failed. `message` names the field. |
| 401 | `Unauthorized`, `InvalidCredentials`, or `InvalidToken` |
| 402 | `EntitlementExceeded`: the account's plan does not allow this (for example `machines.max`) |
| 403 | `Forbidden`, `EmailNotVerified`, `OriginNotAllowed`, or `AccountDisabled` |
| 404 | `NotFound`. Resources in another account are also reported as `NotFound`, never as `Forbidden`. |
| 409 | `Conflict` or `EmailInUse` |
| 413 | `BodyTooLarge` (relay) |
| 429 | `TooManyAttempts`, with a `Retry-After` header in seconds |
| 501 | `NotImplemented` (billing checkout and portal while no billing provider is configured) |
| 503 | `MachineOffline` or `TooManyStreams` (relay) |
| 504 | `Timeout` (relay) |
| 500 | `InternalServerError` |

## Authentication

Mux Cloud accepts exactly one of these per request:

| Carrier | Used by | Details |
| --- | --- | --- |
| `muxcloud_session` cookie | Browser (cloud dashboard, relayed machine dashboard) | Set by `POST /v1.0/api/auth/login` with `"client": "web"`. `HttpOnly; SameSite=Strict; Path=/`, plus `Secure` when served over HTTPS. Holds the access token (60 minutes). |
| `muxcloud_refresh` cookie | Browser | Set alongside the session cookie. `HttpOnly; SameSite=Strict; Path=/v1.0/api/auth`, plus `Secure` over HTTPS. Holds the refresh token (30 days). Only sent to the auth routes. |
| `Authorization: Bearer <accessToken>` | Mobile app, scripts | Tokens are returned in the login body when `"client": "mobile"`. |

**Cookie requests that change state** (any method other than GET, HEAD, and OPTIONS) must carry an `Origin` header equal to the server's public origin (`https://app.usemux.ai` in production, `Server.PublicUrl` in settings). Otherwise the server returns `403 OriginNotAllowed`. Bearer requests are not Origin-checked.

Access tokens are opaque (AES-256 encrypted with a random IV, backed by a server-side session row) and revocable. Refresh tokens rotate on every use. A refresh token that has already been used revokes its whole session.

Auth routes are rate limited per IP and per email. Ten failed logins for one email within 15 minutes lock that email for 15 minutes (`429 TooManyAttempts` with `Retry-After`).

---

## Health

### `GET /v1.0/api/health`

Anonymous.

```json
200
{ "status": "healthy", "product": "MuxCloud", "version": "0.1.0-alpha", "utc": "2026-11-17T18:00:00.0000000Z" }
```

---

## Auth

### `POST /v1.0/api/auth/signup`

Anonymous. Creates a user with a personal tenant and account. The user is inactive until the email is verified. A verification email is sent.

Request:

```json
{
  "email": "ada@example.com",
  "password": "correct horse battery staple",
  "firstName": "Ada",
  "lastName": "Lovelace",
  "acceptTerms": true
}
```

| Field | Rules |
| --- | --- |
| `email` | Required, valid address, at most 254 characters. Unique across the service, compared case-insensitively. |
| `password` | Required, 10 to 256 characters |
| `firstName`, `lastName` | Optional, at most 100 characters each |
| `acceptTerms` | Must be `true`. The accepted terms version is recorded on the user. |

Responses:

```json
201
{ "userId": "usr_01JD...", "email": "ada@example.com", "status": "pending_verification" }
```

`400 BadRequest`, `409 EmailInUse`, `429 TooManyAttempts`.

### `POST /v1.0/api/auth/verify`

Anonymous. Confirms an email address with the token from the verification email. Tokens are single use and expire after 48 hours.

```json
{ "token": "evf_..." }
```

```json
200
{ "verified": true, "email": "ada@example.com" }
```

`400 InvalidToken`.

### `POST /v1.0/api/auth/verify/resend`

Anonymous. Sends a new verification email if the address belongs to an unverified user. It always answers the same way, so it reveals nothing.

```json
{ "email": "ada@example.com" }
```

`202 { "accepted": true }`. `429 TooManyAttempts`.

### `POST /v1.0/api/auth/login`

Anonymous.

```json
{ "email": "ada@example.com", "password": "...", "client": "web", "deviceName": "Firefox on Linux" }
```

| Field | Rules |
| --- | --- |
| `client` | `web` (default) sets the cookies and omits tokens from the body. `mobile` returns tokens in the body and sets no cookies. |
| `deviceName` | Optional label shown in the session list, at most 100 characters |

Response (`client: "mobile"`):

```json
200
{
  "sessionId": "ses_01JD...",
  "user": {
    "id": "usr_01JD...",
    "email": "ada@example.com",
    "firstName": "Ada",
    "lastName": "Lovelace",
    "emailVerified": true,
    "isAdmin": false,
    "tenantId": "ten_01JD...",
    "accountId": "acct_01JD...",
    "createdUtc": "2026-11-17T18:00:00.0000000Z"
  },
  "accessToken": "mca_...",
  "accessTokenExpiresUtc": "2026-11-17T19:00:00.0000000Z",
  "refreshToken": "mcr_...",
  "refreshTokenExpiresUtc": "2026-12-17T18:00:00.0000000Z"
}
```

For `client: "web"`, `accessToken` and `refreshToken` are omitted and the two cookies are set.

`400 BadRequest`, `401 InvalidCredentials`, `403 EmailNotVerified`, `403 AccountDisabled`, `429 TooManyAttempts`.

### `POST /v1.0/api/auth/refresh`

Anonymous route. Authenticates with a refresh token taken from the body (`{ "refreshToken": "mcr_..." }`) or from the `muxcloud_refresh` cookie. Returns the login response shape with new tokens (or new cookies), and invalidates the old refresh token.

`401 InvalidToken`.

### `POST /v1.0/api/auth/logout`

Authenticated. Revokes the current session and clears the cookies.

`204`.

### `POST /v1.0/api/auth/password/forgot`

Anonymous. Emails a reset link (valid for 1 hour) if the address belongs to a user. It always answers the same way.

```json
{ "email": "ada@example.com" }
```

`202 { "accepted": true }`.

### `POST /v1.0/api/auth/password/reset`

Anonymous.

```json
{ "token": "pwr_...", "password": "new password" }
```

`200 { "reset": true }`. Every session for the user is revoked and a "password changed" email is sent. `400 InvalidToken`, `400 BadRequest`.

### `GET /v1.0/api/auth/me`

Authenticated. Returns the current user, session, and entitlements.

```json
200
{
  "user": { "id": "usr_...", "email": "ada@example.com", "firstName": "Ada", "lastName": "Lovelace", "emailVerified": true, "isAdmin": false, "tenantId": "ten_...", "accountId": "acct_...", "createdUtc": "..." },
  "sessionId": "ses_...",
  "entitlements": { "accountId": "acct_...", "planCode": "free", "features": [ { "key": "web.access", "enabled": true, "limit": null } ] }
}
```

---

## Account

All routes are authenticated and act on the current user.

| Route | Request | Response |
| --- | --- | --- |
| `GET /v1.0/api/account` | none | `200` user object |
| `PUT /v1.0/api/account` | `{ "firstName": "Ada", "lastName": "Lovelace" }` | `200` user object |
| `POST /v1.0/api/account/password` | `{ "currentPassword": "...", "newPassword": "..." }` | `204`. Revokes every other session and sends a "password changed" email. `401 InvalidCredentials` if the current password is wrong. |
| `GET /v1.0/api/account/sessions` | paging | `200` page of session objects |
| `DELETE /v1.0/api/account/sessions/{id}` | none | `204` |
| `DELETE /v1.0/api/account` | `{ "password": "..." }` | `204`. Deletes the account, revokes every machine and closes its tunnel, deletes the user's data, and sends an "account deleted" email. |

Session object:

```json
{
  "id": "ses_...",
  "client": "web",
  "deviceName": "Firefox on Linux",
  "sourceIp": "203.0.113.7",
  "userAgent": "Mozilla/5.0 ...",
  "createdUtc": "...",
  "lastUsedUtc": "...",
  "expiresUtc": "...",
  "current": true
}
```

---

## Machines

### `POST /v1.0/api/machines/enroll`

Anonymous route. The user's credentials go in the body. Mux calls this once per machine from "Connect to Mux Cloud" and stores the result in `settings.json` under `cloud`. It never stores the password.

Request:

```json
{
  "email": "ada@example.com",
  "password": "...",
  "machineName": "studio-mac",
  "hostname": "studio.local",
  "os": "macOS 26.0 arm64",
  "muxVersion": "2.0.0",
  "fingerprint": "3b9f0c...64 hex"
}
```

| Field | Rules |
| --- | --- |
| `email`, `password` | Required. The same credentials as login. |
| `machineName` | Required, 1 to 100 characters |
| `hostname`, `os`, `muxVersion` | Optional, at most 200 characters each |
| `fingerprint` | Required, 16 to 128 characters. A stable per-installation value, such as SHA-256 of the machine name and mux config directory. If the same user enrolls the same fingerprint again, the existing machine is kept and its secret is rotated. |

Response:

```json
201
{
  "machineId": "mch_01JD...",
  "machineSecret": "mcs_9tQe...48 characters",
  "machineName": "studio-mac"
}
```

`machineSecret` is returned only here, only once. The tunnel handshake proves possession of it (see `WEBSOCKETS_API.md`). A "new machine connected" security email goes to the user, unless the call re-enrolled an existing fingerprint.

Errors:

| Status | Code | When |
| --- | --- | --- |
| 400 | `BadRequest` | Missing or invalid fields |
| 401 | `InvalidCredentials` | Wrong email or password |
| 403 | `EmailNotVerified` | The email address is not verified yet |
| 403 | `AccountDisabled` | The user is disabled |
| 402 | `EntitlementExceeded` | A new machine would exceed `machines.max` for the plan. Re-enrolling an existing fingerprint is always allowed. |
| 429 | `TooManyAttempts` | Lockout, shared with login |

### `GET /v1.0/api/machines`

Authenticated. Returns the current user's machines, most recently seen first.

| Query | Description |
| --- | --- |
| `online` | `true` or `false` to filter by state |
| `name` | Case-insensitive substring filter on the name or host name |
| `includeRevoked` | `true` to include revoked machines (default `false`) |
| `pageNumber`, `pageSize` | Paging |

```json
200
{
  "items": [
    {
      "id": "mch_01JD...",
      "name": "studio-mac",
      "hostname": "studio.local",
      "os": "macOS 26.0 arm64",
      "muxVersion": "2.0.0",
      "protocolVersion": 1,
      "online": true,
      "lastSeenUtc": "...",
      "lastConnectedUtc": "...",
      "lastDisconnectedUtc": "...",
      "activeRuns": 1,
      "awaitingApproval": 0,
      "remoteToolApproval": true,
      "secretLast4": "Xa9Q",
      "revoked": false,
      "createdUtc": "..."
    }
  ],
  "pageNumber": 1,
  "pageSize": 25,
  "totalCount": 1
}
```

### `GET /v1.0/api/machines/{id}`

`200` machine object. `404 NotFound`.

### `PUT /v1.0/api/machines/{id}`

Rename a machine. The new name is sent to the machine on its next welcome.

```json
{ "name": "studio" }
```

`200` machine object. `400 BadRequest`, `404 NotFound`.

### `POST /v1.0/api/machines/{id}/revoke`

Invalidates the machine secret and closes the live tunnel with `4403`. The machine record stays (`revoked: true`) so its history remains visible. The machine has to be enrolled again before it can reconnect. A "machine revoked" email is sent.

`200` machine object. `404 NotFound`.

### `DELETE /v1.0/api/machines/{id}`

Revokes the machine (as above) and deletes the record and its connection history.

`204`. `404 NotFound`.

### `GET /v1.0/api/machines/{id}/connections`

Connection history, newest first, paged.

```json
{
  "items": [
    {
      "id": "mcn_...",
      "machineId": "mch_...",
      "nodeId": "node-1",
      "remoteIp": "198.51.100.4",
      "protocolVersion": 1,
      "muxVersion": "2.0.0",
      "connectedUtc": "...",
      "disconnectedUtc": "...",
      "closeCode": 4409,
      "closeReason": "replaced",
      "bytesIn": 18233,
      "bytesOut": 9921
    }
  ],
  "pageNumber": 1,
  "pageSize": 25,
  "totalCount": 3
}
```

---

## Billing

| Route | Auth | Response |
| --- | --- | --- |
| `GET /v1.0/api/billing/plans` | Anonymous | `200 [ plan ]`, public active plans only |
| `GET /v1.0/api/billing/subscription` | Authenticated | `200` subscription object, or `200 null` when the account has none |
| `GET /v1.0/api/billing/entitlements` | Authenticated | `200` entitlements object |
| `POST /v1.0/api/billing/checkout` | Authenticated | `{ "planCode": "pro" }`. Returns `200 { "url": "..." }` from the billing provider. `501 NotImplemented` while no provider is configured (0.1.0). |
| `POST /v1.0/api/billing/portal` | Authenticated | `200 { "url": "..." }`, or `501 NotImplemented` |
| `POST /v1.0/api/billing/webhooks/{provider}` | Provider signature | `200`. `404 NotFound` for a provider that is not configured. |

Plan:

```json
{
  "id": "pln_...",
  "code": "free",
  "name": "Free",
  "priceCents": 0,
  "currency": "usd",
  "interval": "month",
  "features": [
    { "key": "web.access", "limit": null },
    { "key": "mobile.access", "limit": null },
    { "key": "machines.max", "limit": null },
    { "key": "relay.concurrentStreams.max", "limit": null }
  ]
}
```

For a feature, `limit: null` means enabled and unlimited, `0` means disabled, and a positive number is a cap.

Subscription:

```json
{ "id": "sub_...", "planId": "pln_...", "planCode": "free", "status": "Active", "provider": "none", "currentPeriodEndUtc": null, "cancelAtPeriodEnd": false, "createdUtc": "..." }
```

`status` is one of `Trialing`, `Active`, `PastDue`, `Canceled`, `Expired`.

Entitlements:

```json
{
  "accountId": "acct_...",
  "planCode": "free",
  "features": [
    { "key": "web.access", "enabled": true, "limit": null },
    { "key": "mobile.access", "enabled": true, "limit": null },
    { "key": "machines.max", "enabled": true, "limit": null },
    { "key": "relay.concurrentStreams.max", "enabled": true, "limit": null }
  ]
}
```

Entitlements merge every active subscription with the account's admin overrides. Features are checked by key, never by plan name.

---

## WebSocket tickets

### `POST /v1.0/api/ws-tickets`

Authenticated, bearer only. This is how the mobile app authenticates WebSocket connections. Browsers use the session cookie instead.

```json
201
{ "ticket": "wst_...", "expiresUtc": "2026-11-17T18:00:30.0000000Z" }
```

A ticket is single use and valid for 30 seconds. Pass it as `?ticket=` to `/v1.0/events` or `/m/{machineId}/v1.0/ws`.

---

## Relay

### `ANY /m/{machineId}/{path}`

Authenticated, by cookie or bearer. Relays the request to the machine's local mux API through its tunnel.

The path after `/m/{machineId}` is the machine-local path: `GET /m/mch_x/v1.0/api/sessions` reaches the machine's `GET /v1.0/api/sessions`, and `GET /m/mch_x/dashboard` returns that machine's own mux dashboard, rendered to call back through the relay. Under the parity rule the response is exactly what the machine returned. Streamed responses, such as the server-sent events from `POST /m/{id}/v1.0/api/chat/stream`, are flushed to the client as they arrive.

Before relaying, Mux Cloud:

1. Authenticates the user. The Origin check applies to cookie requests that change state.
2. Loads the machine for the user's tenant. A missing machine, or another account's, is `404 NotFound`.
3. Checks the `web.access` entitlement (cookie requests) or `mobile.access` (bearer requests). Failure is `402 EntitlementExceeded`.
4. Checks that the machine is online. Offline is `503 MachineOffline`.
5. Checks the body size against `maxRequestBodyBytes` (default 8 MiB). Too large is `413 BodyTooLarge`.
6. Checks the tunnel's concurrent stream limit. Full is `503 TooManyStreams`.

Header handling is described in `WEBSOCKETS_API.md` section 1.9. In short: cloud cookies and credentials are removed, and the machine adds its own local API key. HTML responses get `Content-Security-Policy: frame-ancestors 'self'` so the relayed dashboard can be framed by the cloud dashboard and by nothing else.

A response that has not started within 30 seconds is `504 Timeout`. If the client disconnects, the machine is told to cancel.

Request history records method, path template (`/m/{machineId}/...`), status, duration, and sizes for relay routes, but never their bodies.

---

## Admin

Every admin route requires a user with `isAdmin: true`. Anyone else gets `403 Forbidden`.

| Route | Description |
| --- | --- |
| `GET /v1.0/api/admin/stats` | `200 { "users": 12, "machines": 30, "onlineMachines": 18, "liveConnections": 18, "relayStreams": 4, "eventSubscribers": 7 }` |
| `GET /v1.0/api/admin/users` | Paged users. Filter with `email` (substring). |
| `GET /v1.0/api/admin/users/{id}` | User object |
| `PUT /v1.0/api/admin/users/{id}` | `{ "active": true, "isAdmin": false, "emailVerified": true, "firstName": "...", "lastName": "..." }`. Disabling a user revokes their sessions and closes their machines' tunnels. |
| `DELETE /v1.0/api/admin/users/{id}` | Deletes the user and their account. `409 Conflict` for the protected seed admin. |
| `GET /v1.0/api/admin/machines` | Paged machines across all accounts. Filter with `online`, `name`, and `userId`. |
| `GET /v1.0/api/admin/plans` | All plans, including inactive and private ones |
| `POST /v1.0/api/admin/plans` | Create a plan: `{ "code": "pro", "name": "Pro", "priceCents": 900, "currency": "usd", "interval": "month", "active": true, "public": true, "features": [ { "key": "machines.max", "limit": 10 } ] }` |
| `PUT /v1.0/api/admin/plans/{id}` | Update a plan. The same body as create. |
| `GET /v1.0/api/admin/accounts/{accountId}/overrides` | Entitlement overrides for an account |
| `POST /v1.0/api/admin/accounts/{accountId}/overrides` | `{ "featureKey": "machines.max", "limit": null, "reason": "comp", "expiresUtc": null }` returns `201` |
| `DELETE /v1.0/api/admin/accounts/{accountId}/overrides/{id}` | `204` |
| `GET /v1.0/api/admin/audit` | Paged audit records. Filter with `eventType`, `userId`, `fromUtc`, and `toUtc`. |
| `GET /v1.0/api/admin/settings` | Effective server settings with secrets shown as `"(set)"` or `"(not set)"`, and environment-overridden fields listed in `environmentOverrides`. Read only in 0.1.0. |
| `POST /v1.0/api/admin/email/test` | `{ "to": "ops@example.com" }` sends the admin test email. Returns `202`. |

### Request history

These are admin routes. Bodies are never captured for relay routes.

| Route | Description |
| --- | --- |
| `GET /v1.0/api/request-history` | Paged list without bodies. Filters: `method`, `statusCode`, `pathContains`, `fromUtc`, `toUtc`, `userId`. |
| `GET /v1.0/api/request-history/summary?fromUtc=&toUtc=&bucketMinutes=` | `{ "totalCount", "totalSuccess", "totalFailure", "averageDurationMs", "buckets": [ { "bucketStartUtc", "bucketEndUtc", "successCount", "failureCount", "averageDurationMs" } ] }`. Empty buckets are filled in. |
| `GET /v1.0/api/request-history/{id}` | Full entry, including captured (truncated, redacted) bodies for non-relay routes |
| `DELETE /v1.0/api/request-history/{id}` | `204` |
| `DELETE /v1.0/api/request-history` | Delete by the same filters. Returns `200 { "deletedCount": 42 }`. |

A request history entry:

```json
{
  "id": "req_...",
  "method": "GET",
  "path": "/v1.0/api/machines",
  "pathTemplate": "/v1.0/api/machines",
  "statusCode": 200,
  "durationMs": 3.41,
  "requestBytes": 0,
  "responseBytes": 812,
  "userId": "usr_...",
  "tenantId": "ten_...",
  "sourceIp": "203.0.113.7",
  "isRelay": false,
  "createdUtc": "..."
}
```

The detail route adds `requestHeaders`, `responseHeaders`, `requestBody`, `responseBody`, `requestBodyTruncated`, and `responseBodyTruncated`.
