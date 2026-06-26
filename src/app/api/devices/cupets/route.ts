import { NextResponse } from "next/server";
import { repo, Device } from "@/infra/db";
import { deviceFromRequest } from "@/lib/device-auth";
import { listCupets } from "@/lib/cupet-catalog";

export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  const auth = deviceFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? undefined;
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
  const perPage = Math.min(100, Math.max(1, Number(url.searchParams.get("perPage") ?? "200") || 200));

  const deviceRepo = await repo(Device);
  const device = await deviceRepo.findOne({ where: { id: auth.deviceId } });
  const watchIds = device?.watchProvinceIds ?? [];

  const result = await listCupets({
    q,
    page,
    perPage,
    watchProvinceIds: watchIds.length > 0 ? watchIds : undefined,
  });

  return NextResponse.json({
    ...result,
    filteredByProvinces: watchIds.length > 0,
    watchProvinceIds: watchIds,
  });
}
