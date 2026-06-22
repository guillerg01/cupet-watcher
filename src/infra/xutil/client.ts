import { env } from "@/env";
import { sleep, jitter } from "@/lib/sleep";
import type { XutilClient, TokenBundle, SweepProgress } from "@/infra/xutil/contract";
import type {
  RawProvincia,
  RawService,
  RawSalaEspera,
  ServicioDetail,
  TokenResponse,
  ServiciosRequest,
} from "@/infra/xutil/types";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const MAX_RETRIES = 3;

function buildAuthHeaders(token: string): Record<string, string> {
  return {
    accept: "application/json",
    // 'app' identifies the client app to the upstream API
    app: env.XUTIL_APP_HEADER,
    // Upstream expects a 'hashed' header = base64("Bearer <token>")
    // This is an observed quirk — both hashed and authorization must be sent.
    hashed: Buffer.from(`Bearer ${token}`).toString("base64"),
    authorization: `Bearer ${token}`,
  };
}

const DEFAULT_SERVICIOS_BODY: Omit<ServiciosRequest, "page"> = {
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
  currency_values: [],
};

// ---------------------------------------------------------------------------
// Core request wrapper with retry on 429 / 5xx
// ---------------------------------------------------------------------------

async function request<T>(
  url: string,
  options: RequestInit,
  attempt = 1,
): Promise<T> {
  const res = await fetch(url, options);

  if (!res.ok) {
    const isRetryable = res.status === 429 || res.status >= 500;
    if (isRetryable && attempt < MAX_RETRIES) {
      // Exponential backoff: 500ms, 1000ms
      await sleep(500 * attempt);
      return request<T>(url, options, attempt + 1);
    }
    throw new Error(`[xutil] HTTP ${res.status} at ${url}`);
  }

  // Upstream occasionally sends content-type: text/html but with valid JSON body.
  // Parse text first, then JSON.parse defensively.
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      `[xutil] Failed to parse JSON from ${url}. Body starts: ${text.slice(0, 120)}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createXutilClient(): XutilClient {
  const base = env.XUTIL_BASE;
  const oauthUrl = env.XUTIL_OAUTH_URL;

  return {
    // -----------------------------------------------------------------------
    async login(username: string, password: string): Promise<TokenBundle> {
      const params = new URLSearchParams({
        grant_type: "password",
        scope: "openid",
        username,
        // Upstream base64-encodes the password before transport (observed quirk)
        password: Buffer.from(password).toString("base64"),
      });

      if (env.XUTIL_CLIENT_ID) {
        params.set("client_id", env.XUTIL_CLIENT_ID);
      }

      const res = await request<TokenResponse>(oauthUrl, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });

      return {
        accessToken: res.access_token,
        refreshToken: res.refresh_token,
        expiresAt: new Date(Date.now() + res.expires_in * 1000),
      };
    },

    // -----------------------------------------------------------------------
    async getProvincias(token: string): Promise<RawProvincia[]> {
      // /provincias returns a raw array, not wrapped in { data }.
      return request<RawProvincia[]>(`${base}/provincias`, {
        headers: buildAuthHeaders(token),
      });
    },

    // -----------------------------------------------------------------------
    async getServicesPage(
      token: string,
      body: Partial<ServiciosRequest> & { page: number },
    ): Promise<{ data: RawService[]; lastPage: number; total: number }> {
      const payload: ServiciosRequest = {
        ...DEFAULT_SERVICIOS_BODY,
        ...body,
      };

      const res = await request<{
        data: RawService[];
        meta: { last_page: number; total: number };
      }>(`${base}/servicios`, {
        method: "POST",
        headers: {
          ...buildAuthHeaders(token),
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      return {
        data: res.data,
        lastPage: res.meta.last_page,
        total: res.meta.total,
      };
    },

    // -----------------------------------------------------------------------
    async sweepAllServices(
      token: string,
      onProgress?: (p: SweepProgress) => void,
    ): Promise<RawService[]> {
      const all: RawService[] = [];

      // First page — needed to discover lastPage
      const first = await request<{
        data: RawService[];
        meta: { last_page: number; total: number };
      }>(`${base}/servicios`, {
        method: "POST",
        headers: {
          ...buildAuthHeaders(token),
          "content-type": "application/json",
        },
        body: JSON.stringify({ ...DEFAULT_SERVICIOS_BODY, page: 1 }),
      });

      const lastPage = first.meta.last_page;
      const total = first.meta.total;
      all.push(...first.data);
      onProgress?.({ page: 1, lastPage, total });

      for (let page = 2; page <= lastPage; page++) {
        // Jittered delay between pages to avoid rate-limiting
        await sleep(jitter(env.SCRAPE_PAGE_DELAY_MS_MIN, env.SCRAPE_PAGE_DELAY_MS_MAX));

        const res = await request<{
          data: RawService[];
          meta: { last_page: number; total: number };
        }>(
          `${base}/servicios`,
          {
            method: "POST",
            headers: {
              ...buildAuthHeaders(token),
              "content-type": "application/json",
            },
            body: JSON.stringify({ ...DEFAULT_SERVICIOS_BODY, page }),
          },
        );

        all.push(...res.data);
        onProgress?.({ page, lastPage, total });
      }

      return all;
    },

    // -----------------------------------------------------------------------
    async getServicioDetail(token: string, id: number): Promise<ServicioDetail> {
      // /servicio/{id} returns the object directly, not wrapped in { data }.
      return request<ServicioDetail>(`${base}/servicio/${id}?params=&app=`, {
        headers: buildAuthHeaders(token),
      });
    },

    // -----------------------------------------------------------------------
    async getPosicionVisual(token: string): Promise<RawSalaEspera[]> {
      // NOTE: upstream sometimes sends content-type text/html with JSON body.
      // The request() wrapper already handles this by parsing text first.
      const res = await request<{ data: RawSalaEspera[] }>(
        `${base}/sala-espera-virtual/v2/posicion-visual`,
        { headers: buildAuthHeaders(token) },
      );
      return res.data;
    },
  };
}
