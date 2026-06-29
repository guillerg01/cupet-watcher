import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Ultra-light keep-alive. An external pinger hits this every ~5 min so the
 * Render free web never idles out (15 min) and goes to sleep. NO DB, NO work —
 * just keeps the container warm so the 30-min coordinator hit always lands on a
 * live service. Public on purpose (no secret needed; it does nothing).
 */
export async function GET(): Promise<Response> {
  return NextResponse.json({ ok: true, t: Date.now() });
}
