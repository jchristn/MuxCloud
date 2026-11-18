<p align="center">
  <img src="assets/logo-grey.png" width="300" alt="mux">
</p>

<p align="center"><em>Your mux machines, from anywhere.</em></p>

# Mux Cloud

Mux Cloud lets you use the [mux](https://github.com/jchristn/Mux) agents running on your own computers from a browser on another computer or from your phone. Each machine keeps one outbound WebSocket open to Mux Cloud. When you pick a machine, you get that machine's own mux dashboard and conversations, exactly as if you were sitting at it: chat, tool approvals, settings, endpoints, MCP servers, skills, everything.

Conversations stay on your machines. Mux Cloud stores your account and the list of your machines, and passes traffic through without keeping it.

The hosted service runs at [app.usemux.ai](https://app.usemux.ai). The code is MIT licensed, and you can run your own.

> **Status:** 0.1.0-alpha, under active development. [PLAN.md](PLAN.md) has the architecture, decisions, and roadmap.

## How it works

```
 Browser (dashboard)     Mobile app
        |  cookie            |  bearer token / ticket
        v                    v
 +---------------------------------------------+
 |              MuxCloud.Server                 |
 |  /v1.0/api/*   accounts, machines, billing   |
 |  /v1.0/events  live machine online/offline   |
 |  /m/{id}/*     relay (REST, SSE, WebSocket)  |
 |  /v1.0/tunnel  machine tunnels               |
 |  /             the dashboard (same origin)   |
 +---------------------------------------------+
        ^  one persistent outbound WebSocket per machine
        |
 mux on your machine (tray agent or mux serve) -> 127.0.0.1 mux API
```

A machine signs in once with your email and password, receives a per-machine secret, and forgets the password. From then on it proves possession of the secret on every connection. Relayed requests run concurrently over the tunnel, responses stream (so chat output appears as it is generated), and relayed WebSockets carry frames in both directions. When a tunnel drops, the machine reconnects with backoff, and the dashboard and app learn it went offline from the events socket.

The machine side lives in the mux repository. The wire contract is the `MuxCloud.Protocol` package in this repository, documented in [WEBSOCKETS_API.md](WEBSOCKETS_API.md).

## Repository layout

| Path | Contents |
| --- | --- |
| `src/MuxCloud.Protocol` | Tunnel wire contract shared with mux (NuGet `MuxCloud.Protocol`) |
| `src/MuxCloud.Core` | Settings, models, the database layer (Sqlite, Postgresql, Mysql, SqlServer), and account, machine, and entitlement services |
| `src/MuxCloud.Email` | Email layout, templates, and the Mailgun, File, and Disabled providers |
| `src/MuxCloud.Server` | The Watson host: REST routes, tunnel endpoint, relay, events socket, dashboard files |
| `src/MuxCloud.Dashboard` | The web dashboard (React) |
| `src/MuxCloud.Mobile` | The iOS and Android app (Expo) |
| `src/Test.Shared` | Every test suite (Touchstone), including end-to-end relay tests with a fake machine |
| `src/Test.Automated`, `src/Test.Xunit3`, `src/Test.Nunit` | Runners for the shared suites |
| `docker/` | Compose stack, server image, update and factory reset scripts |
| `assets/postman/` | Postman collection for the REST API |

## Getting started with Docker

```
cd docker
echo "MUXCLOUD_DB_PASSWORD=choose-a-database-password" > .env
echo "MUXCLOUD_ADMIN_PASSWORD=choose-an-admin-password" >> .env
docker compose up -d
curl http://127.0.0.1:8800/v1.0/api/health
```

Open `http://127.0.0.1:8800`, sign in as `admin@muxcloud.local` with the admin password, or sign up. With the default `File` email provider, verification and reset emails land in `docker/email-outbox/`. Point mux at the server with `cloud.serverUrl` set to `http://127.0.0.1:8800`.

`docker/update.sh` (or `update.bat`) pulls newer images and recreates the stack without touching data. `docker/factory/reset.sh` (or `reset.bat`) deletes everything and restores the default settings.

## Running from source

Requires the .NET 8 and .NET 10 SDKs.

```
dotnet build src/MuxCloud.sln
dotnet run --project src/MuxCloud.Server --framework net10.0
```

The first run writes `muxcloud.json` with a generated signing key, uses SQLite (`muxcloud.db`), listens on `http://127.0.0.1:8800`, and logs a generated administrator password once. If `src/MuxCloud.Dashboard/dist` exists when the server builds, the dashboard is served from the same origin.

## Dashboard

`src/MuxCloud.Dashboard` is the web dashboard: sign up and sign in, machines with live status, each machine's own mux dashboard through the relay, conversations across machines, account and plan, and administration. React 19, Vite, React Router 7, TypeScript, and i18next.

```
cd src/MuxCloud.Dashboard
npm install
npm run dev        # http://127.0.0.1:5173, proxying the API to http://127.0.0.1:8800
npm run build      # dist/, served by the server from the same origin
npm test           # i18n gate and unit tests
npm run test:e2e   # Playwright against a mocked API
```

The server copies `dist/` next to itself when it builds, and the Docker image builds it in its own stage. Dashboard pages get a strict Content-Security-Policy; see [src/MuxCloud.Dashboard/README.md](src/MuxCloud.Dashboard/README.md).

## Mobile app

`src/MuxCloud.Mobile` is the iPhone, iPad, and Android app (Expo): machines with live online state, conversations, streaming chat, tool approvals, new conversations in any folder, machine management, and push notifications for approvals and finished runs. It shares the dashboard's API client, types, and translations.

```
cd src/MuxCloud.Mobile
npm install
npm start          # Expo dev server; i for iOS, a for Android
npm run verify     # typecheck, lint, i18n, parity, audit, tests
```

It talks to `https://app.usemux.ai` by default; change the server on the sign-in screen for local development. See [src/MuxCloud.Mobile/README.md](src/MuxCloud.Mobile/README.md).

## Configuration

Settings live in `muxcloud.json` (path from `--config`, then `MUXCLOUD_SETTINGS_FILE`). Environment variables override the file and are never written back to it.

| Setting | Default | Environment variable |
| --- | --- | --- |
| `Server.PublicUrl` | `http://127.0.0.1:8800` (production: `https://app.usemux.ai`) | `MUXCLOUD_PUBLIC_URL` |
| `Server.DashboardDirectory` | `./dashboard` | `MUXCLOUD_DASHBOARD_DIR` |
| `Server.TrustForwardedHeaders` | `false` (enable behind a trusted reverse proxy) | |
| `Server.AdditionalOrigins` | none (add a dashboard dev server here) | |
| `Rest.Hostname`, `Rest.Port` | `127.0.0.1`, `8800` | `MUXCLOUD_REST_HOST`, `MUXCLOUD_REST_PORT` |
| `Database.Type` | `Sqlite` (`Sqlite`, `Postgresql`, `Mysql`, `SqlServer`) | `MUXCLOUD_DB_TYPE` |
| `Database.Server`, `Port`, `DatabaseName`, `Username`, `Password` | | `MUXCLOUD_DB_SERVER`, `_PORT`, `_DATABASE`, `_USERNAME`, `_PASSWORD` |
| `Auth.SigningKey` | generated | `MUXCLOUD_AUTH_SIGNING_KEY` |
| `Admin.Email`, `Admin.Password` | `admin@muxcloud.local`, generated | `MUXCLOUD_ADMIN_EMAIL`, `MUXCLOUD_ADMIN_PASSWORD` |
| `Email.Provider` | `File` | `MUXCLOUD_EMAIL_PROVIDER` |
| `Email.Mailgun.ApiKey` | | `MUXCLOUD_MAILGUN_API_KEY` |
| `Push.Enabled` | `true` | `MUXCLOUD_PUSH_ENABLED` |
| `Push.ExpoAccessToken` | | `MUXCLOUD_EXPO_ACCESS_TOKEN` |
| `Tunnel.*` | heartbeat 20 s, 3 missed pings, 32 streams, 8 MiB bodies, 30 s first byte | |

Changing `Auth.SigningKey` signs everyone out and invalidates every machine secret, so machines must sign in again. [EMAIL.md](EMAIL.md) covers email settings.

## Documentation

| Document | Contents |
| --- | --- |
| [PLAN.md](PLAN.md) | Architecture, decisions, phases |
| [REST_API.md](REST_API.md) | Every REST route |
| [WEBSOCKETS_API.md](WEBSOCKETS_API.md) | Tunnel protocol, account events, relayed sockets |
| [EMAIL.md](EMAIL.md) | Email providers, layout, templates |

## Testing

```
dotnet run --project src/Test.Automated --framework net10.0
dotnet run --project src/Test.Automated --framework net10.0 -- --provider Postgresql
dotnet test src/Test.Xunit3
dotnet test src/Test.Nunit
```

`--provider` selects `Sqlite` (default), `Postgresql`, `Mysql`, or `SqlServer`. Server engines read `MUXCLOUD_TEST_DB_HOST`, `_PORT`, `_USER`, and `_PASSWORD`, and each test gets its own database. CI runs every suite on Linux, Windows, and macOS, plus the three server engines, the dashboard (unit tests, build, Playwright), and the mobile app (typecheck, lint, tests).

## AOT support

`MuxCloud.Protocol` is AOT compatible: it uses source-generated JSON and no reflection. The server is not AOT compatible. Its settings and API serialization use reflection-based System.Text.Json, and the MySQL and SQL Server drivers are not trim safe.

## Security

An account on Mux Cloud can operate its connected machines remotely, including approving tools, so the account is the key. Use a strong password and watch for "new machine connected" emails. A machine owner can turn off remote tool approval with `cloud.allowRemoteToolApproval: false` in mux. Report vulnerabilities to hello@latticetech.ai.

## License

MIT. See [LICENSE.md](LICENSE.md). Mux Cloud is operated by Lattice AI, LLC.
