import { NextResponse } from "next/server";
import { z } from "zod";
import { repo, Device } from "@/infra/db";
import { deviceFromRequest } from "@/lib/device-auth";

export const dynamic = "force-dynamic";

const schema = z.object({
  ticketLinked: z.boolean().optional(),
  pushToken: z.string().optional(),
});

/**
 * Keeps the device marked online and reports whether the user has logged into
 * ticket on the device (ticketLinked). The coordinator only assigns work to
 * online + ticketLinked devices.
 */
export async function POST(req: Request): Promise<Response> {
  const auth = deviceFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body ?? {});

  const patch: { lastHeartbeatAt: Date; ticketLinked?: boolean; pushToken?: string } = {
    lastHeartbeatAt: new Date(),
  };
  if (parsed.success) {
    if (parsed.data.ticketLinked !== undefined) patch.ticketLinked = parsed.data.ticketLinked;
    if (parsed.data.pushToken) patch.pushToken = parsed.data.pushToken;
  }

  const deviceRepo = await repo(Device);
  await deviceRepo.update({ id: auth.deviceId }, patch);

  return NextResponse.json({ ok: true });
}
