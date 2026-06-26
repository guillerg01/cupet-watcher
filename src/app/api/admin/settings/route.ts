import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import {
  getScanIntervalMinutes,
  setScanIntervalMinutes,
  ALLOWED_SCAN_INTERVALS,
} from "@/lib/app-settings";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  await requireAdmin();
  const scanIntervalMinutes = await getScanIntervalMinutes();
  return NextResponse.json({
    scanIntervalMinutes,
    options: ALLOWED_SCAN_INTERVALS,
  });
}

const patchSchema = z.object({
  scanIntervalMinutes: z.number().int(),
});

export async function PATCH(req: Request): Promise<Response> {
  await requireAdmin();
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  try {
    const scanIntervalMinutes = await setScanIntervalMinutes(parsed.data.scanIntervalMinutes);
    return NextResponse.json({ scanIntervalMinutes });
  } catch {
    return NextResponse.json(
      { error: "invalid_interval", options: ALLOWED_SCAN_INTERVALS },
      { status: 400 },
    );
  }
}
