import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { repo, Device, Assignment, AssignmentStatus, AssignmentKind } from "@/infra/db";
import { wakeDeviceForScan } from "@/lib/device-scan-wake";

export const dynamic = "force-dynamic";

const ASSIGNMENT_TTL_MS = 8 * 60 * 1000;

/**
 * Admin "force scan now": for every device with a push token, create a CATALOG
 * assignment and send the SCAN data push. Bypasses the interval gate and the
 * online window on purpose — the whole point is to wake a CLOSED device, which
 * by definition isn't heartbeating.
 */
export async function POST(): Promise<Response> {
  await requireAdmin();

  const deviceRepo = await repo(Device);
  const assignmentRepo = await repo(Assignment);
  const now = Date.now();

  const devices = await deviceRepo.find();
  const targets = devices.filter((d) => !!d.pushToken);

  let woken = 0;
  for (const d of targets) {
    const saved = await assignmentRepo.save({
      deviceId: d.id,
      kind: AssignmentKind.CATALOG,
      stationIds: [],
      status: AssignmentStatus.PENDING,
      expiresAt: new Date(now + ASSIGNMENT_TTL_MS),
      attempts: 0,
    });
    const ok = await wakeDeviceForScan(d.id, saved.id);
    if (ok) woken++;
  }

  return NextResponse.json({
    devices: devices.length,
    withToken: targets.length,
    woken,
    message:
      targets.length === 0
        ? "Ningún dispositivo tiene token FCM (inicia sesión en la app primero)."
        : `Barrido forzado: ${targets.length} con token, ${woken} despertado(s) por FCM SCAN.`,
  });
}
