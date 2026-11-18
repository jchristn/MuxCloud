<p align="center">
  <img src="https://raw.githubusercontent.com/jchristn/MuxCloud/main/assets/logo-grey.png" width="300" alt="mux">
</p>

# Mux Cloud server

Mux Cloud lets you use the [mux](https://github.com/jchristn/Mux) agents on your own computers from a browser or phone. Each machine keeps one outbound WebSocket to the server; the server relays the dashboard, REST, streamed chat, and WebSocket traffic down that tunnel. Conversations stay on your machines.

This image runs the whole service on one port: the REST API, the machine tunnel endpoint, the relay, the account events socket, and the web dashboard.

## Use cases

- Reach the mux on your workstation from a laptop or phone, with no inbound ports or VPN.
- Run your own private Mux Cloud for a team.
- Develop against the relay locally.

## Quick start

```yaml
# compose.yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: muxcloud
      POSTGRES_USER: muxcloud
      POSTGRES_PASSWORD: change-me
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U muxcloud -d muxcloud"]
      interval: 5s
      timeout: 5s
      retries: 2
  muxcloud-server:
    image: jchristn77/muxcloud-server:v0.1.0-alpha
    depends_on:
      postgres:
        condition: service_healthy
    ports: ["8800:8800"]
    environment:
      MUXCLOUD_REST_HOST: 0.0.0.0
      MUXCLOUD_DB_TYPE: Postgresql
      MUXCLOUD_DB_SERVER: postgres
      MUXCLOUD_DB_DATABASE: muxcloud
      MUXCLOUD_DB_USERNAME: muxcloud
      MUXCLOUD_DB_PASSWORD: change-me
      MUXCLOUD_ADMIN_PASSWORD: change-me-too
      MUXCLOUD_PUBLIC_URL: http://127.0.0.1:8800
    healthcheck:
      test: ["CMD", "curl", "-f", "http://127.0.0.1:8800/v1.0/api/health"]
      interval: 5s
      timeout: 5s
      retries: 2
```

Then open `http://127.0.0.1:8800` and sign in as `admin@muxcloud.local`.

## Configuration

Mount a `muxcloud.json` at `/app/muxcloud.json` or use environment variables (`MUXCLOUD_PUBLIC_URL`, `MUXCLOUD_DB_*`, `MUXCLOUD_AUTH_SIGNING_KEY`, `MUXCLOUD_ADMIN_*`, `MUXCLOUD_EMAIL_PROVIDER`, `MUXCLOUD_MAILGUN_API_KEY`). Behind a TLS reverse proxy, set `MUXCLOUD_PUBLIC_URL` to the https origin and allow WebSocket upgrades on `/v1.0/tunnel`, `/v1.0/events`, and `/m/`.

Volumes: `/app/data` (SQLite and generated files), `/app/logs`, `/app/email-outbox` (File email provider).

## Links

- Source and documentation: https://github.com/jchristn/MuxCloud
- REST API: https://github.com/jchristn/MuxCloud/blob/main/REST_API.md
- WebSockets and tunnel protocol: https://github.com/jchristn/MuxCloud/blob/main/WEBSOCKETS_API.md

MIT licensed.
