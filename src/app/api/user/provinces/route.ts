import { NextResponse } from "next/server";
import { z } from "zod";
import { db, repo, AppUser, UserProvince } from "@/infra/db";
import { appSessionFromRequest } from "@/lib/app-session-auth";
import { verifyDeviceToken } from "@/lib/device-auth";
import { listProvinces } from "@/lib/cupet-catalog";

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
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const provinces = await listProvinces();
  const userProvinceRepo = await repo(UserProvince);
  const links = await userProvinceRepo.find({ where: { userId } });
  const watchProvinceIds = links.map((l) => l.provinceId);

  return NextResponse.json({ provinces, watchProvinceIds });
}

const patchSchema = z.object({
  watchProvinceIds: z.array(z.number().int().positive()),
});

export async function PATCH(req: Request): Promise<Response> {
  const userId = await resolveUserId(req);
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const { watchProvinceIds } = parsed.data;
  const dataSource = await db();
  await dataSource.transaction(async (manager) => {
    await manager.delete(UserProvince, { userId });
    if (watchProvinceIds.length > 0) {
      await manager.save(
        UserProvince,
        watchProvinceIds.map((provinceId) => ({ userId, provinceId })),
      );
    }
  });

  const device = deviceFromRequestEx(req);
  if (device) {
    await dataSource.query(`UPDATE "Device" SET "watchProvinceIds" = $1::jsonb WHERE id = $2`, [
      JSON.stringify(watchProvinceIds),
      device.deviceId,
    ]);
  }

  return NextResponse.json({ ok: true, watchProvinceIds });
}
