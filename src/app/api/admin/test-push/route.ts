import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { repo, Device } from "@/infra/db";
import { appendToQueue, newPendingPush } from "@/lib/push-queue";
import { sendDevicePush } from "@/lib/push-send";

export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const count = Math.min(Math.max(Number((body as { count?: number }).count) || 1, 1), 5);

  const deviceRepo = await repo(Device);
  const devices = await deviceRepo.find({
    order: { lastHeartbeatAt: "DESC" },
  });

  let queued = 0;
  const now = Date.now();
  for (const d of devices) {
    let queue = d.pendingPushQueue ?? [];
    for (let i = 0; i < count; i++) {
      queue = appendToQueue(
        queue,
        newPendingPush(
          "Cupet Watcher — prueba",
          `Alerta ${i + 1}/${count} · ${new Date(now + i * 1000).toLocaleTimeString("es")}`,
        ),
      );
    }
    await deviceRepo.update(d.id, { pendingPushQueue: queue, pendingPush: null });
    queued += count;
  }

  const tokens = [...new Set(devices.map((d) => d.pushToken).filter((t): t is string => !!t))];

  let expoSent = 0;
  let fcmSent = 0;
  if (tokens.length > 0) {
    for (let i = 0; i < count; i++) {
      const r = await sendDevicePush({
        tokens,
        title: "Cupet Watcher — prueba",
        body: `Alerta ${i + 1}/${count}`,
        data: { type: "TEST", ts: String(now + i) },
      });
      expoSent += r.expoSent;
      fcmSent += r.fcmSent;
    }
  }

  return NextResponse.json({
    queued,
    devices: devices.length,
    perDevice: count,
    expoSent,
    fcmSent,
    pushTokens: tokens.length,
    message:
      devices.length > 0
        ? `Encoladas ${count} notificación(es) en ${devices.length} dispositivo(s). Push directo: Expo ${expoSent}, FCM ${fcmSent}.`
        : "No hay dispositivos registrados",
  });
}
