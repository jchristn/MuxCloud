#!/usr/bin/env bash
# End-to-end test of Mux Cloud with real components:
#   - MuxCloud.Server built from this checkout (SQLite, File email, the built dashboard)
#   - a scripted OpenAI-compatible model (scripts/e2e/fake-llm.py)
#   - two real mux hubs built from a Mux checkout (feature/v2.0.0), each with its own isolated config directory
#   - Playwright driving the cloud dashboard and each machine's own dashboard through the relay
#
# Usage: scripts/e2e-real.sh [extra playwright args]
#
# Environment:
#   MUX_REPO        Mux checkout to build (default: ../Mux next to this repo)
#   E2E_WORKDIR     scratch directory (default: a new temp directory, deleted afterward)
#   E2E_KEEP=1      keep the scratch directory and logs
#   E2E_SKIP_BUILD=1  reuse the builds already in E2E_WORKDIR
#   CLOUD_PORT (8760), LLM_PORT (8790), MUX_A_PORT (8771), MUX_B_PORT (8772)
#
# Never touches ~/.mux: every mux process runs with its own MUX_CONFIG_DIR inside the scratch directory.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MUX_REPO="${MUX_REPO:-$(cd "$ROOT/.." && pwd)/Mux}"
CLOUD_PORT="${CLOUD_PORT:-8760}"
LLM_PORT="${LLM_PORT:-8790}"
MUX_A_PORT="${MUX_A_PORT:-8771}"
MUX_B_PORT="${MUX_B_PORT:-8772}"
OWN_WORKDIR=0
if [ -z "${E2E_WORKDIR:-}" ]; then
  E2E_WORKDIR="$(mktemp -d "${TMPDIR:-/tmp}/muxcloud-e2e.XXXXXX")"
  OWN_WORKDIR=1
fi
WORK="$E2E_WORKDIR"
SERVER_PID=""
LLM_PID=""

log() { printf '\033[1;32m==>\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31mxx\033[0m %s\n' "$*" >&2; exit 1; }

cleanup() {
  local code=$?
  [ -n "$SERVER_PID" ] && kill "$SERVER_PID" 2>/dev/null || true
  [ -n "$LLM_PID" ] && kill "$LLM_PID" 2>/dev/null || true
  pkill -CONT -f "$WORK/mux/Mux.Cli serve" 2>/dev/null || true
  pkill -f "$WORK/mux/Mux.Cli serve" 2>/dev/null || true
  if [ "${E2E_KEEP:-0}" = "1" ] || [ "$code" != "0" ]; then
    echo "Logs and data kept in $WORK (cloud: $WORK/cloud/stdout.log, model: $WORK/fake-llm.log)"
  elif [ "$OWN_WORKDIR" = "1" ]; then
    rm -rf "$WORK"
  fi
  exit "$code"
}
trap cleanup EXIT INT TERM

for tool in dotnet node npx python3 curl; do
  command -v "$tool" >/dev/null || fail "$tool is required"
done
[ -d "$MUX_REPO/src/Mux.Cli" ] || fail "Mux checkout not found at $MUX_REPO (set MUX_REPO)"
for port in "$CLOUD_PORT" "$LLM_PORT" "$MUX_A_PORT" "$MUX_B_PORT"; do
  if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then fail "port $port is in use (override with CLOUD_PORT, LLM_PORT, MUX_A_PORT, MUX_B_PORT)"; fi
done

mkdir -p "$WORK/cloud/data" "$WORK/cloud/email" "$WORK/cloud/logs" "$WORK/run"
DASH="$ROOT/src/MuxCloud.Dashboard"

if [ "${E2E_SKIP_BUILD:-0}" != "1" ]; then
  log "Building the dashboard"
  [ -d "$DASH/node_modules" ] || (cd "$DASH" && npm ci --no-audit --no-fund)
  (cd "$DASH" && npm run build >/dev/null)
  log "Building MuxCloud.Server"
  dotnet publish "$ROOT/src/MuxCloud.Server" -f net10.0 -c Debug -o "$WORK/server" -v quiet -nologo >/dev/null
  log "Building mux from $MUX_REPO ($(git -C "$MUX_REPO" rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown))"
  dotnet publish "$MUX_REPO/src/Mux.Cli" -f net10.0 -c Debug -o "$WORK/mux" -p:MuxCloudRoot="$ROOT/" -v quiet -nologo >/dev/null
fi

ADMIN_EMAIL="e2e-admin@example.com"
ADMIN_PASSWORD="e2e-admin-$(python3 -c 'import secrets;print(secrets.token_hex(8))')"
python3 - "$WORK" "$CLOUD_PORT" "$DASH/dist" "$ADMIN_EMAIL" "$ADMIN_PASSWORD" <<'PY'
import json, secrets, sys
work, port, dist, admin_email, admin_password = sys.argv[1:6]
config = {
  "Server": {"PublicUrl": f"http://127.0.0.1:{port}", "NodeId": "e2e-1", "DashboardDirectory": dist,
             "TrustForwardedHeaders": False, "AdditionalOrigins": []},
  "Rest": {"Hostname": "127.0.0.1", "Port": int(port), "Ssl": False},
  "Database": {"Type": "Sqlite", "Filename": f"{work}/cloud/data/muxcloud.db"},
  "Logging": {"ConsoleLogging": True, "FileLogging": False, "LogDirectory": f"{work}/cloud/logs",
              "LogFilename": "muxcloud.log", "MinimumSeverity": 1, "SyslogServers": []},
  "Auth": {"SigningKey": secrets.token_hex(32), "AccessTokenMinutes": 60, "RefreshTokenDays": 30,
           "PasswordIterations": 600000, "MinimumPasswordLength": 10, "MaxLoginFailures": 10,
           "LoginFailureWindowSeconds": 900, "LockoutSeconds": 900, "AnonymousRequestsPerHour": 1000,
           "RequireEmailVerification": True, "TermsVersion": "2026-11-17"},
  "Admin": {"Email": admin_email, "Password": admin_password},
  "Email": {"Provider": "File", "FromName": "Mux Cloud", "FromAddress": "hello@latticetech.ai",
            "SupportAddress": "hello@latticetech.ai", "File": {"Directory": f"{work}/cloud/email"}},
  "Tunnel": {"HeartbeatSeconds": 5, "MissedHeartbeats": 3, "HandshakeTimeoutSeconds": 15, "MaxConcurrentStreams": 32,
             "MaxRequestBodyBytes": 8388608, "FirstByteTimeoutSeconds": 30, "MaxHandshakeFailures": 10,
             "HandshakeFailureWindowSeconds": 900, "DrainRetryAfterSeconds": 5},
  "Telemetry": {"Enable": False},
}
json.dump(config, open(f"{work}/cloud/muxcloud.json", "w"), indent=2)
PY

log "Starting the scripted model on $LLM_PORT"
python3 "$ROOT/scripts/e2e/fake-llm.py" "$LLM_PORT" >"$WORK/fake-llm.log" 2>&1 &
LLM_PID=$!

log "Starting MuxCloud.Server on $CLOUD_PORT"
(cd "$WORK/cloud" && exec dotnet "$WORK/server/MuxCloud.Server.dll" --config "$WORK/cloud/muxcloud.json") >"$WORK/cloud/stdout.log" 2>&1 &
SERVER_PID=$!
for _ in $(seq 1 60); do
  curl -sf -o /dev/null "http://127.0.0.1:$CLOUD_PORT/login" && break
  kill -0 "$SERVER_PID" 2>/dev/null || fail "the server exited; see $WORK/cloud/stdout.log"
  sleep 0.5
done
curl -sf -o /dev/null "http://127.0.0.1:$CLOUD_PORT/login" || fail "the server did not start; see $WORK/cloud/stdout.log"

log "Running Playwright (tests/e2e-real)"
cd "$DASH"
MUXCLOUD_E2E_BASE_URL="http://127.0.0.1:$CLOUD_PORT" \
MUXCLOUD_REAL_OUTBOX="$WORK/cloud/email" \
MUXCLOUD_REAL_MUX="$WORK/mux/Mux.Cli" \
MUXCLOUD_REAL_WORKDIR="$WORK/run" \
MUXCLOUD_REAL_LLM_URL="http://127.0.0.1:$LLM_PORT/v1" \
MUXCLOUD_REAL_PORT_A="$MUX_A_PORT" \
MUXCLOUD_REAL_PORT_B="$MUX_B_PORT" \
MUXCLOUD_REAL_ADMIN_EMAIL="$ADMIN_EMAIL" \
MUXCLOUD_REAL_ADMIN_PASSWORD="$ADMIN_PASSWORD" \
MUXCLOUD_REAL_HEARTBEAT_SECONDS=5 \
  npx playwright test tests/e2e-real --reporter=list "$@"
log "All end-to-end scenarios passed"
