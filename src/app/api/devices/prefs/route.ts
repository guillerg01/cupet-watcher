import { NextResponse } from "next/server";
import { z } from "zod";
import { repo, Device } from "@/infra/db";
import { deviceFromRequest } from "@/lib/device-auth";

export const dynamic = "force-dynamic";

const schema = z.object({
  watchProvinceIds: z.array(z.number().int()),
});

export async function PATCH(req: Request): Promise<Response> {
  const auth = deviceFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const deviceRepo = await repo(Device);
  await deviceRepo.update({ id: auth.deviceId }, {
    watchProvinceIds: parsed.data.watchProvinceIds,
  });

  return NextResponse.json({ ok: true, watchProvinceIds: parsed.data.watchProvinceIds });
}
