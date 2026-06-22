# --- Base ---
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# --- Dependencies ---
FROM base AS deps
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci

# --- Builder (Next standalone) ---
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# prisma generate doesn't need a live DB — only reads schema
RUN npx prisma generate
RUN npm run build

# --- Web runner (Next.js) ---
FROM base AS web
ENV NODE_ENV=production
RUN addgroup -g 1001 nodejs && adduser -u 1001 -G nodejs -S nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
CMD ["node", "server.js"]

# --- Worker runner (cron + migrations) ---
FROM base AS worker
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY . .
RUN chmod +x ./scripts/start-worker.sh
CMD ["sh", "./scripts/start-worker.sh"]
