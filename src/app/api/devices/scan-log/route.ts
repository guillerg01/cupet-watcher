import { NextResponse } from "next/server";
import { z } from "zod";
import { repo, Device } from "@/infra/db";
import { deviceFromRequest } from "@/lib/device-auth";

export const dynamic = "force-dynamic";

const schema = z.object({
  stage: z.string().max(120),
  error: z.string().max(2000).nullable().optional(),
});

/**
 * The device reports its latest background-scan stage/error so the admin can
 * see where a closed-app sweep dies (push received → sweep start → saving →
 * complete, or an error string).
 */
export async function POST(req: Request): Promise<Response> {
  const auth = deviceFromRequest(req);
  if (!auth) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const deviceRepo = await repo(Device);
  await deviceRepo.update(
    { id: auth.deviceId },
    {
      lastScanStage: parsed.data.stage,
      lastScanError: parsed.data.error ?? null,
      lastScanLogAt: new Date(),
    },
  );

  return NextResponse.json({ ok: true });
}
