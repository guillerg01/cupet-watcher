import { db } from "@/infra/db";

export interface PendingAlert {
  stationId: number;
  name: string;
  establishment: string;
  provinceName: string;
  municipio: string | null;
  type: "NEW" | "REAPPEARED";
  detectedAt: string;
  imageUrl: string | null;
}

// Only surface detections from the last week as "pending" so a user who never
// opened the app doesn't get an avalanche of ancient events.
export const ALERT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function imageFromCache(cache: unknown): string | null {
  if (!cache || typeof cache !== "object") return null;
  const c = cache as { image_urls?: string[]; image_url?: string };
  if (Array.isArray(c.image_urls) && c.image_urls[0]) return c.image_urls[0];
  if (typeof c.image_url === "string" && c.image_url) return c.image_url;
  return null;
}

/**
 * New cupets the user hasn't acknowledged: NEW/REAPPEARED detections in their
 * watched provinces, detected after lastAlertsSeenAt (and within the window).
 * One row per station (latest event). Drives both the in-app modal and the
 * recurring push reminder.
 */
export async function getPendingAlerts(userId: string): Promise<{
  alerts: PendingAlert[];
  count: number;
}> {
  const ds = await db();
  const since = new Date(Date.now() - ALERT_WINDOW_MS);

  const rows = (await ds.query(
    `
    SELECT t."stationId", t.name, t.establishment, t."provinceName", t.municipio,
           t.type, t."detectedAt", t."detailCache"
    FROM (
      SELECT DISTINCT ON (e."stationId")
        e."stationId", s.name, s.establishment, p.name AS "provinceName",
        s.municipio, e.type, e."detectedAt", s."detailCache"
      FROM "DetectionEvent" e
      INNER JOIN "Station" s ON s.id = e."stationId"
      INNER JOIN "Province" p ON p.id = e."provinceId"
      INNER JOIN "UserProvince" up ON up."provinceId" = e."provinceId"
      INNER JOIN "AppUser" u ON u.id = up."userId"
      WHERE up."userId" = $1
        AND u."notifyNew" = true
        AND s.active = true
        AND e.type IN ('NEW', 'REAPPEARED')
        AND e."detectedAt" > GREATEST(COALESCE(u."lastAlertsSeenAt", to_timestamp(0)), $2)
      ORDER BY e."stationId", e."detectedAt" DESC
    ) t
    ORDER BY t."detectedAt" DESC
    LIMIT 50
    `,
    [userId, since],
  )) as Array<{
    stationId: number;
    name: string;
    establishment: string;
    provinceName: string;
    municipio: string | null;
    type: "NEW" | "REAPPEARED";
    detectedAt: Date;
    detailCache: unknown;
  }>;

  const alerts: PendingAlert[] = rows.map((r) => ({
    stationId: r.stationId,
    name: r.name,
    establishment: r.establishment,
    provinceName: r.provinceName,
    municipio: r.municipio,
    type: r.type,
    detectedAt: r.detectedAt.toISOString(),
    imageUrl: imageFromCache(r.detailCache),
  }));

  return { alerts, count: alerts.length };
}

/** User opened the app and dismissed the modal → stop the recurring reminder. */
export async function ackAlerts(userId: string): Promise<void> {
  const ds = await db();
  await ds.query(`UPDATE "AppUser" SET "lastAlertsSeenAt" = now() WHERE id = $1`, [userId]);
}

/** Users with at least one pending alert + a device push token (for reminders). */
export async function getUsersWithPendingAlerts(): Promise<
  Array<{ userId: string; email: string; count: number; pushTokens: string[] }>
> {
  const ds = await db();
  const since = new Date(Date.now() - ALERT_WINDOW_MS);

  const rows = (await ds.query(
    `
    SELECT u.id AS "userId", u.email,
           COUNT(DISTINCT e."stationId")::int AS count,
           COALESCE(
             ARRAY_AGG(DISTINCT d."pushToken") FILTER (WHERE d."pushToken" IS NOT NULL),
             '{}'
           ) AS "pushTokens"
    FROM "AppUser" u
    INNER JOIN "UserProvince" up ON up."userId" = u.id
    INNER JOIN "DetectionEvent" e
      ON e."provinceId" = up."provinceId"
      AND e.type IN ('NEW', 'REAPPEARED')
      AND e."detectedAt" > GREATEST(COALESCE(u."lastAlertsSeenAt", to_timestamp(0)), $1)
    INNER JOIN "Station" s ON s.id = e."stationId" AND s.active = true
    LEFT JOIN "Device" d ON d."xutilUsername" = u.email
    WHERE u."notifyNew" = true
    GROUP BY u.id, u.email
    `,
    [since],
  )) as Array<{ userId: string; email: string; count: number; pushTokens: string[] }>;

  return rows.map((r) => ({
    userId: r.userId,
    email: r.email,
    count: r.count,
    pushTokens: Array.isArray(r.pushTokens) ? r.pushTokens.filter(Boolean) : [],
  }));
}
