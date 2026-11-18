# Mux Cloud WebSockets API

Mux Cloud exposes three WebSocket surfaces. This document is the reference for all of them.

| Path | Who connects | Purpose |
| --- | --- | --- |
| `/v1.0/tunnel` | A mux machine (`Mux.Agent` or `mux serve`) | The machine's one persistent outbound connection. Carries every relayed request, response, and WebSocket channel. |
| `/v1.0/events` | The cloud dashboard and the mobile app | Live account events: machines going online and offline, renames, removals, subscription changes. |
| `/m/{machineId}/v1.0/ws` | The cloud dashboard and the mobile app | The machine's own mux WebSocket (`/v1.0/ws`), relayed through the tunnel. Its messages are defined by mux; see mux's `WEBSOCKETS_API.md`. |

The tunnel contract is implemented by the `MuxCloud.Protocol` package, which both Mux Cloud and mux use. Field names, types, and defaults below match that package.

---

## 1. Tunnel (`/v1.0/tunnel`)

### 1.1 Protocol summary

- Production URL: `wss://app.usemux.ai/v1.0/tunnel`. A local development server uses `ws://127.0.0.1:<port>/v1.0/tunnel`.
- Every message is one JSON text frame. Binary frames are ignored.
- Every frame is an envelope with a `type` discriminator. `type` decides which single payload property is present.
- Protocol version: integer, currently `1`. It is sent in the handshake and confirmed in the welcome.
- JSON names are camelCase. Null properties are omitted. Receivers ignore unknown properties and unknown `type` values so newer peers can add fields.
- Timestamps are UTC, ISO 8601 round-trip format (`2026-11-17T18:00:00.0000000Z`).

### 1.2 Envelope

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `type` | string | yes | Message type (section 1.6) |
| `id` | string | for `http.*`, `ws.*`, and `stream.error` | Stream identifier (`str_...`) for HTTP, channel identifier (`chn_...`) for WebSocket channels. The cloud generates both. |
| `timestampUtc` | string | yes | When the sender created the frame |
| `hello`, `welcome`, `ping`, `goAway`, `httpRequest`, `httpResponseStart`, `httpChunk`, `wsOpen`, `wsFrame`, `wsClose`, `error`, `machineStatus` | object | per type | Exactly one of these, matching `type`, or none for types without a payload |

Example:

```json
{
  "type": "http.request",
  "id": "str_01JD3M6Q4W8Z2X9C7V5B1N0K3H",
  "timestampUtc": "2026-11-17T18:00:00.0000000Z",
  "httpRequest": {
    "method": "GET",
    "path": "/v1.0/api/sessions",
    "query": "",
    "headers": { "Accept": "application/json" },
    "contentType": "",
    "bodyBase64": "",
    "requesterIp": "203.0.113.7"
  }
}
```

### 1.3 Machine credentials and enrollment

A machine authenticates with a per-machine credential, never with the user's password. The user signs in once from any mux surface. Mux calls `POST /v1.0/api/machines/enroll` (see `REST_API.md`) with the user's email and password and a description of the machine. It receives a `machineId` (`mch_...`) and a `machineSecret` (`mcs_` plus 48 alphanumeric characters), saves both in `settings.json` under `cloud`, and discards the password. The secret is shown once. The cloud stores it encrypted and shows only its last four characters.

Re-enrolling from the same machine (same fingerprint, same user) keeps the `machineId`, rotates the secret, and clears a revocation. Removing or revoking the machine in the dashboard invalidates the secret and closes any live tunnel with `4403`. So does signing out on the machine itself: mux calls `POST /v1.0/api/machines/sign-out` with a sign-out proof (the handshake proof with the prefix `mux-signout:` instead of `mux-tunnel:`, see `REST_API.md`) before it deletes its local credential.

### 1.4 Connection lifecycle

1. The machine opens `wss://app.usemux.ai/v1.0/tunnel`. No upgrade headers are needed.
2. Within 15 seconds it sends `tunnel.hello` as the first frame. Anything else, or nothing, closes the socket with `4400`.
3. The cloud checks the protocol version (`4426` if unsupported), the timestamp (`4400` if more than 120 seconds from server time, so a machine with a skewed clock keeps retrying and shows the reason), the nonce (rejected if seen in the last 5 minutes), the machine record (`4401` if unknown or if its stored secret can no longer be read, for example after `Auth.SigningKey` changed; `4403` if revoked or the user is deactivated), and the proof (`4401` if wrong, compared in constant time). Failed handshakes count toward a per-IP and per-machine lockout (`4429`).
4. If the machine already has a live tunnel, the cloud closes the older one with `4409` and fails its in-flight streams. Cleanup of the older connection never touches the newer one: the registry entry is removed only if it still holds the older `connectionId`.
5. The cloud sends `tunnel.welcome`. **The machine is online from this moment**, not from socket open. Account subscribers receive `machine.online`.
6. Both sides send `tunnel.ping` every `heartbeatSeconds` (default 20). The other side answers with `tunnel.pong` echoing the nonce. Three consecutive unanswered pings mean the connection is dead: the cloud closes it with `4408` and marks the machine offline, and the machine reconnects.
7. The cloud sends `http.request` and `ws.open` frames as clients use the machine. Streams and channels run concurrently, up to `maxConcurrentStreams`.
8. The machine may send `machine.status` at any time.
9. On deploy, the cloud sends `tunnel.goaway` with `retryAfterSeconds`, waits briefly for streams to finish, and closes with `4503`.
10. On any close, the cloud fails every pending stream (`502`), closes every relayed client WebSocket with `1001`, and publishes `machine.offline`.

### 1.5 Handshake proof

```
message = "mux-tunnel:" + machineId + ":" + timestampUtc + ":" + nonce
proof   = lowercase_hex( HMAC-SHA256( key = UTF8(machineSecret), data = UTF8(message) ) )
```

`timestampUtc` and `nonce` are the exact strings sent in the hello. The nonce is 16 random bytes as 32 lowercase hex characters. `TunnelProof.ComputeProof` and `TunnelProof.VerifyProof` implement this.

### 1.6 Messages

#### `tunnel.hello` (machine to cloud)

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `machineId` | string | yes | Issued at enrollment |
| `protocolVersion` | integer | yes | `1` |
| `muxVersion` | string | yes | Installed mux version |
| `machineName` | string | no | Display name chosen on the machine |
| `hostname` | string | no | Host name |
| `os` | string | no | Operating system description |
| `capabilities` | string[] | yes | Supported capabilities (section 1.7) |
| `timestampUtc` | string | yes | Proof timestamp |
| `nonce` | string | yes | Proof nonce |
| `proof` | string | yes | Section 1.5 |

```json
{
  "type": "tunnel.hello",
  "timestampUtc": "2026-11-17T18:00:00.0000000Z",
  "hello": {
    "machineId": "mch_01JD3M5ZK7T2R8W4Q6Y9P3N1A0",
    "protocolVersion": 1,
    "muxVersion": "2.0.0",
    "machineName": "studio-mac",
    "hostname": "studio.local",
    "os": "macOS 26.0 arm64",
    "capabilities": ["http.relay", "http.streaming", "http.cancel", "ws.relay", "machine.status"],
    "timestampUtc": "2026-11-17T18:00:00.0000000Z",
    "nonce": "5f2c9a0e7b3d41c8a6e9f0b1d2c3a4b5",
    "proof": "9c1e..."
  }
}
```

#### `tunnel.welcome` (cloud to machine)

| Field | Type | Description |
| --- | --- | --- |
| `connectionId` | string | This connection (`mcn_...`) |
| `protocolVersion` | integer | Selected version |
| `serverVersion` | string | Mux Cloud version |
| `heartbeatSeconds` | integer | Default 20, range 5 to 300 |
| `maxRequestBodyBytes` | integer | Largest relayed request body. Default 8388608 (8 MiB). |
| `maxConcurrentStreams` | integer | Largest number of concurrent streams and channels. Default 32. |
| `capabilities` | string[] | Capabilities in effect: the intersection of both sides |
| `machineName` | string | Name the cloud holds for the machine (it may have been renamed in the dashboard) |

#### `tunnel.ping` and `tunnel.pong` (either direction)

`ping: { "nonce": "<32 hex>" }`. The pong carries the same nonce.

#### `tunnel.goaway` (cloud to machine)

`goAway: { "reason": "deploy", "retryAfterSeconds": 5 }`. The machine reconnects after the delay plus jitter, without counting the drain as a failure.

#### `http.request` (cloud to machine)

| Field | Type | Description |
| --- | --- | --- |
| `method` | string | Upper case |
| `path` | string | Machine-local path with the `/m/{machineId}` prefix removed, for example `/v1.0/api/sessions` |
| `query` | string | Raw query without `?` |
| `headers` | object | Request headers after filtering (section 1.9) |
| `contentType` | string | Body content type |
| `bodyBase64` | string | Body, base64, at most `maxRequestBodyBytes` before encoding |
| `requesterIp` | string | The remote client's IP, for the machine's logs |

The machine forwards the request to its own local API at `http://127.0.0.1:<rest.port>` with its local API key, and adds `X-Mux-Relay: cloud` and `X-Mux-Base-Path: /m/{machineId}`. Requests run concurrently. One slow request never blocks another stream or the heartbeat.

#### `http.response.start`, `http.response.chunk`, `http.response.end` (machine to cloud)

| Type | Payload | Description |
| --- | --- | --- |
| `http.response.start` | `httpResponseStart: { statusCode, headers, contentType }` | Sent once, as soon as the local response headers arrive |
| `http.response.chunk` | `httpChunk: { data }` | Base64 body bytes, at most 65536 raw bytes per chunk. Server-sent event streams such as `/v1.0/api/chat/stream` arrive as many chunks and are flushed to the client as they come. |
| `http.response.end` | none | The body is complete |

A buffered JSON response is a start, one or more chunks, and an end. The cloud starts writing to the client on `start` and flushes every chunk, so streaming works end to end.

#### `http.cancel` (cloud to machine)

No payload. The client disconnected or the request timed out. The machine aborts the local request and sends nothing further for that stream.

#### `ws.open`, `ws.opened`, `ws.frame`, `ws.close`

| Type | Direction | Payload |
| --- | --- | --- |
| `ws.open` | cloud to machine | `wsOpen: { path, query, subprotocols, requesterIp }` |
| `ws.opened` | machine to cloud | none |
| `ws.frame` | either | `wsFrame: { text }` |
| `ws.close` | either | `wsClose: { code, reason }` |

The machine opens a WebSocket to its own `ws://127.0.0.1:<rest.port><path>` with its local API key. Frames flow in both directions without acknowledgements. If the local socket cannot open, the machine sends `stream.error` for the channel and the cloud closes the client socket with `1011`.

#### `stream.error` (machine to cloud)

`error: { code, message, statusCode }`. If no response has started, the cloud answers the client with `statusCode` and `{ "error": code, "message": message }`. If a response has started, the cloud ends it.

#### `machine.status` (machine to cloud)

| Field | Type | Description |
| --- | --- | --- |
| `kind` | string | `status`, `approval_requested`, or `run_completed` |
| `muxVersion` | string | Installed version |
| `machineName` | string | Name chosen on the machine |
| `activeRuns` | integer | Runs in progress |
| `awaitingApproval` | integer | Runs waiting for a tool approval |
| `remoteToolApproval` | boolean | `cloud.allowRemoteToolApproval` |
| `sessionId`, `runId` | string | For `approval_requested` and `run_completed`, the run concerned, for deep links |
| `title` | string | Conversation title for a notification, or empty |

The cloud updates the machine record, publishes `machine.updated` on the events socket, and sends push notifications for `approval_requested` and `run_completed` to the user's registered devices. Notifications carry the machine name, title, and deep link only.

### 1.7 Capabilities

| Name | Meaning |
| --- | --- |
| `http.relay` | Relayed HTTP |
| `http.streaming` | Chunked response bodies |
| `http.cancel` | Request cancellation |
| `ws.relay` | Relayed WebSocket channels |
| `machine.status` | Status pushes |

A side uses a feature only if it appears in the welcome's `capabilities`.

### 1.8 Close codes

| Code | Meaning | Machine reconnects? |
| --- | --- | --- |
| `4400` | Bad or missing handshake, or the machine's clock is more than 120 seconds off | Yes, with backoff |
| `4401` | Unknown machine or wrong proof | No. The user signs in again. |
| `4403` | Machine removed or revoked | No. The user signs in again. |
| `4408` | Heartbeat timeout | Yes |
| `4409` | Replaced by a newer connection | Not on this connection |
| `4426` | Protocol version unsupported | No. Upgrade mux. |
| `4429` | Too many failed handshakes | Yes, with backoff |
| `4503` | Server draining | Yes, after `retryAfterSeconds` |
| `1006` and other transport failures | Network loss | Yes, with backoff |

Reconnect backoff is `2 * 2^(attempt - 1)` seconds, capped at 60, with plus or minus 20% jitter, reset after a welcome (`TunnelReconnectPolicy`).

### 1.9 Header filtering

Hop-by-hop headers (`Connection`, `Keep-Alive`, `Transfer-Encoding`, `Upgrade`, `Content-Length`, `Host`, `TE`, `Trailer`, the `Sec-WebSocket-*` handshake headers, and the proxy headers) never cross the tunnel.

The cloud also removes cloud credentials and cloud state before relaying: `Cookie`, `Authorization`, `X-Api-Key`, `X-Token`, `X-Access-Key`, `X-Secret-Key`, `X-Forwarded-*`, `X-Real-IP`, `Forwarded`, `Origin`, `Referer`, and any client-supplied `X-Mux-Relay` or `X-Mux-Base-Path`. The machine adds its own local API key.

On responses, the cloud drops `Set-Cookie`, the `Access-Control-*` headers, and `Server`.

Everything else passes through unchanged. Under the parity rule the relay never masks or rewrites what the machine returns.

### 1.10 Errors and limits

| Condition | Client sees |
| --- | --- |
| Machine offline | `503 { "error": "machine_offline" }` |
| Request body over `maxRequestBodyBytes` | `413 { "error": "body_too_large" }` |
| Concurrent stream limit reached | `503 { "error": "too_many_streams" }` |
| No response start within 30 seconds | `504 { "error": "timeout" }`. Once streaming has started there is no overall time limit. |
| Tunnel lost mid-request | `502 { "error": "loopback_failed" }` or a truncated stream |

### 1.11 Security notes

- The machine dials out. It needs no inbound port.
- The machine secret is the machine's credential. It lives in `settings.json`, like the local REST API key. Anyone who can read that file can impersonate the machine to the cloud.
- An authenticated cloud user has the same power over the machine as a local user, including approving tools (unless `cloud.allowRemoteToolApproval` is false). Protect the account: verify your email, use a strong password, and revoke sessions and machines you do not recognize.
- The cloud sees relayed traffic in memory as it passes through. It does not store request or response bodies.

### 1.12 Minimal client checklist

1. Enroll once and store `machineId` and `machineSecret`.
2. Connect, send `tunnel.hello` with a fresh nonce and timestamp, and wait for `tunnel.welcome`.
3. Run a receive loop that only parses and dispatches. Handle each stream and channel on its own task. Serialize sends through one lock.
4. Answer every `tunnel.ping` with a `tunnel.pong`. Ping the cloud on the same interval, and reconnect after three missed pongs.
5. Forward `http.request` to the local API and stream the response back as start, chunks, and end. Honor `http.cancel`.
6. Bridge `ws.*` channels to local WebSockets.
7. Reconnect with backoff. Stop on terminal close codes and tell the user why.

---

## 2. Account events (`/v1.0/events`)

### 2.1 Authentication

- **Browser:** the session cookie set at login travels on the upgrade request. The `Origin` header must be the cloud origin (`https://app.usemux.ai`).
- **Mobile:** request a single-use ticket with `POST /v1.0/api/ws-tickets` (valid for 30 seconds) and connect to `/v1.0/events?ticket=<ticket>`.

A failed authentication closes the socket with `4401`.

### 2.2 Messages (server to client)

Every message is `{ "type": "...", "timestampUtc": "...", ... }`.

| Type | Fields | When |
| --- | --- | --- |
| `server.connected` | `userId`, `heartbeatSeconds` | After authentication |
| `machine.online` | `machine` | A machine's tunnel was accepted |
| `machine.offline` | `machine` | A machine's tunnel closed or timed out |
| `machine.updated` | `machine` | Renamed, new mux version, or new counters from `machine.status` |
| `machine.removed` | `machineId` | Deleted or revoked |
| `subscription.updated` | `entitlements` | Plan or entitlement change |
| `ping` | none | Every `heartbeatSeconds`. Clients may ignore it. |

`machine` is the same object `GET /v1.0/api/machines/{id}` returns: `id`, `name`, `hostname`, `os`, `muxVersion`, `online`, `lastSeenUtc`, `activeRuns`, `awaitingApproval`, `remoteToolApproval`.

### 2.3 Messages (client to server)

| Type | Description |
| --- | --- |
| `pong` | Optional reply to `ping` |

---

## 3. Relayed machine WebSocket (`/m/{machineId}/v1.0/ws`)

The cloud dashboard and the mobile app open the machine's own mux WebSocket through the relay. Authentication is the same as the events socket (cookie and Origin for browsers, ticket for mobile). After authentication, the cloud checks that the machine belongs to the user, that the plan includes `web.access` (cookie) or `mobile.access` (ticket), and that the machine is online. Failures close the client socket with `4401` (not authenticated), `4404` (machine not found), `4402` (entitlement), or `4503` (machine offline, or the tunnel's stream limit is reached). It then opens a `ws.*` channel on the machine's tunnel and passes frames through untouched. The frames are mux's own `/v1.0/ws` protocol, including `subscribe`, `approve`, run event frames, and `approval_requested`. They are documented in mux's `WEBSOCKETS_API.md`.

When the tunnel drops, every relayed socket for that machine closes with `1001`. Clients reconnect when `machine.online` arrives on the events socket.
