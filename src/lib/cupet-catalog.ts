import { db } from "@/infra/db";

export interface CupetListItem {
  id: number;
  name: string;
  establishment: string;
  provinceId: number;
  provinceName: string;
  municipio: string | null;
  disponibilidades: number;
  admiteSalaEspera: boolean;
  confirmed: boolean;
  views: number | null;
  rating: number | null;
  imageUrl: string | null;
}

export interface ListCupetsResult {
  stations: CupetListItem[];
  total: number;
  page: number;
  perPage: number;
  lastPage: number;
}

export interface ListCupetsOpts {
  q?: string;
  provinceId?: number | null;
  page?: number;
  perPage?: number;
  watchProvinceIds?: number[];
}

function viewsFromCache(cache: unknown): number | null {
  if (!cache || typeof cache !== "object") return null;
  const v = (cache as { views?: number }).views;
  return typeof v === "number" ? v : null;
}

function imageFromCache(cache: unknown): string | null {
  if (!cache || typeof cache !== "object") return null;
  const c = cache as { image_urls?: string[]; image_url?: string };
  if (Array.isArray(c.image_urls) && c.image_urls[0]) return c.image_urls[0];
  if (typeof c.image_url === "string" && c.image_url) return c.image_url;
  return null;
}

function ratingFromCache(cache: unknown): number | null {
  if (!cache || typeof cache !== "object") return null;
  const c = cache as { rating?: number; reviews_slice?: Record<string, number> };
  if (typeof c.rating === "number" && c.rating > 0) return c.rating;
  const slice = c.reviews_slice;
  if (!slice) return null;
  const total =
    (slice["5_stars"] ?? 0) +
    (slice["4_stars"] ?? 0) +
    (slice["3_stars"] ?? 0) +
    (slice["2_stars"] ?? 0) +
    (slice["1_stars"] ?? 0);
  if (total === 0) return null;
  const score =
    (slice["5_stars"] ?? 0) * 5 +
    (slice["4_stars"] ?? 0) * 4 +
    (slice["3_stars"] ?? 0) * 3 +
    (slice["2_stars"] ?? 0) * 2 +
    (slice["1_stars"] ?? 0);
  return score / total;
}

export async function listCupets(opts: ListCupetsOpts = {}): Promise<ListCupetsResult> {
  const page = Math.max(1, opts.page ?? 1);
  const perPage = Math.min(100, Math.max(1, opts.perPage ?? 30));
  const offset = (page - 1) * perPage;
  const q = opts.q?.trim().toLowerCase() ?? "";

  const conditions = [`s.active = true`];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (opts.provinceId != null && !Number.isNaN(opts.provinceId)) {
    conditions.push(`s."provinceId" = $${paramIdx++}`);
    params.push(opts.provinceId);
  } else if (opts.watchProvinceIds && opts.watchProvinceIds.length > 0) {
    conditions.push(`s."provinceId" = ANY($${paramIdx++}::int[])`);
    params.push(opts.watchProvinceIds);
  }

  if (q) {
    conditions.push(
      `(LOWER(s.name) LIKE $${paramIdx} OR LOWER(s.establishment) LIKE $${paramIdx} OR LOWER(s.municipio) LIKE $${paramIdx})`,
    );
    params.push(`%${q}%`);
    paramIdx++;
  }

  const where = conditions.join(" AND ");
  const ds = await db();

  const [countRow] = (await ds.query(
    `SELECT COUNT(*)::int AS total FROM "Station" s WHERE ${where}`,
    params,
  )) as Array<{ total: number }>;
  const total = countRow?.total ?? 0;

  const rows = (await ds.query(
    `SELECT
      s.id, s.name, s.establishment, s."provinceId", p.name AS "provinceName",
      s.municipio, s.disponibilidades, s."admiteSalaEspera", s.confirmed,
      s."detailCache", ss.views, ss.rating AS "snapRating"
     FROM "Station" s
     INNER JOIN "Province" p ON p.id = s."provinceId"
     LEFT JOIN LATERAL (
       SELECT views, rating FROM "StationSnapshot"
       WHERE "stationId" = s.id ORDER BY ts DESC LIMIT 1
     ) ss ON true
     WHERE ${where}
     ORDER BY s.disponibilidades DESC, s.name ASC
     LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
    [...params, perPage, offset],
  )) as Array<{
    id: number;
    name: string;
    establishment: string;
    provinceId: number;
    provinceName: string;
    municipio: string | null;
    disponibilidades: number;
    admiteSalaEspera: boolean;
    confirmed: boolean;
    detailCache: unknown;
    views: number | null;
    snapRating: number | null;
  }>;

  const stations: CupetListItem[] = rows.map((r) => ({
    id: r.id,
    name: r.name,
    establishment: r.establishment,
    provinceId: r.provinceId,
    provinceName: r.provinceName,
    municipio: r.municipio,
    disponibilidades: r.disponibilidades,
    admiteSalaEspera: r.admiteSalaEspera,
    confirmed: r.confirmed,
    views: r.views ?? viewsFromCache(r.detailCache) ?? null,
    rating: ratingFromCache(r.detailCache) ?? r.snapRating ?? null,
    imageUrl: imageFromCache(r.detailCache),
  }));

  return {
    stations,
    total,
    page,
    perPage,
    lastPage: Math.max(1, Math.ceil(total / perPage)),
  };
}

export async function listProvinces(): Promise<Array<{ id: number; name: string }>> {
  const ds = await db();
  return (await ds.query(`SELECT id, name FROM "Province" ORDER BY name ASC`)) as Array<{
    id: number;
    name: string;
  }>;
}
