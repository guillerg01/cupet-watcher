# Cupet Watcher — Mobile (Android worker)

Expo app. Each phone is a **worker node**: it logs into ticket with the user's own
account (Cuban IP), and on the coordinator's assignment fetches station detail and
posts public snapshots back. The ticket token never leaves the device.

See the architecture in [`../../docs/ARCHITECTURE-v2-distributed-watcher.md`](../../docs/ARCHITECTURE-v2-distributed-watcher.md).

## Setup

This folder ships source files + a starting `package.json`. Pin native versions to
your installed Expo SDK before running:

```bash
cd apps/mobile
npm install
npx expo install   # aligns expo-* + react-native versions to the SDK
```

If `expo/tsconfig.base` is missing, run `npx expo customize tsconfig.json` once.

### Point the app at your backend

- Android emulator → backend on host = `http://10.0.2.2:3000` (default in `app.json`).
- Real device → set your machine's LAN IP or deployed URL:

```bash
EXPO_PUBLIC_BACKEND_URL=http://192.168.1.50:3000 npx expo start
```

### Run

```bash
npx expo start          # dev (Expo Go is fine for the foreground flow)
# Background fetch + foreground service need a dev build:
npx expo run:android
```

## Flow (matches the backend contract)

1. **Register device** — app email + password (your `AppUser`, bcrypt-verified by
   `/api/devices/register`). Returns a `commandToken` stored in SecureStore.
2. **Login ticket** — your own ticket.xutil credentials. Token stored locally only;
   sets `ticketLinked` via heartbeat.
3. **Run cycle** — `heartbeat → poll assignment → fetch detail (Cuban IP) → ingest`.

## ⚠️ Background execution — important

`src/worker/background.ts` uses `expo-background-fetch`: **opportunistic, ~15 min
minimum, OS-throttled**. Good enough to prove the flow, NOT for "grab it fast".

For reliable short-interval polling on Android, replace it with a **foreground
service** (persistent notification) that calls `runWorkerCycle()` on a short
interval. Suggested: `@notifee/react-native` or `react-native-foreground-service`
via a config plugin. The cycle logic in `src/worker/cycle.ts` does not change —
only how often / how reliably it is invoked.

iOS cannot be a reliable worker; iOS users use the web/PWA (read + alerts only).

## Files

| File | Role |
|---|---|
| `src/lib/ticket-client.ts` | Port of the server xutil client (login + station detail) |
| `src/lib/base64.ts` | Pure base64 (no Buffer/btoa in RN) |
| `src/lib/secure-store.ts` | Ticket token + device creds in the keystore |
| `src/lib/backend-api.ts` | Coordinator API (register/heartbeat/poll/ingest) |
| `src/worker/cycle.ts` | One worker cycle |
| `src/worker/background.ts` | Background task registration (+ foreground TODO) |
| `App.tsx` | Minimal UI: register, ticket login, run cycle, toggle worker |
