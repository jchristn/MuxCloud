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
- Docker stack (server plus PostgreSQL, with MySQL and SQL Server profiles), update and factory reset scripts.
- Shared Touchstone suites run by the console runner, xUnit v3, and NUnit on Linux, Windows, and macOS, plus a
  provider matrix job for the three server engines.
