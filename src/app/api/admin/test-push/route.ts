import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { repo, Device } from "@/infra/db";
import { sendExpoPush } from "@/infra/push/expo";
import { appendToQueue, newPendingPush } from "@/lib/push-queue";

export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  await requireAdmin();

  const body = await req.json().catch(() => ({}));
  const count = Math.min(Math.max(Number((body as { count?: number }).count) || 1, 1), 5);

  const deviceRepo = await repo(Device);
  const devices = await deviceRepo.find({
    where: { ticketLinked: true },
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

  const tokens = devices
    .map((d) => d.pushToken)
    .filter((t): t is string => !!t && t.startsWith("ExponentPushToken"));

  let expoSent = 0;
  if (tokens.length > 0) {
    const messages = tokens.flatMap((to) =>
      Array.from({ length: count }, (_, i) => ({
        to,
        title: "Cupet Watcher — prueba",
        body: `Alerta Expo ${i + 1}/${count}`,
        sound: "default" as const,
        priority: "high" as const,
        data: { type: "TEST", ts: String(now + i) },
      })),
    );
    const results = await sendExpoPush(messages);
    expoSent = results.filter((r) => r.ok).length;
  }

  return NextResponse.json({
    queued,
    devices: devices.length,
    perDevice: count,
    expoSent,
    expoTotal: tokens.length * count,
    message:
      devices.length > 0
        ? `Encoladas ${count} notificación(es) en ${devices.length} dispositivo(s). La app las recibe en heartbeats (~15s).`
        : "No hay dispositivos con ticket vinculado",
  });
}
