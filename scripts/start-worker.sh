#!/bin/sh
set -e
echo "[worker] Running prisma db push..."
npx prisma db push --skip-generate
echo "[worker] Running seed..."
npx tsx prisma/seed.ts || true
echo "[worker] Starting cron worker..."
exec npx tsx worker.ts
