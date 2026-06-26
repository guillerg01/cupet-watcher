export interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  sound?: "default" | null;
  priority?: "default" | "normal" | "high";
}

export interface ExpoPushResult {
  ok: boolean;
  status: number;
  data?: unknown;
  error?: string;
}

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

export async function sendExpoPush(messages: ExpoPushMessage[]): Promise<ExpoPushResult[]> {
  if (messages.length === 0) return [];

  const res = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(messages),
  });

  const json = (await res.json().catch(() => null)) as { data?: unknown[]; errors?: unknown } | null;

  if (!res.ok) {
    return messages.map(() => ({
      ok: false,
      status: res.status,
      error: JSON.stringify(json?.errors ?? json).slice(0, 200),
    }));
  }

  const tickets = Array.isArray(json?.data) ? json.data : [];
  return messages.map((_, i) => {
    const ticket = tickets[i] as { status?: string; message?: string; details?: unknown } | undefined;
    const ok = ticket?.status === "ok";
    return {
      ok,
      status: res.status,
      data: ticket,
      error: ok ? undefined : (ticket?.message ?? "push failed"),
    };
  });
}
