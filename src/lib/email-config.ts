export function extractEmailDomain(from: string): string | null {
  const match = from.match(/<([^>]+)>/) ?? from.match(/(\S+@\S+)/);
  const addr = match?.[1] ?? match?.[0];
  if (!addr) return null;
  const at = addr.lastIndexOf("@");
  if (at < 0) return null;
  return addr.slice(at + 1).toLowerCase();
}

export function getEmailFromIssue(from: string): string | null {
  const domain = extractEmailDomain(from);
  if (!domain) {
    return "EMAIL_FROM inválido. Formato: Cupet Watcher <alerts@tudominio.com>";
  }
  if (domain === "example.com" || domain.endsWith(".example.com")) {
    return "EMAIL_FROM usa example.com. Configurá un remitente con dominio verificado en Resend (variable EMAIL_FROM en Render).";
  }
  if (domain.endsWith(".onrender.com")) {
    return `No podés verificar ${domain} en Resend: no controlás el DNS de onrender.com. Usá un dominio propio o, para pruebas, onboarding@resend.dev (solo a tu correo de Resend).`;
  }
  return null;
}
