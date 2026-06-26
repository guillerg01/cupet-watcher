import { NextResponse } from "next/server";
import { z } from "zod";
import { repo, Device } from "@/infra/db";
import { deviceFromRequest } from "@/lib/device-auth";
import { drainPendingQueue } from "@/lib/push-queue";

export const dynamic = "force-dynamic";

const schema = z.object({
  ticketLinked: z.boolean().optional(),
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
    const device = await deviceRepo.findOne({ where: { id: auth.deviceId } });
    if (!device) {
      return NextResponse.json(
        { error: "not_found", message: "Dispositivo no registrado — volvé a entrar en la app" },
        { status: 404 },
      );
    }

    const pendingPushes = drainPendingQueue(device);

    const patch: Partial<Device> = {
      lastHeartbeatAt: new Date(),
      pendingPushQueue: [],
      pendingPush: null,
    };
    if (parsed.success) {
      if (parsed.data.ticketLinked !== undefined) patch.ticketLinked = parsed.data.ticketLinked;
      if (parsed.data.pushToken) patch.pushToken = parsed.data.pushToken;
      if (parsed.data.watchProvinceIds) patch.watchProvinceIds = parsed.data.watchProvinceIds;
    }

    await deviceRepo.update({ id: auth.deviceId }, patch);

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
