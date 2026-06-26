import { db } from "@/infra/db";

// Small key/value settings persisted in AppMeta (same table the station
// baseline uses). Lets the admin tune runtime behaviour without a redeploy.

const SCAN_INTERVAL_KEY = "scan_interval_minutes";
const DEFAULT_SCAN_INTERVAL = 60;
export const ALLOWED_SCAN_INTERVALS = [30, 60] as const;

async function ensureAppMeta(): Promise<void> {
  const ds = await db();
  await ds.query(
    `CREATE TABLE IF NOT EXISTS "AppMeta" (
      key varchar PRIMARY KEY,
      value varchar NOT NULL
    )`,
  );
}

/** Minutes between catalog sweeps. Admin-tunable; falls back to the default. */
export async function getScanIntervalMinutes(): Promise<number> {
  await ensureAppMeta();
  const ds = await db();
  const [row] = (await ds.query(`SELECT value FROM "AppMeta" WHERE key = $1`, [
    SCAN_INTERVAL_KEY,
  ])) as Array<{ value: string }>;
  const n = row ? parseInt(row.value, 10) : DEFAULT_SCAN_INTERVAL;
  return (ALLOWED_SCAN_INTERVALS as readonly number[]).includes(n) ? n : DEFAULT_SCAN_INTERVAL;
}

export async function setScanIntervalMinutes(minutes: number): Promise<number> {
  if (!(ALLOWED_SCAN_INTERVALS as readonly number[]).includes(minutes)) {
    throw new Error("invalid_interval");
  }
  await ensureAppMeta();
  const ds = await db();
  await ds.query(
    `INSERT INTO "AppMeta" (key, value) VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    [SCAN_INTERVAL_KEY, String(minutes)],
  );
  return minutes;
}
