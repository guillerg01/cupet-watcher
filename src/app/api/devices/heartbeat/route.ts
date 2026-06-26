import { NextResponse } from "next/server";
import { z } from "zod";
import { repo, Device } from "@/infra/db";
import { deviceFromRequest } from "@/lib/device-auth";

export const dynamic = "force-dynamic";

const schema = z.object({
  ticketLinked: z.boolean().optional(),
  pushToken: z.string().optional(),
  watchProvinceIds: z.array(z.number().int()).optional(),
});

export async function POST(req: Request): Promise<Response> {
  const auth = deviceFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body ?? {});

  const deviceRepo = await repo(Device);
  const device = await deviceRepo.findOne({ where: { id: auth.deviceId } });
  if (!device) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const patch: Partial<Device> = { lastHeartbeatAt: new Date() };
  if (parsed.success) {
    if (parsed.data.ticketLinked !== undefined) patch.ticketLinked = parsed.data.ticketLinked;
    if (parsed.data.pushToken) patch.pushToken = parsed.data.pushToken;
    if (parsed.data.watchProvinceIds) patch.watchProvinceIds = parsed.data.watchProvinceIds;
  }

  const pendingPush = device.pendingPush;
  if (pendingPush) patch.pendingPush = null;

  await deviceRepo.update({ id: auth.deviceId }, patch);

  return NextResponse.json({
    ok: true,
    pendingPush: pendingPush ?? null,
    watchProvinceIds: patch.watchProvinceIds ?? device.watchProvinceIds ?? [],
  });
}
