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

/**
 * Phone registers as a worker. Identity = the ticket username the user logged in
 * with ON THE DEVICE (Cuban IP). The server cannot verify ticket (no Cuban IP), so
 * it trusts the login and labels the device by username; submitted data is validated
 * separately. Returns a deviceId + commandToken the phone stores.
 */
export async function POST(req: Request): Promise<Response> {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const { xutilUsername, pushToken, platform, deviceId } = parsed.data;
  const deviceRepo = await repo(Device);
  const now = new Date();

  let device =
    deviceId != null ? await deviceRepo.findOne({ where: { id: deviceId } }) : null;

  if (device) {
    await deviceRepo.update(device.id, {
      xutilUsername,
      pushToken: pushToken ?? device.pushToken,
      platform: platform ?? device.platform,
      lastHeartbeatAt: now,
    });
  } else {
    device = await deviceRepo.save({
      xutilUsername,
      pushToken: pushToken ?? null,
      platform: platform ?? "android",
      ticketLinked: true,
      lastHeartbeatAt: now,
    });
  }

  const commandToken = signDeviceToken({ deviceId: device.id, xutilUsername });
  return NextResponse.json({ deviceId: device.id, commandToken });
}
