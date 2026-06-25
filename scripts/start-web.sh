#!/bin/sh
set -e
echo "[web] Syncing database schema..."
npx tsx scripts/sync-db.ts
echo "[web] Seeding admin if configured..."
npx tsx scripts/seed-admin.ts || true
echo "[web] Starting cron worker in background..."
npx tsx worker.ts &
echo "[web] Starting Next.js..."
exec npx next start -p "${PORT:-3000}"
