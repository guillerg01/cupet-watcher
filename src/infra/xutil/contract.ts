import type {
  RawProvincia,
  RawService,
  ServicioDetail,
  RawSalaEspera,
  TokenResponse,
  ServiciosRequest,
} from "@/infra/xutil/types";

export interface TokenBundle {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface SweepProgress {
  page: number;
  lastPage: number;
  total: number;
}

// Implemented by infra/xutil/client.ts -> export function createXutilClient(): XutilClient
export interface XutilClient {
  // OAuth password grant. Password is base64-encoded before sending (upstream quirk).
  login(username: string, password: string): Promise<TokenBundle>;

  getProvincias(token: string): Promise<RawProvincia[]>;

  // POST /servicios for a single page.
  getServicesPage(
    token: string,
    body: Partial<ServiciosRequest> & { page: number },
  ): Promise<{ data: RawService[]; lastPage: number; total: number }>;

  // Sweep ALL catalog pages (slow, jittered). Optionally report progress.
  sweepAllServices(
    token: string,
    onProgress?: (p: SweepProgress) => void,
  ): Promise<RawService[]>;

  getServicioDetail(token: string, id: number): Promise<ServicioDetail>;

  // GET /sala-espera-virtual/v2/posicion-visual (queue positions for a user token)
  getPosicionVisual(token: string): Promise<RawSalaEspera[]>;
}

export type { TokenResponse };
