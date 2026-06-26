import { NextResponse } from "next/server";
import { getCupetStats } from "@/lib/cupet-stats";

export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const provinceIdParam = url.searchParams.get("provinceId");
  const provinceId =
    provinceIdParam != null && provinceIdParam !== "" ? Number(provinceIdParam) : null;

  const stats = await getCupetStats(
    provinceId != null && !Number.isNaN(provinceId) ? provinceId : null,
  );
  return NextResponse.json(stats);
}
