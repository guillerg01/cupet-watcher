import { db } from "@/infra/db";

export const DETECTION_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export interface DetectionCounts {
  /** Raw NEW rows in DetectionEvent (can exceed station count). */
  newEvents7d: number;
  /** Distinct stations with at least one NEW event in the window. */
  newStations7d: number;
  /** Active stations whose latest list event in the window is NEW or REAPPEARED. */
  listChangeStations7d: number;
  /** Station rows never seen in a complete sweep — ingest state, not a discovery. */
  unconfirmedStations: number;
  activeUnconfirmed: number;
}

function provinceClause(
  provinceId: number | null | undefined,
  col: string,
): { sql: string; params: unknown[] } {
  if (provinceId != null && !Number.isNaN(provinceId)) {
    return { sql: `AND ${col} = $2`, params: [provinceId] };
  }
  return { sql: "", params: [] };
}

export async function getDetectionCounts(
  provinceId: number | null = null,
  since = new Date(Date.now() - DETECTION_WINDOW_MS),
): Promise<DetectionCounts> {
  const ds = await db();
  const prov = provinceClause(provinceId, 'e."provinceId"');
  const provStation = provinceClause(provinceId, 's."provinceId"');

  const [eventRow] = (await ds.query(
    `SELECT
      COUNT(*) FILTER (WHERE e.type = 'NEW')::int AS "newEvents7d",
      COUNT(DISTINCT e."stationId") FILTER (WHERE e.type = 'NEW')::int AS "newStations7d"
     FROM "DetectionEvent" e
     WHERE e."detectedAt" > $1 ${prov.sql}`,
    [since, ...prov.params],
  )) as Array<{ newEvents7d: number; newStations7d: number }>;

  const [stationRow] = (await ds.query(
    `SELECT
      COUNT(*)::int AS "unconfirmedStations",
      COUNT(*) FILTER (WHERE active)::int AS "activeUnconfirmed"
     FROM "Station" s
     WHERE NOT s.confirmed ${provStation.sql.replace("$2", "$1")}`,
    provStation.params.length ? provStation.params : [],
  )) as Array<{ unconfirmedStations: number; activeUnconfirmed: number }>;

  const listChangeJoin = `INNER JOIN LATERAL (
    SELECT e.type
    FROM "DetectionEvent" e
    WHERE e."stationId" = s.id
      AND e.type IN ('NEW', 'REAPPEARED')
      AND e."detectedAt" > $1
    ORDER BY e."detectedAt" DESC
    LIMIT 1
  ) lc ON true`;

  const [listRow] = (await ds.query(
    `SELECT COUNT(DISTINCT s.id)::int AS n
     FROM "Station" s
     ${listChangeJoin}
     WHERE s.active = true ${provStation.sql}`,
    [since, ...provStation.params],
  )) as Array<{ n: number }>;

  return {
    newEvents7d: eventRow?.newEvents7d ?? 0,
    newStations7d: eventRow?.newStations7d ?? 0,
    listChangeStations7d: listRow?.n ?? 0,
    unconfirmedStations: stationRow?.unconfirmedStations ?? 0,
    activeUnconfirmed: stationRow?.activeUnconfirmed ?? 0,
  };
}
