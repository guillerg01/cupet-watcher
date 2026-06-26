import { sendExpoPush } from "@/infra/push/expo";
import { sendFcmPush, isFcmDeviceToken } from "@/infra/push/fcm";

export async function sendDevicePush(input: {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
}): Promise<{ expoSent: number; fcmSent: number }> {
  const expoTokens = input.tokens.filter((t) => t.startsWith("ExponentPushToken"));
  const fcmTokens = input.tokens.filter((t) => isFcmDeviceToken(t) && t.length > 20);

  let expoSent = 0;
  if (expoTokens.length > 0) {
    const messages = expoTokens.map((to) => ({
      to,
      title: input.title,
      body: input.body,
      sound: "default" as const,
      priority: "high" as const,
      data: input.data ?? { type: "CUPET_ALERT" },
    }));
    const results = await sendExpoPush(messages);
    expoSent = results.filter((r) => r.ok).length;
  }

  let fcmSent = 0;
  if (fcmTokens.length > 0) {
    const results = await sendFcmPush(fcmTokens, input.title, input.body, input.data);
    fcmSent = results.filter((r) => r.ok).length;
  }

  return { expoSent, fcmSent };
}
