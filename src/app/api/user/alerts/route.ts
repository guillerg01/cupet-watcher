import { NextResponse } from "next/server";
import { db, repo, AppUser } from "@/infra/db";
import { appSessionFromRequest } from "@/lib/app-session-auth";
import { verifyDeviceToken } from "@/lib/device-auth";
import { getPendingAlerts, ackAlerts } from "@/lib/pending-alerts";

export const dynamic = "force-dynamic";

function deviceFromRequestEx(req: Request) {
  const xDevice = req.headers.get("x-device-token");
  if (xDevice) return verifyDeviceToken(xDevice);
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : header;
  return verifyDeviceToken(token);
}

async function resolveUserId(req: Request): Promise<string | null> {
  const session = appSessionFromRequest(req);
  if (session) return session.userId;
  const device = deviceFromRequestEx(req);
  if (!device) return null;
  const ds = await db();
  const [row] = (await ds.query(`SELECT "xutilUsername" FROM "Device" WHERE id = $1`, [
    device.deviceId,
  ])) as Array<{ xutilUsername: string }>;
  if (!row?.xutilUsername) return null;
  const userRepo = await repo(AppUser);
  const user = await userRepo.findOne({ where: { email: row.xutilUsername }, select: { id: true } });
  return user?.id ?? null;
}

export async function GET(req: Request): Promise<Response> {
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const result = await getPendingAlerts(userId);
  return NextResponse.json(result);
}

export async function POST(req: Request): Promise<Response> {
  const userId = await resolveUserId(req);
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await ackAlerts(userId);
  return NextResponse.json({ ok: true });
}
