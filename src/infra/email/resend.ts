import { Resend } from "resend";
import { env } from "@/env";

let _resend: Resend | null = null;

function getClient(): Resend | null {
  if (!env.RESEND_API_KEY) return null;
  if (!_resend) _resend = new Resend(env.RESEND_API_KEY);
  return _resend;
}

export interface NewCupetPayload {
  stationName: string;
  establishment: string;
  provinceName: string;
  municipio: string | null;
  type: "NEW" | "BECAME_AVAILABLE" | "WAITROOM_ENABLED";
  publicLink: string;
}

const TITLES: Record<NewCupetPayload["type"], string> = {
  NEW: "Nuevo cupet",
  BECAME_AVAILABLE: "Cupet disponible",
  WAITROOM_ENABLED: "Sala de espera habilitada",
};

const SUBTITLES: Record<NewCupetPayload["type"], string> = {
  NEW: "Se detectó un nuevo punto de combustible en tu provincia.",
  BECAME_AVAILABLE:
    "Un cupet en tu provincia volvió a tener disponibilidades.",
  WAITROOM_ENABLED:
    "Un cupet en tu provincia habilitó la sala de espera virtual.",
};

function buildHtml(payload: NewCupetPayload): string {
  const title = TITLES[payload.type];
  const subtitle = SUBTITLES[payload.type];
  const location = [payload.municipio, payload.provinceName]
    .filter(Boolean)
    .join(", ");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">
          <!-- Header -->
          <tr>
            <td style="background:#16a34a;padding:24px 32px;">
              <p style="margin:0;font-size:11px;color:#bbf7d0;letter-spacing:.08em;text-transform:uppercase;">Cupet Watcher</p>
              <h1 style="margin:8px 0 0;font-size:22px;color:#ffffff;">${title}</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:28px 32px 0;">
              <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.6;">${subtitle}</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 4px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.06em;">Establecimiento</p>
                    <p style="margin:0;font-size:15px;font-weight:600;color:#111827;">${payload.establishment}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 20px 16px;">
                    <p style="margin:0 0 4px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.06em;">Servicio</p>
                    <p style="margin:0;font-size:15px;color:#111827;">${payload.stationName}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 20px 16px;">
                    <p style="margin:0 0 4px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.06em;">Ubicación</p>
                    <p style="margin:0;font-size:15px;color:#111827;">${location || payload.provinceName}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- CTA -->
          <tr>
            <td style="padding:24px 32px 28px;">
              <a href="${payload.publicLink}"
                 style="display:inline-block;background:#16a34a;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:6px;">
                Ver en ticket.xutil.net →
              </a>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="border-top:1px solid #e5e7eb;padding:16px 32px;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                Recibiste este correo porque estás suscrito a alertas de cupet en tu provincia.<br />
                Para desuscribirte, ajusta tus preferencias en Cupet Watcher.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendNewCupetEmail(
  to: string,
  payload: NewCupetPayload,
): Promise<{ ok: boolean; error?: string }> {
  const client = getClient();

  if (!client) {
    console.warn("[email] RESEND_API_KEY not set — skipping email to", to);
    return { ok: false, error: "no api key" };
  }

  try {
    const { error } = await client.emails.send({
      from: env.EMAIL_FROM,
      to,
      subject: `${TITLES[payload.type]}: ${payload.stationName} (${payload.provinceName})`,
      html: buildHtml(payload),
    });

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}
