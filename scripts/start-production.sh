#!/usr/bin/env bash
# Start production builds (Mode A). From repo root after: pnpm install && pnpm build && pnpm db:setup
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f apps/api/dist/index.js ]]; then
  echo "Missing build output. Run: pnpm build" >&2
  exit 1
fi

mkdir -p data storage

echo "Starting API (4000), worker, and web (3000). Ctrl+C stops all."
trap 'kill 0' EXIT INT TERM

pnpm --filter @asv/api start &
sleep 2
pnpm --filter @asv/worker start &
sleep 1
pnpm --filter @asv/web start &
wait
