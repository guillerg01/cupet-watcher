import { NextResponse } from "next/server";
import { listCupets } from "@/lib/cupet-catalog";

export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? undefined;
  const provinceIdParam = url.searchParams.get("provinceId");
  const provinceId =
    provinceIdParam != null && provinceIdParam !== "" ? Number(provinceIdParam) : null;
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
  const perPage = Math.min(100, Math.max(1, Number(url.searchParams.get("perPage") ?? "30") || 30));

  const result = await listCupets({
    q,
    provinceId: provinceId != null && !Number.isNaN(provinceId) ? provinceId : null,
    page,
    perPage,
  });

  return NextResponse.json(result);
}
