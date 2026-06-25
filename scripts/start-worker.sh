#!/bin/sh
set -e
echo "[worker] Syncing database schema..."
npx tsx scripts/sync-db.ts
echo "[worker] Seeding province catalog (xutil IDs)..."
npx tsx scripts/seed.ts || true
echo "[worker] Starting cron worker..."
exec npx tsx worker.ts
