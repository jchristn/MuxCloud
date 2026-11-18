# Changelog

All notable changes to Mux Cloud are recorded here. Versions follow [Semantic Versioning](https://semver.org).
Every 0.x release is alpha.

## 0.1.0-alpha (unreleased)

- `MuxCloud.Protocol`: the tunnel wire contract (envelope and payload models, handshake proof, close and error
  codes, capabilities, header filtering, reconnect backoff), with source-generated JSON for AOT.
- `MuxCloud.Core`: settings (`muxcloud.json` with `MUXCLOUD_*` overrides), a hand-written SQL layer for Sqlite,
  Postgresql, Mysql, and SqlServer with tracked migrations and an idempotent seed, PBKDF2-SHA256 passwords, AES-256-GCM
  access tokens and machine secrets, rotating refresh tokens with reuse detection, lockout, entitlements, enrollment,
  and audit.
- `MuxCloud.Email`: Mailgun (from hello@latticetech.ai), File, and Disabled providers, a dark-mode-aware layout, and
  eight templates.
- `MuxCloud.Server`: the REST API, cookie and bearer auth with Origin enforcement, WebSocket tickets, the machine tunnel
  endpoint, the `/m/{machineId}` relay with streamed responses and relayed WebSockets, the account events socket,
  request history that never stores relay bodies, and dashboard serving on the same origin.
- Push devices: `POST`, `GET`, and `DELETE /v1.0/api/devices` (Expo push tokens stored, never returned, scoped to
  the user, removed with the user), and Expo push for `approval_requested` and `run_completed` machine status pushes,
  behind `IPushSender`, `Push.Enabled`, the `mobile.access` entitlement, and `MUXCLOUD_EXPO_ACCESS_TOKEN`. Devices Expo
  reports as `DeviceNotRegistered` are removed. Schema migration 2 adds the `devices` table on all four engines.
- Admin responses match the dashboard: audit records carry `principal`, overrides return `limit` and `expiresUtc`
  (always present).
- Dashboard HTML is served with a strict Content-Security-Policy (`script-src 'self'`, `frame-ancestors 'self'`);
  relayed machine pages get only `frame-ancestors 'self'` and `X-Frame-Options: SAMEORIGIN`.
- `MuxCloud.Dashboard`: the web dashboard (React 19, Vite, React Router 7, TypeScript, i18next): sign up and sign in,
  machines with live status, each machine's own mux dashboard through the relay, conversations across machines,
  account, plan, legal pages, and administration, with unit tests, an i18n gate, and Playwright functional and visual
  checks.
- `MuxCloud.Mobile`: the iOS and Android app (Expo): machines with live status, conversations, streaming chat, tool
  approvals, new conversations, machine management, and push notifications, sharing the dashboard's API client,
  types, and translations.
- Docker stack (server plus PostgreSQL, with MySQL and SQL Server profiles), update and factory reset scripts.
- Shared Touchstone suites run by the console runner, xUnit v3, and NUnit on Linux, Windows, and macOS, plus a
  provider matrix job for the three server engines, a dashboard job (unit tests, build, Playwright), and a mobile job
  (typecheck, lint, tests).
