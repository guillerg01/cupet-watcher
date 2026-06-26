import nodemailer, { type Transporter } from "nodemailer";
import { env } from "@/env";

// Email provider: Gmail SMTP only (free ~500/day). Use an App Password (needs
// 2FA on the account), NEVER the real password — set it as GMAIL_APP_PASSWORD.

let _gmail: Transporter | null = null;

export function gmailConfigured(): boolean {
  return !!(env.GMAIL_USER && env.GMAIL_APP_PASSWORD);
}

/** Human-readable reason the email provider isn't usable, or null if OK. */
export function emailConfigIssue(): string | null {
  if (!env.GMAIL_USER) return "Falta GMAIL_USER en el servidor.";
  if (!env.GMAIL_APP_PASSWORD) return "Falta GMAIL_APP_PASSWORD (App Password de Gmail).";
  return null;
}

function getGmail(): Transporter | null {
  if (!gmailConfigured()) return null;
  if (!_gmail) {
    _gmail = nodemailer.createTransport({
      service: "gmail",
      auth: { user: env.GMAIL_USER, pass: env.GMAIL_APP_PASSWORD },
    });
  }
  return _gmail;
}

export interface NewCupetPayload {
  stationName: string;
  establishment: string;
  provinceName: string;
  municipio: string | null;
  type: "NEW" | "REAPPEARED" | "DEPARTED" | "BECAME_AVAILABLE" | "WAITROOM_ENABLED";
  publicLink: string;
}

const TITLES: Record<NewCupetPayload["type"], string> = {
  NEW: "Nuevo cupet en el listado",
  REAPPEARED: "Cupet reapareció en el listado",
  DEPARTED: "Cupet salió del listado",
  BECAME_AVAILABLE: "Cupet disponible",
  WAITROOM_ENABLED: "Sala de espera habilitada",
};

const SUBTITLES: Record<NewCupetPayload["type"], string> = {
  NEW: "Se detectó un punto de combustible que no estaba antes en ticket.xutil.net.",
  REAPPEARED:
    "Un cupet que había salido del listado volvió a aparecer en tu provincia.",
  DEPARTED:
    "Un cupet que estaba en el listado ya no aparece en ticket.xutil.net.",
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
  const gmail = getGmail();
  if (!gmail) {
    return { ok: false, error: emailConfigIssue() ?? "Gmail no configurado." };
  }

  // Gmail forces the authenticated account as the real sender; EMAIL_FROM only
  // sets the display name.
  const from = env.EMAIL_FROM.trim()
    ? `${env.EMAIL_FROM.trim()} <${env.GMAIL_USER}>`
    : `Cupet Watcher <${env.GMAIL_USER}>`;

  try {
    await gmail.sendMail({
      from,
      to,
      subject: `${TITLES[payload.type]}: ${payload.stationName} (${payload.provinceName})`,
      html: buildHtml(payload),
    });
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `gmail: ${msg}` };
  }
}
