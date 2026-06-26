import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin";
import { repo, AppUser } from "@/infra/db";
import { sendNewCupetEmail } from "@/infra/email/resend";
import { env } from "@/env";
import { extractEmailDomain, getEmailFromIssue } from "@/lib/email-config";

export const dynamic = "force-dynamic";

// Resend free tier caps at 100 emails/day. Refuse to start a broadcast we know
// will be truncated, and report what was actually delivered.
const SEND_CAP = 100;

export async function GET(): Promise<Response> {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const from = env.EMAIL_FROM.trim();
  const issue = from ? getEmailFromIssue(from) : "EMAIL_FROM no configurado en Render.";
  return NextResponse.json({
    configured: !!env.RESEND_API_KEY && !!from && !getEmailFromIssue(from),
    hasApiKey: !!env.RESEND_API_KEY,
    fromDomain: from ? extractEmailDomain(from) : null,
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

  if (!env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: "RESEND_API_KEY no configurada en el servidor." },
      { status: 500 },
    );
  }

  if (!env.EMAIL_FROM.trim()) {
    return NextResponse.json(
      { error: "EMAIL_FROM no configurado. En Render: Cupet Watcher <onboarding@resend.dev> para pruebas." },
      { status: 500 },
    );
  }

  const fromIssue = getEmailFromIssue(env.EMAIL_FROM);
  if (fromIssue) {
    return NextResponse.json({ error: fromIssue }, { status: 400 });
  }

  const userRepo = await repo(AppUser);
  const subscribers = await userRepo
    .createQueryBuilder("u")
    .where("u.notifyNew = true")
    .andWhere("u.email IS NOT NULL")
    .andWhere("u.email <> ''")
    .select(["u.id", "u.email"])
    .getMany();

  const targets = subscribers.slice(0, SEND_CAP);

  let sent = 0;
  let failed = 0;
  let lastError: string | null = null;

  for (const user of targets) {
    const result = await sendNewCupetEmail(user.email, {
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

  const truncated = subscribers.length > SEND_CAP;
  return NextResponse.json({
    subscribers: subscribers.length,
    attempted: targets.length,
    sent,
    failed,
    truncated,
    message:
      subscribers.length === 0
        ? "Sin suscriptores (nadie con notifyNew + correo)."
        : `Prueba enviada: ${sent} OK, ${failed} fallidos de ${targets.length}` +
          (truncated ? ` · cortado en ${SEND_CAP} (límite Resend free)` : "") +
          (lastError ? ` · último error: ${lastError}` : ""),
  });
}
