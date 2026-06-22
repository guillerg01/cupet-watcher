# Cupet Watcher

Monitorea estaciones de combustible ("cupets") en `ticket.xutil.net`, detecta cupets **nuevos / recién disponibles** por provincia, **avisa por email** a los usuarios suscriptos, y genera **analítica + predicción** del mejor momento para coger gasolina (menos cola).

> ⚠️ App de **notificación y analítica** sobre un servicio de terceros. No reserva automáticamente. Usar con responsabilidad y respetando los términos del sitio. Rotá cualquier credencial que se haya expuesto.

## Stack
- **Next.js 15** (App Router, React 19 + React Compiler) + **Tailwind v4**
- **PostgreSQL** + **Prisma 6**
- **Auth.js v5** (credenciales propias)
- **Resend** (email)
- **node-cron** en un proceso **worker** aparte
- **Docker** (web + worker + postgres). Deploy: Railway / Fly.io

## Arquitectura (screaming / hexagonal)
```
src/
  core/         # dominio puro (station, detection, prediction) — sin framework
  infra/        # xutil client, prisma, resend, crypto, token-store
  app/          # Next App Router (auth, dashboard, analytics, predict, settings)
  jobs/         # scrape-catalog, scrape-availability, ingest-user-queues, send-notifications, compute-prediction
  env.ts        # validación de entorno (zod)
worker.ts       # scheduler node-cron (proceso separado del web)
prisma/         # schema + seed (16 provincias)
```

## Cómo detecta "cupet nuevo"
`core/detection/detect.ts` (función pura): compara el catálogo previo vs el actual.
- `id` nuevo → **NEW**
- `disponibilidades` 0 → >0 → **BECAME_AVAILABLE**
- `admite_sala_espera_virtual` false → true → **WAITROOM_ENABLED**

## Setup local
```bash
cp .env.example .env          # completá DATABASE_URL, XUTIL_SCRAPER_USER/PASS, RESEND_API_KEY, ENCRYPTION_KEY, AUTH_SECRET
docker compose up -d db        # postgres local
npm install
npm run db:push                # crea schema
npm run db:seed                # carga las 16 provincias
npm run dev                    # web -> http://localhost:3000
npm run worker                 # cron en otra terminal
```

### Correr un job una vez (debug)
```bash
npm run scrape:once -- catalog       # barrido catálogo + detección
npm run scrape:once -- availability  # snapshots de disponibilidad
npm run scrape:once -- notify        # envía notificaciones pendientes
npm run scrape:once -- predict       # recalcula predicción
```

## Docker (todo junto)
```bash
docker compose up --build
```
Levanta `db`, `web` (Next standalone) y `worker` (cron).

## Variables de entorno
Ver `.env.example`. Claves:
- `XUTIL_SCRAPER_USER` / `XUTIL_SCRAPER_PASS` — cuenta scraper (catálogo público).
- `ENCRYPTION_KEY` — AES-256-GCM (32 bytes base64) para cifrar tokens. `openssl rand -base64 32`.
- `AUTH_SECRET` — Auth.js. `openssl rand -base64 32`.
- `RESEND_API_KEY` + `EMAIL_FROM` (dominio verificado en Resend).

## Crons (configurables por env)
| Job | Default | Qué hace |
|-----|---------|----------|
| `runScrapeCatalog` | `0 * * * *` (1h) | detecta cupets nuevos/disponibles |
| `runScrapeAvailability` + `runIngestUserQueues` | `*/20 * * * *` | snapshots disponibilidad + posición de cola |
| `runSendNotifications` | `*/2 * * * *` | manda emails pendientes |
| `runComputePrediction` | `0 */6 * * *` | recalcula mejor-hora |
