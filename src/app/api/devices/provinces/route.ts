import { NextResponse } from "next/server";
import { repo, Province } from "@/infra/db";
import { deviceFromRequest } from "@/lib/device-auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  if (!deviceFromRequest(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const provinceRepo = await repo(Province);
  const provinces = await provinceRepo.find({ order: { name: "ASC" } });

  return NextResponse.json({
    provinces: provinces.map((p) => ({ id: p.id, name: p.name })),
  });
}
