import { NextResponse } from "next/server";
import { Not, IsNull } from "typeorm";
import { requireAdmin } from "@/lib/admin";
import { repo, Device } from "@/infra/db";
import { sendExpoPush } from "@/infra/push/expo";

export const dynamic = "force-dynamic";

export async function POST(): Promise<Response> {
  await requireAdmin();

  const deviceRepo = await repo(Device);
  const devices = await deviceRepo.find({
    where: { pushToken: Not(IsNull()) },
    order: { lastHeartbeatAt: "DESC" },
  });

  const tokens = devices
    .map((d) => d.pushToken)
    .filter((t): t is string => !!t && t.startsWith("ExponentPushToken"));

  if (tokens.length === 0) {
    return NextResponse.json({
      sent: 0,
      failed: 0,
      total: 0,
      message: "No hay dispositivos con token push registrado",
    });
  }

  const messages = tokens.map((to) => ({
    to,
    title: "Cupet Watcher — prueba",
    body: "Simulación de cupet nuevo. Si ves esto, las notificaciones funcionan.",
    sound: "default" as const,
    priority: "high" as const,
    data: { type: "TEST", ts: String(Date.now()) },
  }));

  const results = await sendExpoPush(messages);
  const sent = results.filter((r) => r.ok).length;
  const failed = results.length - sent;

  return NextResponse.json({
    sent,
    failed,
    total: tokens.length,
    message:
      sent > 0
        ? `Enviadas ${sent} de ${tokens.length} notificaciones`
        : "No se pudo enviar ninguna notificación",
    errors: results.filter((r) => !r.ok).map((r) => r.error).slice(0, 5),
  });
}
