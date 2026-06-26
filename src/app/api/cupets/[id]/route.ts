import { NextResponse } from "next/server";
import { getCupetDetail } from "@/lib/cupet-detail";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: Params): Promise<Response> {
  const { id } = await params;
  const stationId = Number(id);
  if (!Number.isFinite(stationId)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  const detail = await getCupetDetail(stationId);
  if (!detail) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json(detail);
}
