import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { repo, Device } from "@/infra/db";
import { sendExpoPush } from "@/infra/push/expo";

export const dynamic = "force-dynamic";

const TEST_TITLE = "Cupet Watcher — prueba";
const TEST_BODY =
  "Simulación de cupet nuevo. Si ves esto, las notificaciones funcionan.";

export async function POST(): Promise<Response> {
  await requireAdmin();

  const deviceRepo = await repo(Device);
  const devices = await deviceRepo.find({
    where: { ticketLinked: true },
    order: { lastHeartbeatAt: "DESC" },
  });

  let queued = 0;
  for (const d of devices) {
    await deviceRepo.update(d.id, {
      pendingPush: { title: TEST_TITLE, body: TEST_BODY },
    });
    queued++;
  }

  const tokens = devices
    .map((d) => d.pushToken)
    .filter((t): t is string => !!t && t.startsWith("ExponentPushToken"));

  let expoSent = 0;
  if (tokens.length > 0) {
    const messages = tokens.map((to) => ({
      to,
      title: TEST_TITLE,
      body: TEST_BODY,
      sound: "default" as const,
      priority: "high" as const,
      data: { type: "TEST", ts: String(Date.now()) },
    }));
    const results = await sendExpoPush(messages);
    expoSent = results.filter((r) => r.ok).length;
  }

  return NextResponse.json({
    queued,
    expoSent,
    expoTotal: tokens.length,
    message:
      queued > 0
        ? `Marcados ${queued} dispositivo(s). La app muestra la alerta en el próximo heartbeat (≤1 min).`
        : "No hay dispositivos con ticket vinculado",
  });
}
