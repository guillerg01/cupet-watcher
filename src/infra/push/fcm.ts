import { JWT } from "google-auth-library";

export interface FcmPushResult {
  ok: boolean;
  status: number;
  error?: string;
}

// FCM HTTP v1. The legacy `fcm.googleapis.com/fcm/send` + `Authorization: key=`
// endpoint was shut down by Google on 2024-06-20, so we authenticate with a
// service-account JWT (OAuth2) and POST one message per token to the v1 API.
//
// Config (Render env): FCM_SERVICE_ACCOUNT = the service-account JSON, either
// raw JSON or base64-encoded. Generate it in Firebase Console → Project
// Settings → Service accounts → "Generate new private key".

interface ServiceAccount {
  client_email: string;
  private_key: string;
  project_id: string;
}

const SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
const ALERT_CHANNEL_ID = "cupet-alerts";

let cached: { sa: ServiceAccount; jwt: JWT } | null = null;

function loadServiceAccount(): ServiceAccount | null {
  const raw = process.env.FCM_SERVICE_ACCOUNT?.trim();
  if (!raw) return null;
  try {
    const json = raw.startsWith("{")
      ? raw
      : Buffer.from(raw, "base64").toString("utf8");
    const sa = JSON.parse(json) as ServiceAccount;
    if (!sa.client_email || !sa.private_key || !sa.project_id) return null;
    // Render stores newlines as the literal "\n" — restore them for the PEM.
    sa.private_key = sa.private_key.replace(/\\n/g, "\n");
    return sa;
  } catch {
    return null;
  }
}

function getClient(): { sa: ServiceAccount; jwt: JWT } | null {
  if (cached) return cached;
  const sa = loadServiceAccount();
  if (!sa) return null;
  const jwt = new JWT({
    email: sa.client_email,
    key: sa.private_key,
    scopes: [SCOPE],
  });
  cached = { sa, jwt };
  return cached;
}

/** FCM v1 rejects tokens that are uninstalled/stale — surface so callers can prune. */
function isUnrecoverable(error?: string): boolean {
  if (!error) return false;
  return (
    error.includes("UNREGISTERED") ||
    error.includes("NOT_FOUND") ||
    error.includes("INVALID_ARGUMENT")
  );
}

// Shared: authenticate once, then POST one message per token (v1 has no
// multicast). `buildMessage` returns the per-token message body.
async function postFcmMessages(
  tokens: string[],
  buildMessage: (token: string) => Record<string, unknown>,
): Promise<FcmPushResult[]> {
  if (tokens.length === 0) return [];

  const client = getClient();
  if (!client) {
    return tokens.map(() => ({ ok: false, status: 0, error: "fcm_not_configured" }));
  }

  const { sa, jwt } = client;
  let accessToken: string | null | undefined;
  try {
    const tok = await jwt.getAccessToken();
    accessToken = tok.token;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return tokens.map(() => ({ ok: false, status: 0, error: `auth_failed: ${msg}` }));
  }
  if (!accessToken) {
    return tokens.map(() => ({ ok: false, status: 0, error: "no_access_token" }));
  }

  const url = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  return Promise.all(
    tokens.map(async (token): Promise<FcmPushResult> => {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify({ message: buildMessage(token) }),
        });
        if (res.ok) return { ok: true, status: res.status };
        const json = (await res.json().catch(() => null)) as {
          error?: { status?: string; message?: string };
        } | null;
        const error = json?.error?.status ?? json?.error?.message ?? `http_${res.status}`;
        return { ok: false, status: res.status, error };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return { ok: false, status: 0, error: msg };
      }
    }),
  );
}

/** Visible alert push (notification + data, MAX priority). */
export async function sendFcmPush(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<FcmPushResult[]> {
  return postFcmMessages(tokens, (token) => ({
    token,
    notification: { title, body },
    data: data ?? { type: "CUPET_ALERT" },
    android: {
      priority: "HIGH",
      notification: {
        sound: "default",
        channel_id: ALERT_CHANNEL_ID,
        notification_priority: "PRIORITY_MAX",
      },
    },
  }));
}

/**
 * Data-only, high-priority message. No `notification` block, so Android wakes
 * the app's background handler (headless) instead of showing a tray entry —
 * this is how the coordinator tells a closed device to run a sweep.
 */
export async function sendFcmData(
  tokens: string[],
  data: Record<string, string>,
): Promise<FcmPushResult[]> {
  return postFcmMessages(tokens, (token) => ({
    token,
    data,
    android: { priority: "HIGH" },
  }));
}

export { isUnrecoverable as isUnrecoverableFcmError };

export function isFcmDeviceToken(token: string): boolean {
  return !token.startsWith("ExponentPushToken");
}
