#!/bin/sh
set -e
echo "[web] Running prisma db push..."
npx prisma db push --skip-generate
echo "[web] Seeding provinces..."
npx tsx prisma/seed.ts || true
echo "[web] Starting cron worker in background..."
npx tsx worker.ts &
echo "[web] Starting Next.js..."
exec npx next start -p "${PORT:-3000}"
