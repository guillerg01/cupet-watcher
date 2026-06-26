import { db } from "@/infra/db";
import { fetchPublicServicioDetail } from "@/infra/xutil/public-catalog";
import type { ServicioDetail } from "@/infra/xutil/types";

export interface CupetDetail {
  id: number;
  name: string;
  establishment: string;
  provinceId: number;
  provinceName: string;
  municipio: string | null;
  disponibilidades: number;
  disponible: boolean;
  admiteSalaEspera: boolean;
  tieneValidacion: boolean;
  confirmed: boolean;
  views: number | null;
  rating: number | null;
  imageUrl: string | null;
  description: string | null;
  publicLink: string | null;
  lat: number | null;
  lng: number | null;
  live: boolean;
  detail: ServicioDetail | null;
  snapshots: Array<{
    ts: string;
    disponibilidades: number;
    views: number | null;
    queuePosicion: number | null;
    queueTotal: number | null;
  }>;
}

function averageRating(slice: ServicioDetail["reviews_slice"]): number | null {
  if (!slice) return null;
  const total =
    slice["5_stars"] +
    slice["4_stars"] +
    slice["3_stars"] +
    slice["2_stars"] +
    slice["1_stars"];
  if (total === 0) return null;
  const score =
    slice["5_stars"] * 5 +
    slice["4_stars"] * 4 +
    slice["3_stars"] * 3 +
    slice["2_stars"] * 2 +
    slice["1_stars"];
  return score / total;
}

function parseCoord(value: string | null | undefined): number | null {
  if (!value) return null;
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

export async function getCupetDetail(stationId: number, live = true): Promise<CupetDetail | null> {
  const ds = await db();
  const [row] = (await ds.query(
    `SELECT s.*, p.name AS "provinceName"
     FROM "Station" s
     INNER JOIN "Province" p ON p.id = s."provinceId"
     WHERE s.id = $1`,
    [stationId],
  )) as Array<{
    id: number;
    name: string;
    establishment: string;
    provinceId: number;
    provinceName: string;
    municipio: string | null;
    disponibilidades: number;
    admiteSalaEspera: boolean;
    tieneValidacion: boolean;
    confirmed: boolean;
    lat: number | null;
    lng: number | null;
    detailCache: unknown;
  }>;

  if (!row) return null;

  let detail: ServicioDetail | null = null;
  let fetchedLive = false;
  if (live) {
    try {
      detail = await fetchPublicServicioDetail(stationId);
      fetchedLive = true;
      const now = new Date();
      await ds.query(
        `UPDATE "Station" SET
          name = $2, establishment = $3, municipio = $4,
          disponibilidades = $5, "admiteSalaEspera" = $6, "tieneValidacion" = $7,
          lat = $8, lng = $9, "detailCache" = $10::jsonb, "detailFetchedAt" = $11,
          "lastSeenAt" = $11, active = true
         WHERE id = $1`,
        [
          stationId,
          detail.nombre,
          detail.establecimiento,
          detail.municipio ?? null,
          detail.disponibilidades,
          detail.admite_sala_espera_virtual === 1,
          detail.tiene_validacion === 1,
          parseCoord(detail.latitud),
          parseCoord(detail.longitud),
          JSON.stringify(detail),
          now,
        ],
      );
      await ds.query(
        `INSERT INTO "StationSnapshot" ("stationId", disponible, disponibilidades, views, rating, "queuePosicion", "queueTotal", ts)
         VALUES ($1, $2, $3, $4, NULL, NULL, NULL, $5)`,
        [stationId, detail.disponible, detail.disponibilidades, detail.views ?? null, now],
      );
    } catch {
      if (row.detailCache && typeof row.detailCache === "object") {
        detail = row.detailCache as ServicioDetail;
      }
    }
  } else if (row.detailCache && typeof row.detailCache === "object") {
    detail = row.detailCache as ServicioDetail;
  }

  const snaps = (await ds.query(
    `SELECT ts, disponibilidades, views, "queuePosicion", "queueTotal"
     FROM "StationSnapshot" WHERE "stationId" = $1
     ORDER BY ts DESC LIMIT 20`,
    [stationId],
  )) as Array<{
    ts: Date;
    disponibilidades: number;
    views: number | null;
    queuePosicion: number | null;
    queueTotal: number | null;
  }>;

  const latestSnap = snaps[0];
  const disponibilidades = detail?.disponibilidades ?? latestSnap?.disponibilidades ?? row.disponibilidades;
  const disponible = detail?.disponible ?? disponibilidades > 0;

  return {
    id: row.id,
    name: detail?.nombre ?? row.name,
    establishment: detail?.establecimiento ?? row.establishment,
    provinceId: row.provinceId,
    provinceName: row.provinceName,
    municipio: detail?.municipio ?? row.municipio,
    disponibilidades,
    disponible,
    admiteSalaEspera: row.admiteSalaEspera,
    tieneValidacion: row.tieneValidacion,
    confirmed: row.confirmed,
    views: detail?.views ?? latestSnap?.views ?? null,
    rating: averageRating(detail?.reviews_slice),
    imageUrl: detail?.image_urls?.[0] ?? null,
    description: detail?.descripcion ?? null,
    publicLink: detail?.public_link ?? `https://ticket.xutil.net/store/service-detail?service=${stationId}`,
    lat: row.lat,
    lng: row.lng,
    live: fetchedLive,
    detail,
    snapshots: snaps.map((s) => ({
      ts: s.ts.toISOString(),
      disponibilidades: s.disponibilidades,
      views: s.views,
      queuePosicion: s.queuePosicion,
      queueTotal: s.queueTotal,
    })),
  };
}
