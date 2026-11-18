#!/usr/bin/env bash
set -euo pipefail

if [ -z "${1:-}" ]; then
    echo "Usage: build-all.sh <docker-image-tag>"
    echo "Example: build-all.sh v0.1.0-alpha"
    exit 1
fi

TAG="$1"

cd "$(dirname "${BASH_SOURCE[0]}")"

./build-server.sh "${TAG}"
