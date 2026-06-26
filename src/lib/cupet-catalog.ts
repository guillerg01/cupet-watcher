import { db } from "@/infra/db";
import { DETECTION_WINDOW_MS, getDetectionCounts } from "@/lib/detection-stats";

export type CatalogListChange = "NEW" | "REAPPEARED";

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
  listChange: CatalogListChange | null;
  listChangeAt: string | null;
  /** Durable "new" flag: recent NEW/REAPPEARED detection OR views < 100. */
  isNew: boolean;
}

/** A station with under this many views is still considered "new". */
export const NEW_VIEWS_THRESHOLD = 100;

export interface ListCupetsResult {
  stations: CupetListItem[];
  total: number;
  page: number;
  perPage: number;
  lastPage: number;
  recentListChanges: number;
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
  const weekAgo = new Date(Date.now() - DETECTION_WINDOW_MS);

  const conditions = [`s.active = true`];
  const filterParams: unknown[] = [];

  let filterIdx = 1;
  if (opts.provinceId != null && !Number.isNaN(opts.provinceId)) {
    conditions.push(`s."provinceId" = $${filterIdx++}`);
    filterParams.push(opts.provinceId);
  } else if (opts.watchProvinceIds && opts.watchProvinceIds.length > 0) {
    conditions.push(`s."provinceId" = ANY($${filterIdx++}::int[])`);
    filterParams.push(opts.watchProvinceIds);
  }

  if (q) {
    conditions.push(
      `(LOWER(s.name) LIKE $${filterIdx} OR LOWER(s.establishment) LIKE $${filterIdx} OR LOWER(s.municipio) LIKE $${filterIdx})`,
    );
    filterParams.push(`%${q}%`);
    filterIdx++;
  }

  const filterWhere = conditions.join(" AND ");
  const ds = await db();

  const listChangeJoin = `LEFT JOIN LATERAL (
    SELECT e.type, e."detectedAt"
    FROM "DetectionEvent" e
    WHERE e."stationId" = s.id
      AND e.type IN ('NEW', 'REAPPEARED')
      AND e."detectedAt" > $1
    ORDER BY e."detectedAt" DESC
    LIMIT 1
  ) lc ON true`;

  const mainWhere = filterWhere.replace(/\$(\d+)/g, (_, n) => `$${Number(n) + 1}`);
  const pageIdx = filterIdx + 1;
  const offsetIdx = filterIdx + 2;

  const [countRow] = (await ds.query(
    `SELECT COUNT(*)::int AS total FROM "Station" s WHERE ${filterWhere}`,
    filterParams,
  )) as Array<{ total: number }>;
  const total = countRow?.total ?? 0;

  const detection = await getDetectionCounts(
    opts.provinceId != null && !Number.isNaN(opts.provinceId) ? opts.provinceId : null,
    weekAgo,
  );
  const recentListChanges = q ? (await countFilteredListChanges(filterWhere, filterParams, weekAgo)) : detection.listChangeStations7d;

  const rows = (await ds.query(
    `SELECT
      s.id, s.name, s.establishment, s."provinceId", p.name AS "provinceName",
      s.municipio, s.disponibilidades, s."admiteSalaEspera", s.confirmed,
      s."detailCache", ss.views, ss.rating AS "snapRating",
      COALESCE(ss.views, NULLIF(s."detailCache"->>'views','')::int) AS "vcount",
      lc.type AS "listChange", lc."detectedAt" AS "listChangeAt"
     FROM "Station" s
     INNER JOIN "Province" p ON p.id = s."provinceId"
     LEFT JOIN LATERAL (
       SELECT views, rating FROM "StationSnapshot"
       WHERE "stationId" = s.id ORDER BY ts DESC LIMIT 1
     ) ss ON true
     ${listChangeJoin}
     WHERE ${mainWhere}
     ORDER BY
       CASE WHEN lc.type IS NOT NULL THEN 0 ELSE 1 END,
       CASE lc.type WHEN 'NEW' THEN 0 WHEN 'REAPPEARED' THEN 1 ELSE 2 END,
       lc."detectedAt" DESC NULLS LAST,
       CASE WHEN COALESCE(ss.views, NULLIF(s."detailCache"->>'views','')::int) < ${NEW_VIEWS_THRESHOLD} THEN 0 ELSE 1 END,
       s.disponibilidades DESC,
       s.name ASC
     LIMIT $${pageIdx} OFFSET $${offsetIdx}`,
    [weekAgo, ...filterParams, perPage, offset],
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
    vcount: number | null;
    listChange: CatalogListChange | null;
    listChangeAt: Date | null;
  }>;

  const stations: CupetListItem[] = rows.map((r) => {
    const views = r.views ?? viewsFromCache(r.detailCache) ?? r.vcount ?? null;
    return {
      id: r.id,
      name: r.name,
      establishment: r.establishment,
      provinceId: r.provinceId,
      provinceName: r.provinceName,
      municipio: r.municipio,
      disponibilidades: r.disponibilidades,
      admiteSalaEspera: r.admiteSalaEspera,
      confirmed: r.confirmed,
      views,
      rating: ratingFromCache(r.detailCache) ?? r.snapRating ?? null,
      imageUrl: imageFromCache(r.detailCache),
      listChange: r.listChange ?? null,
      listChangeAt: r.listChangeAt ? r.listChangeAt.toISOString() : null,
      isNew: r.listChange != null || (views != null && views < NEW_VIEWS_THRESHOLD),
    };
  });

  return {
    stations,
    total,
    page,
    perPage,
    lastPage: Math.max(1, Math.ceil(total / perPage)),
    recentListChanges,
  };
}

export async function listProvinces(): Promise<Array<{ id: number; name: string }>> {
  const ds = await db();
  return (await ds.query(`SELECT id, name FROM "Province" ORDER BY name ASC`)) as Array<{
    id: number;
    name: string;
  }>;
}

async function countFilteredListChanges(
  filterWhere: string,
  filterParams: unknown[],
  since: Date,
): Promise<number> {
  const ds = await db();
  const mainWhere = filterWhere.replace(/\$(\d+)/g, (_, n) => `$${Number(n) + 1}`);
  const listChangeJoin = `INNER JOIN LATERAL (
    SELECT e.type
    FROM "DetectionEvent" e
    WHERE e."stationId" = s.id
      AND e.type IN ('NEW', 'REAPPEARED')
      AND e."detectedAt" > $1
    ORDER BY e."detectedAt" DESC
    LIMIT 1
  ) lc ON true`;
  const [row] = (await ds.query(
    `SELECT COUNT(DISTINCT s.id)::int AS n
     FROM "Station" s
     ${listChangeJoin}
     WHERE ${mainWhere}`,
    [since, ...filterParams],
  )) as Array<{ n: number }>;
  return row?.n ?? 0;
}
