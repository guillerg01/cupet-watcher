import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { repo, AppUser } from "@/infra/db";
import { sendNewCupetEmail, gmailConfigured, emailConfigIssue } from "@/infra/email/resend";
import { env } from "@/env";

export const dynamic = "force-dynamic";

// Gmail SMTP allows ~500 emails/day. Cap the broadcast well under that.
const SEND_CAP = 400;

export async function GET(): Promise<Response> {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const issue = emailConfigIssue();
  return NextResponse.json({
    configured: gmailConfigured(),
    issue: issue ?? null,
  });
}

/**
 * Admin "test broadcast": send a clearly-labelled test notification email to
 * every subscriber that opted into new-cupet alerts (notifyNew=true with an
 * email). Outward-facing + irreversible, so the client must pass {confirm:true}.
 */
export async function POST(req: Request): Promise<Response> {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => ({}))) as { confirm?: boolean };
  if (body.confirm !== true) {
    return NextResponse.json({ error: "Falta confirmación." }, { status: 400 });
  }

  const issue = emailConfigIssue();
  if (issue) {
    return NextResponse.json({ error: issue }, { status: 500 });
  }

  // TEST button = blast to EVERY registered user with an email, regardless of
  // notifyNew / province. (The automatic path in send-notifications keeps the
  // province + notifyNew filtering.) Always include the admin too.
  const userRepo = await repo(AppUser);
  const users = await userRepo
    .createQueryBuilder("u")
    .where("u.email IS NOT NULL")
    .andWhere("u.email <> ''")
    .select(["u.id", "u.email"])
    .getMany();

  const recipients = new Set<string>();
  const adminEmail = env.ADMIN_EMAIL?.trim().toLowerCase();
  if (adminEmail && adminEmail.includes("@")) recipients.add(adminEmail);
  for (const u of users) recipients.add(u.email.toLowerCase());

  const targets = Array.from(recipients).slice(0, SEND_CAP);

  let sent = 0;
  let failed = 0;
  let lastError: string | null = null;

  for (const email of targets) {
    const result = await sendNewCupetEmail(email, {
      stationName: "Cupet de prueba",
      establishment: "PRUEBA · Cupet Watcher",
      provinceName: "Notificación de prueba",
      municipio: null,
      type: "NEW",
      publicLink: "https://ticket.xutil.net/store",
    });
    if (result.ok) sent++;
    else {
      failed++;
      lastError = result.error ?? "error";
    }
  }

  const truncated = recipients.size > SEND_CAP;
  return NextResponse.json({
    recipients: recipients.size,
    attempted: targets.length,
    sent,
    failed,
    truncated,
    message:
      `Prueba enviada a ${targets.length} usuario(s): ${sent} OK, ${failed} fallidos` +
      (truncated ? ` · cortado en ${SEND_CAP}` : "") +
      (lastError ? ` · último error: ${lastError}` : ""),
  });
}
