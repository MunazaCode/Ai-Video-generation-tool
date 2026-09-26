#!/bin/sh
set -e
cd /app
mkdir -p /app/data /app/storage

pnpm --filter @asv/api start &
API_PID=$!
sleep 2
pnpm --filter @asv/worker start &
WORKER_PID=$!
sleep 1
pnpm --filter @asv/web start &
WEB_PID=$!

trap 'kill $API_PID $WORKER_PID $WEB_PID 2>/dev/null; wait; exit' INT TERM
wait $API_PID $WORKER_PID $WEB_PID
