# Cupet Watcher v2 — Distributed Watcher Architecture

> Plan, not code. Decided 2026-06-25.

## 0. The core problem

The whole v1 design scrapes `ticket.xutil.net` **server-side** (`getScraperToken()` →
US/EU datacenter IP). The ticket API only accepts **Cuban (ETECSA) IPs**. So every
server-side fetch is blocked. No VPN solves this for free — there are no Cuban exit
nodes, and Proton's "Cuba" servers are *virtual* (geo-IP only, not ETECSA ASN).

**Solution:** the only machines with real Cuban IPs are our *users' phones*. So the
phones do the fetching. The backend coordinates and notifies, but **never touches
ticket**.

### The second wall: CORS (why it must be a native app)

A Cuban user opening our **web** in a browser also has a Cuban IP — but browser JS
**cannot** read cross-origin responses from `ticket.xutil.net` (no
`Access-Control-Allow-Origin` for our domain; `Authorization` + JSON body force a
preflight ticket won't honor). The Cuban IP is *necessary but not sufficient*. A
**native app has no CORS sandbox** and can send the browser-mimic headers freely.

| Client | Cuban IP | Can fetch ticket? |
|---|---|---|
| Android native app | ✅ | ✅ (no CORS) |
| Browser extension | ✅ | ✅ (host permissions) |
| Plain web page | ✅ | ❌ (CORS) |

→ **Android app = the worker/fetcher. Web = read-only + alerts (for iOS & everyone).**

---

## 1. Decisions locked

| Topic | Decision |
|---|---|
| Mobile stack | **Expo + dev client** (config plugin / native module for foreground service) |
| Backend | **Reuse & refactor** existing Next.js + TypeORM + Postgres |
| User data stored | **Minimal**: push token + watchlist (provinces/stations). No ticket creds server-side. |
| Web/iOS alerts | **Web Push (PWA, iOS 16.4+) + email fallback** |
| Ticket login | Each user logs in with **their own** ticket account. Token lives **only on the phone** (SecureStore). |
| Availability data | Assumed **global per station** (one worker's fetch is valid for all). Confirm; if per-account, coordinator changes. |

---

## 2. Components

```
┌─────────────────────────────┐         ┌──────────────────────────────┐
│  Android app (Expo)         │         │  Backend (Next.js, US/EU)    │
│  = WORKER, Cuban IP ✅      │         │  = COORDINATOR, never hits   │
│                             │  WS ⇄   │     ticket                   │
│  • login ticket (own acct)  │◀───────▶│  • device registry           │
│  • token in SecureStore     │ command │  • assign work + failover    │
│  • foreground service       │ channel │  • ingest public snapshots   │
│  • fetch assigned stations  │         │  • detection engine          │
│  • POST public snapshots ───┼────────▶│  • dispatch alerts           │
│  • receive user alerts      │         │     (FCM / WebPush / email)  │
└─────────────────────────────┘         └───────────────┬──────────────┘
                                                         │ reads DB
                                         ┌───────────────▼──────────────┐
                                         │  Web (Next.js PWA)           │
                                         │  read-only dashboard         │
                                         │  Web Push subscribe          │
                                         │  iOS users live here         │
                                         └──────────────────────────────┘
```

**Command channel = phone-initiated WebSocket / long-poll (NOT FCM).** Outbound from
the phone → passes ETECSA CGNAT, no inbound port, **no dependency on Google reachability
in Cuba**. The foreground service keeps the socket open. FCM/WebPush/email are used only
for *end-user alerts*, not for the worker loop.

---

## 3. Refactor map (what dies / stays / is new)

### DIES (server can't reach ticket)
- `src/infra/xutil/token-store.ts` → `getScraperToken()` and `ScraperCredential` entity
- `XUTIL_SCRAPER_USER` / `XUTIL_SCRAPER_PASS` env
- `src/jobs/scrape-availability.ts`, `scrape-catalog.ts`, `ingest-user-queues.ts`
  (as *server* jobs calling ticket — logic moves to the phone)
- Server-side `createXutilClient()` calls in `run-check-cycle.ts`
- `XutilLink.encryptedToken` / `encryptedRefreshToken` (token no longer stored server-side;
  keep `xutilUsername` only as a link/label, or drop the table entirely)

### STAYS (reused)
- Entities: `Station`, `StationSnapshot`, `DetectionEvent`, `Notification`, `AppUser`,
  `UserProvince`, `Province`
- **Detection logic** — runs server-side but is now *fed by phone-submitted snapshots*
  instead of server scraping
- `send-notifications.ts` — extended from email-only to push + webpush + email
- NextAuth web auth
- `src/infra/xutil/client.ts` logic — **ported to the app** (TS → RN fetch, no rewrite)

### NEW
- `Device` entity: `deviceId`, `userId`, `commandToken` (device JWT), `pushToken`,
  `lastHeartbeatAt`, `ticketLinked` (bool), `online`
- `Assignment` tracking (table or Redis): `assignmentId`, `deviceId`, `stationIds[]`,
  `status`, `expiresAt` → enables **failover**
- Coordinator job: pick online+ticketLinked device → send command over WS → await result
  → on timeout reassign to another device
- Ingest endpoint: `POST /api/ingest/snapshot` (device-authenticated) → validate → store → detect
- Heartbeat / WS gateway: `GET /api/devices/socket` (or `POST /api/devices/heartbeat` for long-poll)
- Push infra: FCM admin (app alerts), Web Push VAPID (PWA), keep Resend (email)
- The RN app package (separate folder/repo, e.g. `apps/mobile`)

---

## 4. The phone worker (port of the xutil client)

Port `createXutilClient` to the app — RN `fetch` allows arbitrary headers and has **no
CORS**, so the existing browser-mimic headers work as-is:
- `login()` — OAuth password grant, password base64-encoded, `OAUTH_BASIC` + `app` header
- `getServicioDetail(id)` — the per-station availability read (core of the watcher)
- `sweepAllServices()` / `getServicesPage()` — catalog (run rarely)
- `getProvincias()`, `getPosicionVisual()` — as needed

Storage & lifecycle:
- Ticket token → **expo-secure-store**, never sent to backend
- **Foreground service** (Android, via Expo config plugin / native module) holds the
  process + WebSocket alive and runs assigned fetches
- Data-cost aware: only fetch *assigned* batches; configurable interval; coordinator
  spreads load so each phone does little

---

## 5. Coordination protocol

1. **Register**: app → backend with `deviceId`, `pushToken`, `userId`; backend issues a
   `commandToken` (device-scoped JWT). App reports `ticketLinked` once user logs into ticket.
2. **Connect**: app opens WebSocket (foreground service). Backend marks device `online`.
   Heartbeat keeps it alive; missed heartbeats → `online = false`.
3. **Assign** (coordinator cycle, e.g. every N min — short for "grab it fast"):
   partition the watched-station set across online+ticketLinked devices. Send
   `{ assignmentId, stationIds }` over each device's socket.
4. **Execute**: device fetches each `getServicioDetail`, POSTs snapshots with `assignmentId`.
5. **Failover**: no result within `T` seconds → mark assignment stale → reassign to another
   online device.
6. **Idempotency**: snapshots keyed `stationId + ts`; detection is idempotent; duplicate
   submissions from overlapping devices are deduped.

---

## 6. Detection + notification flow

- On snapshot ingest → compare to last snapshot for that station → emit `DetectionEvent`
  on transition: `NEW` station, `BECAME_AVAILABLE`, `WAITROOM_ENABLED` (existing enum).
- `send-notifications` per event → find subscribers by **province + pref** (existing
  query) → dispatch on the user's channel:
  - Android app user → **FCM alert** (or over the live WS if open)
  - Web/PWA user → **Web Push**
  - fallback / no push → **email** (Resend)
- Extend `Notification.channel` enum: add `PUSH`, `WEBPUSH` (already has `EMAIL`).

**Network-effect payoff:** detection only needs *one* Cuban worker to see the change; the
backend then alerts *everyone* (incl. iOS web users) instantly. The Android fleet rescues
iOS's weak background.

---

## 7. Data model changes (minimal user data)

- `AppUser`: keep `email`, notify prefs, `provinces` (watchlist). 
- `Device` (new): FCM/push token + command auth, online state, `ticketLinked`.
- `WebPushSubscription` (new, or JSON on AppUser): endpoint + keys for PWA users.
- `XutilLink`: drop stored token columns; ticket token stays on phone only.
- **Never** store ticket credentials server-side.

---

## 8. Security

- **Device auth**: `commandToken` (JWT) tied to `AppUser`; required on WS connect, ingest,
  heartbeat.
- **Don't trust client data blindly**: schema-validate snapshots, rate-limit per device,
  sanity bounds, anomaly checks. (Optional later: *quorum* — require 2 devices to agree
  before trusting a high-value detection.)
- **Ticket token isolation**: lives in SecureStore on the phone, never transmitted to backend.
- **Account-ban protection**: spread load (each phone does few requests), jittered timing,
  honor the existing 429 backoff — don't make any single user's ticket account look abusive.

---

## 9. Background execution reality

- **Android**: foreground service + persistent notification → reliable WS + polling. This
  is the supported path; Cuba is Android-dominant.
- **iOS**: **out of scope as a worker.** iOS users use the web/PWA (read + alerts only).
- Battery/data: configurable interval, assigned-batches-only, coordinator load-spreading.

---

## 10. Roadmap (phases)

- **Phase 0 — Backend refactor**: rip out server-side scraping (`getScraperToken`,
  scrape jobs, scraper creds). Add `Device` entity, ingest + heartbeat/WS gateway,
  coordinator skeleton. Keep detection + extend notifications.
- **Phase 1 — App MVP**: Expo dev client, ticket login, token in SecureStore, manual
  fetch of one station, POST snapshot to ingest.
- **Phase 2 — Coordination**: WS command channel, heartbeat, foreground service,
  assignment + failover.
- **Phase 3 — Notifications**: FCM alerts to app, Web Push PWA, email fallback; channel
  routing in `send-notifications`.
- **Phase 4 — Hardening**: snapshot validation, anti-abuse, quorum, battery/data tuning,
  store-policy compliance.

---

## 11. TOP RISKS — validate BEFORE building (highest first)

1. **Does ticket login + fetch work from a real Cuban *mobile* IP with these headers from
   RN `fetch`?** If the mobile flow differs (captcha, different client id, device check),
   the whole worker design shifts. **Spike this first on a real Cuban Android device.**
2. **Is FCM/Google reliably reachable over ETECSA?** If not, app *alerts* must fall back to
   the live WS + Web Push + email. (Worker commands already avoid FCM via the outbound WS —
   that decision exists *because* of this risk.)
3. **Expo foreground-service + persistent WebSocket** behavior under Android Doze /
   battery optimization on low-end ETECSA devices.
4. **Store policies**: a background-data-collecting app may need disclosure / review on
   Play Store.
5. **Cold start / coverage**: with few users, station coverage is sparse and detection
   slow. Product concern; mitigated as the fleet grows.

---

## Next concrete step

Spike Risk #1: a throwaway script/app run on a real Cuban Android device that does
`login()` → `getServicioDetail()` and prints the result. If that returns valid data,
the architecture is green-lit. If it 403s or needs a captcha, we adjust before writing
anything else.
