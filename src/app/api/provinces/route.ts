import { NextResponse } from "next/server";
import { listProvinces } from "@/lib/cupet-catalog";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const provinces = await listProvinces();
  return NextResponse.json({ provinces });
}
