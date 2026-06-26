import { NextResponse } from "next/server";
import { env } from "@/env";
import { runAssignWork } from "@/jobs/assign-work";
import { runSendNotifications } from "@/jobs/send-notifications";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Coordinator tick for Render free (no always-on worker). An external pinger
 * (cron-job.org / Render Cron Job) hits this every ~10 min:
 *   assign work (wake a device by FCM) → send pending notifications.
 * The interval gate lives inside runAssignWork, so over-pinging is harmless.
 *
 * Auth: shared secret via `?key=` or `Authorization: Bearer <CRON_SECRET>`.
 */
async function handle(req: Request): Promise<Response> {
  if (!env.CRON_SECRET) {
    return NextResponse.json({ error: "CRON_SECRET no configurado." }, { status: 503 });
  }

  const url = new URL(req.url);
  const provided =
    url.searchParams.get("key") ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    "";

  if (provided !== env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  try {
    const assigned = await runAssignWork();
    const notify = await runSendNotifications();
    return NextResponse.json({
      ok: true,
      ms: Date.now() - startedAt,
      assigned,
      notify,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function GET(req: Request): Promise<Response> {
  return handle(req);
}

export async function POST(req: Request): Promise<Response> {
  return handle(req);
}
