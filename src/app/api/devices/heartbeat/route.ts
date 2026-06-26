import { NextResponse } from "next/server";
import { z } from "zod";
import { repo, Device } from "@/infra/db";
import { deviceFromRequest } from "@/lib/device-auth";
import { drainPendingQueue } from "@/lib/push-queue";

export const dynamic = "force-dynamic";

const schema = z.object({
  pushToken: z.string().optional(),
  watchProvinceIds: z.array(z.number().int()).optional(),
});

export async function POST(req: Request): Promise<Response> {
  try {
    const auth = deviceFromRequest(req);
    if (!auth) {
      return NextResponse.json(
        { error: "unauthorized", message: "Token de dispositivo inválido o expirado" },
        { status: 401 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body ?? {});

    const deviceRepo = await repo(Device);
    let device = await deviceRepo.findOne({ where: { id: auth.deviceId } });

    if (!device) {
      const byAccount = await deviceRepo.findOne({
        where: { xutilUsername: auth.xutilUsername },
        order: { lastHeartbeatAt: "DESC" },
      });
      if (byAccount && byAccount.id !== auth.deviceId) {
        return NextResponse.json(
          { error: "stale_device", message: "Sesión de dispositivo desactualizada" },
          { status: 401 },
        );
      }
      if (!byAccount) {
        device = await deviceRepo.save({
          id: auth.deviceId,
          xutilUsername: auth.xutilUsername,
          platform: "android",
          ticketLinked: false,
          pushToken: parsed.success ? (parsed.data.pushToken ?? null) : null,
          lastHeartbeatAt: new Date(),
        });
      } else {
        device = byAccount;
      }
    }

    const pendingPushes = drainPendingQueue(device);

    const patch: Partial<Device> = {
      lastHeartbeatAt: new Date(),
      pendingPushQueue: [],
      pendingPush: null,
    };
    if (parsed.success) {
      if (parsed.data.pushToken) patch.pushToken = parsed.data.pushToken;
      if (parsed.data.watchProvinceIds) patch.watchProvinceIds = parsed.data.watchProvinceIds;
    }

    await deviceRepo.update({ id: device.id }, patch);

    return NextResponse.json({
      ok: true,
      pendingPushes,
      watchProvinceIds: patch.watchProvinceIds ?? device.watchProvinceIds ?? [],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[heartbeat] ${message}\n`);
    return NextResponse.json({ error: "heartbeat_failed", message }, { status: 500 });
  }
}
