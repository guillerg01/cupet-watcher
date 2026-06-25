import Constants from "expo-constants";

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string>;

/**
 * Backend (coordinator) base URL.
 * - Android emulator → host machine is 10.0.2.2
 * - Real device on LAN → set EXPO_PUBLIC_BACKEND_URL or app.json extra.backendUrl
 * - Production → your deployed coordinator URL
 */
export const BACKEND_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL ?? extra.backendUrl ?? "http://10.0.2.2:3000";

// ticket.xutil.net constants — mirror of the server's xutil client.
// These were validated working from a Cuban IP. A native app has no CORS, so the
// same browser-mimic headers work directly.
export const TICKET = {
  base: "https://ticket.xutil.net/apps/bienestar/api",
  oauthUrl: "https://ticket.xutil.net/oauth2/token",
  appHeader: "agencia-citas",
  oauthBasic:
    "Basic NloyWGNna01Ra1h0VVdDeHk2eTdlT0syWklBYTpXSGtqTDc4dFVIbHdNUGo3ZmRfRkY1a1UyaElh",
  userAgent:
    "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Mobile Safari/537.36",
};

export const POLL_INTERVAL_MS = 60_000;
export const HEARTBEAT_INTERVAL_MS = 2 * 60_000;
