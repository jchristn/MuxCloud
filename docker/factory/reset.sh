#!/usr/bin/env bash
# Factory reset: removes containers, volumes, data, logs, and email, and restores the default muxcloud.json.
set -euo pipefail
cd "$(dirname "$0")/.."
read -r -p "Type RESET to delete all Mux Cloud data: " confirm
if [ "$confirm" != "RESET" ]; then
  echo "Cancelled."
  exit 1
fi
docker compose down -v
rm -rf data logs email-outbox
cp factory/muxcloud.json muxcloud.json
echo "Factory reset complete."
