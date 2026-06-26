import { NextResponse } from "next/server";
import { z } from "zod";
import { repo, Device } from "@/infra/db";
import { signDeviceToken } from "@/lib/device-auth";

export const dynamic = "force-dynamic";

const schema = z.object({
  xutilUsername: z.string().min(1),
  pushToken: z.string().optional(),
  platform: z.string().optional(),
  deviceId: z.string().optional(),
});

export async function POST(req: Request): Promise<Response> {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const { xutilUsername, pushToken, platform, deviceId } = parsed.data;
  const platformNorm = platform ?? "android";
  const deviceRepo = await repo(Device);
  const now = new Date();

  let device: Device | null = null;

  if (deviceId) {
    device = await deviceRepo.findOne({ where: { id: deviceId } });
  }

  if (!device) {
    device = await deviceRepo.findOne({
      where: { xutilUsername, platform: platformNorm },
      order: { lastHeartbeatAt: "DESC" },
    });
  }

  if (device) {
    await deviceRepo.update(device.id, {
      xutilUsername,
      pushToken: pushToken ?? device.pushToken,
      platform: platformNorm,
      ticketLinked: true,
      lastHeartbeatAt: now,
    });
    device = await deviceRepo.findOneOrFail({ where: { id: device.id } });
  } else {
    device = await deviceRepo.save({
      xutilUsername,
      pushToken: pushToken ?? null,
      platform: platformNorm,
      ticketLinked: true,
      lastHeartbeatAt: now,
    });
  }

  const commandToken = signDeviceToken({ deviceId: device.id, xutilUsername });
  return NextResponse.json({ deviceId: device.id, commandToken });
}
