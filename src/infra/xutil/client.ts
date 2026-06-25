import { env } from "@/env";
import { sleep, jitter } from "@/lib/sleep";
import { xutilFetch } from "@/infra/xutil/http";
import { xutilLog } from "@/infra/xutil/log";
import {
  afterRateLimitHit,
  afterSuccessfulRetry,
  waitForXutilSlot,
} from "@/infra/xutil/rate-limit";
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

const MAX_RETRIES = 6;

function retryDelayMs(status: number, attempt: number): number {
  if (status === 429) return 20_000 * attempt + jitter(3000, 8000);
  return 2_000 * attempt;
}

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36";

const OAUTH_BASIC =
  "Basic NloyWGNna01Ra1h0VVdDeHk2eTdlT0syWklBYTpXSGtqTDc4dFVIbHdNUGo3ZmRfRkY1a1UyaElh";

function buildOAuthBasicHeader(): string {
  if (env.XUTIL_OAUTH_BASIC) {
    return env.XUTIL_OAUTH_BASIC.startsWith("Basic ")
      ? env.XUTIL_OAUTH_BASIC
      : `Basic ${env.XUTIL_OAUTH_BASIC}`;
  }
  const credentials = `${env.XUTIL_OAUTH_CLIENT_ID}:${env.XUTIL_OAUTH_CLIENT_SECRET}`;
  return `Basic ${Buffer.from(credentials).toString("base64")}`;
}

function buildBrowserLoginHeaders(): Record<string, string> {
  return {
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "es-419,es;q=0.7",
    Authorization: buildOAuthBasicHeader(),
    "Content-Type": "application/x-www-form-urlencoded",
    Origin: "https://ticket.xutil.net",
    Referer: "https://ticket.xutil.net/login/",
    "Sec-CH-UA": '"Brave";v="149", "Chromium";v="149", "Not)A;Brand";v="24"',
    "Sec-CH-UA-Mobile": "?0",
    "Sec-CH-UA-Platform": '"Windows"',
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
    "Sec-GPC": "1",
    "User-Agent": BROWSER_USER_AGENT,
  };
}

function buildLoginBody(username: string, encodedPassword: string): string {
  return [
    `username=${username}`,
    `password=${encodedPassword}`,
    "pass=",
    "scope=openid",
    "grant_type=password",
  ].join("&");
}

function buildApiHeaders(
  token: string,
  referer = "https://ticket.xutil.net/store/catalogue",
): Record<string, string> {
  return {
    Accept: "application/json",
    "Accept-Language": "es-419,es;q=0.7",
    Authorization: `Bearer ${token}`,
    hashed: Buffer.from(`Bearer ${token}`).toString("base64"),
    app: env.XUTIL_APP_HEADER,
    Origin: "https://ticket.xutil.net",
    Referer: referer,
    "Sec-CH-UA": '"Brave";v="149", "Chromium";v="149", "Not)A;Brand";v="24"',
    "Sec-CH-UA-Mobile": "?0",
    "Sec-CH-UA-Platform": '"Windows"',
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
    "Sec-GPC": "1",
    "User-Agent": BROWSER_USER_AGENT,
  };
}

function buildJsonPostHeaders(token: string, referer?: string): Record<string, string> {
  return {
    ...buildApiHeaders(token, referer),
    "Content-Type": "application/json",
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
  await waitForXutilSlot();
  const res = await xutilFetch(url, options);

  if (!res.ok) {
    const isRetryable = res.status === 429 || res.status >= 500;
    const errBody = (await res.text()).slice(0, 300);
    if (isRetryable && attempt < MAX_RETRIES) {
      const delay = retryDelayMs(res.status, attempt);
      if (res.status === 429) afterRateLimitHit(attempt);
      xutilLog("request retry", { url, status: res.status, attempt, delayMs: delay });
      await sleep(delay);
      return request<T>(url, options, attempt + 1);
    }
    throw new Error(`[xutil] HTTP ${res.status} at ${url}: ${errBody}`);
  }

  if (attempt > 1) afterSuccessfulRetry();

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
      const encodedPassword = Buffer.from(password).toString("base64");
      const body = buildLoginBody(username, encodedPassword);

      const headers = buildBrowserLoginHeaders();

      xutilLog("oauth/token request", {
        url: oauthUrl,
        username,
        body,
        authorization: headers.Authorization === OAUTH_BASIC ? "browser-match" : headers.Authorization.slice(0, 20),
        tlsInsecure: env.XUTIL_TLS_INSECURE,
      });

      const res = await request<TokenResponse>(oauthUrl, {
        method: "POST",
        headers,
        body,
      });

      xutilLog("oauth/token ok", {
        username,
        expiresIn: res.expires_in,
        tokenPrefix: res.access_token.slice(0, 20),
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
        headers: buildApiHeaders(token),
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
          ...buildJsonPostHeaders(token),
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
          ...buildJsonPostHeaders(token),
        },
        body: JSON.stringify({ ...DEFAULT_SERVICIOS_BODY, page: 1 }),
      });

      const lastPage = first.meta.last_page;
      const total = first.meta.total;
      all.push(...first.data);
      onProgress?.({ page: 1, lastPage, total });

      for (let page = 2; page <= lastPage; page++) {
        await sleep(jitter(env.SCRAPE_PAGE_DELAY_MS_MIN, env.SCRAPE_PAGE_DELAY_MS_MAX));

        const res = await request<{
          data: RawService[];
          meta: { last_page: number; total: number };
        }>(
          `${base}/servicios`,
          {
            method: "POST",
            headers: buildJsonPostHeaders(token),
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
      return request<ServicioDetail>(`${base}/servicio/${id}?params=&app=`, {
        headers: buildApiHeaders(
          token,
          `https://ticket.xutil.net/store/service-detail?service=${id}`,
        ),
      });
    },

    // -----------------------------------------------------------------------
    async getPosicionVisual(token: string): Promise<RawSalaEspera[]> {
      // NOTE: upstream sometimes sends content-type text/html with JSON body.
      // The request() wrapper already handles this by parsing text first.
      const res = await request<{ data: RawSalaEspera[] }>(
        `${base}/sala-espera-virtual/v2/posicion-visual`,
        { headers: buildApiHeaders(token, "https://ticket.xutil.net/store/wait-room") },
      );
      return res.data;
    },
  };
}
