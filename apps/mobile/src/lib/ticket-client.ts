import { base64Encode } from "./base64";
import { TICKET } from "./config";

// Port of src/infra/xutil/client.ts (server). The phone has the Cuban IP and no
// CORS sandbox, so the same browser-mimic headers work directly.

export interface TokenBundle {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // epoch ms
}

export interface ProvinceDTO {
  id: number;
  name: string;
}

// Matches the backend POST /api/ingest/catalog station schema.
export interface FuelStationDTO {
  id: number;
  name: string;
  establishment: string;
  provinceName: string;
  municipio: string | null;
  admiteSalaEspera: boolean;
  tieneValidacion: boolean;
  disponibilidades: number;
  rating: number | null;
  views: number | null;
}

// "Compra de combustible" activity id in the xutil taxonomy.
const FUEL_ACTIVITY_ID = 321;

const DEFAULT_SERVICIOS_BODY = {
  province_id: "",
  municipality_id: "",
  service_or_prov: "",
  find_by_dpa: null,
  orderBy: null,
  rating: null,
  limit: 20,
  serviceName: "",
  reservation_date_ini: null,
  reservation_date_end: null,
  professional_name: "",
  currency_values: [] as unknown[],
};

interface RawSubcat {
  id_actividad: number;
}
interface RawService {
  id: number;
  nombre: string;
  establishment: string;
  municipio: string | null;
  provincia: string;
  disponibilidades: number;
  admite_sala_espera_virtual: number;
  tiene_validacion: number;
  rating: number | null;
  views: number | null;
  subcategorias_actividades: RawSubcat[];
}

function loginHeaders(): Record<string, string> {
  return {
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "es-419,es;q=0.7",
    Authorization: TICKET.oauthBasic,
    "Content-Type": "application/x-www-form-urlencoded",
    Origin: "https://ticket.xutil.net",
    Referer: "https://ticket.xutil.net/login/",
    "User-Agent": TICKET.userAgent,
  };
}

function apiHeaders(token: string, referer: string): Record<string, string> {
  return {
    Accept: "application/json",
    "Accept-Language": "es-419,es;q=0.7",
    Authorization: `Bearer ${token}`,
    hashed: base64Encode(`Bearer ${token}`),
    app: TICKET.appHeader,
    Origin: "https://ticket.xutil.net",
    Referer: referer,
    "User-Agent": TICKET.userAgent,
  };
}

function jsonHeaders(token: string): Record<string, string> {
  return { ...apiHeaders(token, "https://ticket.xutil.net/store/catalogue"), "Content-Type": "application/json" };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function isFuel(raw: RawService): boolean {
  return raw.subcategorias_actividades?.some((s) => s.id_actividad === FUEL_ACTIVITY_ID) ?? false;
}

function toFuelStation(raw: RawService): FuelStationDTO {
  return {
    id: raw.id,
    name: raw.nombre,
    establishment: raw.establishment,
    provinceName: raw.provincia,
    municipio: raw.municipio ?? null,
    admiteSalaEspera: raw.admite_sala_espera_virtual === 1,
    tieneValidacion: raw.tiene_validacion === 1,
    disponibilidades: raw.disponibilidades,
    rating: raw.rating ?? null,
    views: raw.views ?? null,
  };
}

/** OAuth password grant. Password is base64-encoded before sending (upstream quirk). */
export async function ticketLogin(username: string, password: string): Promise<TokenBundle> {
  const body = [
    `username=${username}`,
    `password=${base64Encode(password)}`,
    "pass=",
    "scope=openid",
    "grant_type=password",
  ].join("&");

  const res = await fetch(TICKET.oauthUrl, { method: "POST", headers: loginHeaders(), body });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`ticket login HTTP ${res.status}: ${t.slice(0, 160)}`);
  }
  const json = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
}

export async function getProvinces(token: string): Promise<ProvinceDTO[]> {
  const res = await fetch(`${TICKET.base}/provincias`, { headers: apiHeaders(token, "https://ticket.xutil.net/store/catalogue") });
  if (!res.ok) throw new Error(`provincias HTTP ${res.status}`);
  const arr = (await res.json()) as { id: number; nombre_provincia: string }[];
  return arr.map((p) => ({ id: p.id, name: p.nombre_provincia.trim() }));
}

async function fetchServicesPage(token: string, page: number): Promise<{ data: RawService[]; lastPage: number }> {
  const res = await fetch(`${TICKET.base}/servicios`, {
    method: "POST",
    headers: jsonHeaders(token),
    body: JSON.stringify({ ...DEFAULT_SERVICIOS_BODY, page }),
  });
  if (!res.ok) throw new Error(`servicios p${page} HTTP ${res.status}`);
  const text = await res.text();
  const json = JSON.parse(text) as { data: RawService[]; meta: { last_page: number } };
  return { data: json.data, lastPage: json.meta.last_page };
}

/**
 * Sweep the whole catalog, keeping only fuel services. Jittered page delays so the
 * user's ticket account never looks abusive. Returns the mapped fuel stations.
 */
export async function sweepFuelCatalog(
  token: string,
  onProgress?: (page: number, lastPage: number) => void,
): Promise<FuelStationDTO[]> {
  const out: FuelStationDTO[] = [];
  const first = await fetchServicesPage(token, 1);
  const lastPage = first.lastPage;
  for (const s of first.data) if (isFuel(s)) out.push(toFuelStation(s));
  onProgress?.(1, lastPage);

  for (let page = 2; page <= lastPage; page++) {
    await sleep(1500 + Math.floor(Math.random() * 2500));
    const res = await fetchServicesPage(token, page);
    for (const s of res.data) if (isFuel(s)) out.push(toFuelStation(s));
    onProgress?.(page, lastPage);
  }
  return out;
}
