import { db } from "@/infra/db";

export interface CupetStats {
  totalActive: number;
  withAvailability: number;
  withoutAvailability: number;
  recentNew: number;
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
}

export async function getCupetStats(provinceId: number | null = null): Promise<CupetStats> {
  const ds = await db();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const onlineSince = new Date(Date.now() - 5 * 60 * 1000);

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

  const [recentRow] = (await ds.query(
    `SELECT COUNT(*)::int AS "recentNew"
     FROM "DetectionEvent" e
     WHERE e."detectedAt" > $1 AND e.type = 'NEW'
     ${provinceId != null && !Number.isNaN(provinceId) ? `AND e."provinceId" = ${provinceId}` : ""}`,
    [weekAgo],
  )) as Array<{ recentNew: number }>;

  const [workersRow] = (await ds.query(
    `SELECT COUNT(*)::int AS "onlineWorkers"
     FROM "Device" WHERE "lastHeartbeatAt" > $1 AND "ticketLinked" = true`,
    [onlineSince],
  )) as Array<{ onlineWorkers: number }>;

  let devicesWatching = 0;
  if (provinceId != null && !Number.isNaN(provinceId)) {
    const devices = (await ds.query(
      `SELECT "watchProvinceIds" FROM "Device" WHERE "ticketLinked" = true`,
    )) as Array<{ watchProvinceIds: number[] | null }>;
    devicesWatching = devices.filter((d) => {
      const w = d.watchProvinceIds ?? [];
      return w.length === 0 || w.includes(provinceId);
    }).length;
  }

  return {
    totalActive,
    withAvailability,
    withoutAvailability: totalActive - withAvailability,
    recentNew: recentRow?.recentNew ?? 0,
    totalViews: viewsRow?.totalViews ?? 0,
    onlineWorkers: workersRow?.onlineWorkers ?? 0,
    devicesWatching,
    provinceId,
    byProvince,
  };
}
