import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { repo, AppUser } from "@/infra/db";
import { sendNewCupetEmail } from "@/infra/email/resend";
import { env } from "@/env";

export const dynamic = "force-dynamic";

// Resend free tier caps at 100 emails/day. Refuse to start a broadcast we know
// will be truncated, and report what was actually delivered.
const SEND_CAP = 100;

/**
 * Admin "test broadcast": send a clearly-labelled test notification email to
 * every subscriber that opted into new-cupet alerts (notifyNew=true with an
 * email). Outward-facing + irreversible, so the client must pass {confirm:true}.
 */
export async function POST(req: Request): Promise<Response> {
  await requireAdmin();

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
