import { db } from "@/infra/db";
import { DETECTION_WINDOW_MS, getDetectionCounts } from "@/lib/detection-stats";

export interface CupetStats {
  totalActive: number;
  withAvailability: number;
  withoutAvailability: number;
  /** Distinct stations with a NEW detection in the last 7 days. */
  recentNew: number;
  /** Active stations flagged NEW or REAPPEARED in the catalog (last 7 days). */
  recentListChanges: number;
  /** Stations not yet confirmed by a complete sweep — not new discoveries. */
  unconfirmedStations: number;
  totalViews: number;
  onlineWorkers: number;
  devicesWatching: number;
  provinceId: number | null;
  byProvince: Array<{
    provinceId: number;
    provinceName: string;
    total: number;
    available: number;
    views: number;
  }>;
  queueStats: Array<{
    stationId: number;
    stationName: string;
    avgFill: number;
  }>;
  detectionTrend: Array<{
    day: string;
    count: number;
  }>;
}

export async function getCupetStats(provinceId: number | null = null): Promise<CupetStats> {
  const ds = await db();
  const weekAgo = new Date(Date.now() - DETECTION_WINDOW_MS);
  const onlineSince = new Date(Date.now() - 5 * 60 * 1000);
  const detection = await getDetectionCounts(provinceId, weekAgo);

  const stationWhere =
    provinceId != null && !Number.isNaN(provinceId)
      ? `s.active = true AND s."provinceId" = ${provinceId}`
      : `s.active = true`;

  const [totals] = (await ds.query(
    `SELECT
      COUNT(*)::int AS "totalActive",
      SUM(CASE WHEN s.disponibilidades > 0 THEN 1 ELSE 0 END)::int AS "withAvailability"
     FROM "Station" s WHERE ${stationWhere}`,
  )) as Array<{ totalActive: number; withAvailability: number }>;

  const totalActive = totals?.totalActive ?? 0;
  const withAvailability = totals?.withAvailability ?? 0;

  const byProvince = (await ds.query(
    `SELECT p.id AS "provinceId", p.name AS "provinceName",
      COUNT(s.id)::int AS total,
      SUM(CASE WHEN s.disponibilidades > 0 THEN 1 ELSE 0 END)::int AS available,
      COALESCE(SUM(ss.views), 0)::int AS views
     FROM "Station" s
     INNER JOIN "Province" p ON p.id = s."provinceId"
     LEFT JOIN LATERAL (
       SELECT views FROM "StationSnapshot"
       WHERE "stationId" = s.id ORDER BY ts DESC LIMIT 1
     ) ss ON true
     WHERE s.active = true
     GROUP BY p.id, p.name
     ORDER BY total DESC`,
  )) as CupetStats["byProvince"];

  const [viewsRow] = (await ds.query(
    `SELECT COALESCE(SUM(latest.views), 0)::int AS "totalViews"
     FROM "Station" s
     LEFT JOIN LATERAL (
       SELECT views FROM "StationSnapshot"
       WHERE "stationId" = s.id ORDER BY ts DESC LIMIT 1
     ) latest ON true
     WHERE ${stationWhere}`,
  )) as Array<{ totalViews: number }>;

  const [workersRow] = (await ds.query(
    `SELECT COUNT(*)::int AS "onlineWorkers"
     FROM "Device" WHERE "lastHeartbeatAt" > $1`,
    [onlineSince],
  )) as Array<{ onlineWorkers: number }>;

  let devicesWatching = 0;
  if (provinceId != null && !Number.isNaN(provinceId)) {
    const devices = (await ds.query(
      `SELECT "watchProvinceIds" FROM "Device"`,
    )) as Array<{ watchProvinceIds: number[] | null }>;
    devicesWatching = devices.filter((d) => {
      const w = d.watchProvinceIds ?? [];
      return w.length === 0 || w.includes(provinceId);
    }).length;
  }

  const provinceFilter =
    provinceId != null && !Number.isNaN(provinceId) ? `AND st."provinceId" = ${provinceId}` : "";

  const queueStats = (await ds.query(
    `SELECT
      ss."stationId" AS "stationId",
      st.name AS "stationName",
      AVG(CASE WHEN ss."queueTotal" > 0 THEN ss."queuePosicion"::float / ss."queueTotal" ELSE NULL END)::float AS "avgFill"
     FROM "StationSnapshot" ss
     JOIN "Station" st ON st.id = ss."stationId"
     WHERE ss.ts > NOW() - INTERVAL '7 days'
       AND ss."queueTotal" > 0
       ${provinceFilter}
     GROUP BY ss."stationId", st.name
     HAVING COUNT(*) >= 5
     ORDER BY "avgFill" ASC
     LIMIT 10`,
  )) as CupetStats["queueStats"];

  const detectionRows = (await ds.query(
    `SELECT DATE_TRUNC('day', "detectedAt") AS day, COUNT(*)::int AS count
     FROM "DetectionEvent"
     WHERE "detectedAt" > NOW() - INTERVAL '14 days'
     ${provinceId != null && !Number.isNaN(provinceId) ? `AND "provinceId" = ${provinceId}` : ""}
     GROUP BY 1
     ORDER BY 1 ASC`,
  )) as Array<{ day: Date; count: number }>;

  const detectionTrend = detectionRows.map((d) => ({
    day: d.day.toISOString(),
    count: d.count,
  }));

  return {
    totalActive,
    withAvailability,
    withoutAvailability: totalActive - withAvailability,
    recentNew: detection.newStations7d,
    recentListChanges: detection.listChangeStations7d,
    unconfirmedStations: detection.unconfirmedStations,
    totalViews: viewsRow?.totalViews ?? 0,
    onlineWorkers: workersRow?.onlineWorkers ?? 0,
    devicesWatching,
    provinceId,
    byProvince,
    queueStats,
    detectionTrend,
  };
}
