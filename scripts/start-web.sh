#!/bin/sh
set -e
echo "[start-web] Running prisma db push..."
npx prisma db push --skip-generate
echo "[start-web] Running seed..."
npx tsx prisma/seed.ts || true
echo "[start-web] Starting Next.js..."
node server.js
