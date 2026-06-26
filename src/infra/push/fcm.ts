export interface FcmPushResult {
  ok: boolean;
  status: number;
  error?: string;
}

export async function sendFcmPush(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<FcmPushResult[]> {
  const key = process.env.FCM_SERVER_KEY?.trim();
  if (!key || tokens.length === 0) {
    return tokens.map(() => ({ ok: false, status: 0, error: "fcm_not_configured" }));
  }

  const results: FcmPushResult[] = [];
  const BATCH = 500;

  for (let i = 0; i < tokens.length; i += BATCH) {
    const batch = tokens.slice(i, i + BATCH);
    try {
      const res = await fetch("https://fcm.googleapis.com/fcm/send", {
        method: "POST",
        headers: {
          Authorization: `key=${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          registration_ids: batch,
          notification: {
            title,
            body,
            sound: "default",
          },
          data: data ?? { type: "CUPET_ALERT" },
          priority: "high",
          android: { priority: "high" },
        }),
      });

      const json = (await res.json().catch(() => null)) as {
        success?: number;
        failure?: number;
        results?: Array<{ error?: string }>;
      } | null;

      const perToken: Array<{ error?: string }> =
        json?.results ?? batch.map(() => ({} as { error?: string }));
      for (let j = 0; j < batch.length; j++) {
        const err = perToken[j]?.error;
        results.push({
          ok: res.ok && !err,
          status: res.status,
          error: err,
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      for (let j = 0; j < batch.length; j++) {
        results.push({ ok: false, status: 0, error: msg });
      }
    }
  }

  return results;
}

export function isFcmDeviceToken(token: string): boolean {
  return !token.startsWith("ExponentPushToken");
}
