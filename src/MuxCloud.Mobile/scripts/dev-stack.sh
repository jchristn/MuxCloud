#!/usr/bin/env bash
# Local Mux Cloud stack for working on the mobile app against real data.
#
#   scripts/dev-stack.sh start    build and start MuxCloud.Server on 127.0.0.1:$PORT (sqlite, file email)
#   scripts/dev-stack.sh run      the same, in the foreground (Ctrl+C stops it)
#   scripts/dev-stack.sh stop     stop it
#   scripts/dev-stack.sh status   is it up
#   scripts/dev-stack.sh verify   print the newest verification link from the email outbox
#   scripts/dev-stack.sh mux NAME [args...]
#                                 run the mux CLI for machine NAME with its own config dir (MUX_CONFIG_DIR)
#   scripts/dev-stack.sh serve NAME PORT
#                                 run machine NAME's mux server on 127.0.0.1:PORT in the background (it connects to
#                                 Mux Cloud once signed in); stop it with: scripts/dev-stack.sh unserve NAME
#
# Environment:
#   MUXCLOUD_REPO   MuxCloud checkout to run the server from (default: the repo this script is in). Use a worktree
#                   when other people are committing to your working tree.
#   MUX_REPO        Mux checkout for the mux CLI (default: ../Mux next to MUXCLOUD_REPO). Mux finds MuxCloud.Protocol
#                   at $MUXCLOUD_REPO through -p:MuxCloudRoot.
#   STACK_DIR       Where data, logs, email, and machine configs go (default: $TMPDIR/muxcloud-dev-stack).
#   PORT            Server port (default 8760, as in docs/LOCAL_TESTING.md).
#
# The iOS simulator reaches the host at http://127.0.0.1:8760. For an Android emulator run
#   adb reverse tcp:8760 tcp:8760
# and use the same URL. In the app: sign-in screen, "Change server", enter the URL.
#
# Enrolling a machine (once per machine, see README "Local stack"):
#   printf '%s' "$PASSWORD" | scripts/dev-stack.sh mux laptop cloud login --server http://127.0.0.1:8760 \
#       --email you@example.com --name laptop --password-stdin
#   scripts/dev-stack.sh serve laptop 8711          # online until: scripts/dev-stack.sh unserve laptop
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MUXCLOUD_REPO="${MUXCLOUD_REPO:-$(cd "$here/../../.." && pwd)}"
MUX_REPO="${MUX_REPO:-$(cd "$MUXCLOUD_REPO/.." && pwd)/Mux}"
STACK_DIR="${STACK_DIR:-${TMPDIR:-/tmp}/muxcloud-dev-stack}"
PORT="${PORT:-8760}"
URL="http://127.0.0.1:$PORT"
pidfile="$STACK_DIR/server.pid"

settings() {
  mkdir -p "$STACK_DIR/data" "$STACK_DIR/logs" "$STACK_DIR/email"
  # Written once: the server adds a generated Auth.SigningKey on first start, and rewriting the file would sign
  # everyone out (and break enrolled machines' sessions) on every restart. Delete STACK_DIR to start over.
  [[ -f "$STACK_DIR/muxcloud.json" ]] && return 0
  cat > "$STACK_DIR/muxcloud.json" <<JSON
{
  "Server": { "PublicUrl": "$URL", "NodeId": "dev-1", "DashboardDirectory": "$MUXCLOUD_REPO/src/MuxCloud.Dashboard/dist", "TrustForwardedHeaders": false, "AdditionalOrigins": [] },
  "Rest": { "Hostname": "127.0.0.1", "Port": $PORT, "Ssl": false },
  "Database": { "Type": "Sqlite", "Filename": "$STACK_DIR/data/muxcloud.db" },
  "Logging": { "ConsoleLogging": true, "FileLogging": true, "LogDirectory": "$STACK_DIR/logs", "LogFilename": "muxcloud.log", "MinimumSeverity": 1, "SyslogServers": [] },
  "Auth": { "RequireEmailVerification": true, "AnonymousRequestsPerHour": 1000 },
  "Admin": { "Email": "admin@muxcloud.local", "Password": "dev-admin-password" },
  "Email": { "Provider": "File", "FromName": "Mux Cloud", "FromAddress": "hello@latticetech.ai", "SupportAddress": "hello@latticetech.ai", "File": { "Directory": "$STACK_DIR/email" } }
}
JSON
}

running() { [[ -f "$pidfile" ]] && kill -0 "$(cat "$pidfile")" 2>/dev/null; }

case "${1:-}" in
  start)
    if running; then echo "Already running (pid $(cat "$pidfile")) at $URL"; exit 0; fi
    settings
    echo "Building MuxCloud.Server from $MUXCLOUD_REPO ..."
    dotnet build "$MUXCLOUD_REPO/src/MuxCloud.Server/MuxCloud.Server.csproj" -c Debug -v q -nologo >/dev/null
    dll="$(ls -d "$MUXCLOUD_REPO"/src/MuxCloud.Server/bin/Debug/net*/MuxCloud.Server.dll | sort -V | tail -1)"
    nohup dotnet "$dll" --config "$STACK_DIR/muxcloud.json" >"$STACK_DIR/logs/console.log" 2>&1 &
    echo $! >"$pidfile"
    for _ in $(seq 1 60); do
      if curl -fsS "$URL/v1.0/api/health" >/dev/null 2>&1; then echo "Mux Cloud is up at $URL (data in $STACK_DIR)"; exit 0; fi
      sleep 1
    done
    echo "The server did not answer on $URL; see $STACK_DIR/logs/console.log" >&2
    exit 1
    ;;
  run)
    settings
    dotnet build "$MUXCLOUD_REPO/src/MuxCloud.Server/MuxCloud.Server.csproj" -c Debug -v q -nologo >/dev/null
    dll="$(ls -d "$MUXCLOUD_REPO"/src/MuxCloud.Server/bin/Debug/net*/MuxCloud.Server.dll | sort -V | tail -1)"
    echo $$ >"$pidfile"
    exec dotnet "$dll" --config "$STACK_DIR/muxcloud.json"
    ;;
  stop)
    if running; then kill "$(cat "$pidfile")"; rm -f "$pidfile"; echo "Stopped."; else echo "Not running."; fi
    ;;
  status)
    if running && curl -fsS "$URL/v1.0/api/health"; then echo; else echo "Not running."; exit 1; fi
    ;;
  verify)
    latest="$(ls -t "$STACK_DIR"/email/* 2>/dev/null | head -1 || true)"
    [[ -n "$latest" ]] || { echo "No email in $STACK_DIR/email yet." >&2; exit 1; }
    grep -Eo 'https?://[^"<> ]+(verify|reset)[^"<> ]*' "$latest" | head -1
    ;;
  mux|serve|unserve)
    cmd="$1"; name="${2:?machine name}"; shift 2
    export MUX_CONFIG_DIR="$STACK_DIR/machines/$name"
    mkdir -p "$MUX_CONFIG_DIR"
    if [[ "$cmd" == "unserve" ]]; then
      mpid="$MUX_CONFIG_DIR/serve.pid"
      if [[ -f "$mpid" ]] && kill -0 "$(cat "$mpid")" 2>/dev/null; then kill "$(cat "$mpid")"; rm -f "$mpid"; echo "Stopped $name."; else echo "$name is not running."; fi
      exit 0
    fi
    dotnet build "$MUX_REPO/src/Mux.Cli/Mux.Cli.csproj" -c Debug -v q -nologo -p:MuxCloudRoot="$MUXCLOUD_REPO" >/dev/null
    mux="$( (ls -d "$MUX_REPO"/src/Mux.Cli/bin/Debug/net*/Mux.Cli.dll 2>/dev/null || true) | sort -V | tail -1)"
    [[ -n "$mux" ]] || { echo "mux CLI build not found under $MUX_REPO/src/Mux.Cli/bin/Debug" >&2; exit 1; }
    if [[ "$cmd" == "serve" ]]; then
      mport="${1:?rest port}"
      # --allow-tools: mutating tools prompt for approval (from the app too) instead of being denied.
      nohup dotnet "$mux" serve --host 127.0.0.1 --port "$mport" --allow-tools >"$MUX_CONFIG_DIR/serve.log" 2>&1 &
      echo $! >"$MUX_CONFIG_DIR/serve.pid"
      echo "$name serving on http://127.0.0.1:$mport (log: $MUX_CONFIG_DIR/serve.log)"
    else
      dotnet "$mux" "$@"
    fi
    ;;
  *)
    sed -n '2,25p' "$0"; exit 2
    ;;
esac
