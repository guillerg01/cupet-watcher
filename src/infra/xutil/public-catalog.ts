import type { ServicioDetail } from "@/infra/xutil/types";

const BASE = "https://ticket.xutil.net/apps/bienestar/api";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36";

function publicHeaders(referer: string): Record<string, string> {
  return {
    Accept: "application/json",
    "Accept-Language": "es-419,es;q=0.7",
    app: "agencia-citas",
    Origin: "https://ticket.xutil.net",
    Referer: referer,
    "User-Agent": UA,
  };
}

export async function fetchPublicServicioDetail(stationId: number): Promise<ServicioDetail> {
  const referer = `https://ticket.xutil.net/store/service-detail?service=${stationId}`;
  const res = await fetch(`${BASE}/servicio/${stationId}?params=&app=`, {
    headers: publicHeaders(referer),
    next: { revalidate: 120 },
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`ticket detail HTTP ${res.status}: ${t.slice(0, 120)}`);
  }
  return res.json() as Promise<ServicioDetail>;
}
