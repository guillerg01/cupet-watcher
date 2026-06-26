import { db } from "@/infra/db";
import type { FuelStation } from "@/core/station/types";
import { catalogCacheFromStation } from "@/lib/catalog-cache";

export interface StationUpsertRow {
  station: FuelStation;
  provinceId: number;
  complete: boolean;
}

export async function upsertStationRows(rows: StationUpsertRow[], now: Date): Promise<number> {
  if (rows.length === 0) return 0;

  const ds = await db();
  let count = 0;

  for (const { station, provinceId, complete } of rows) {
    const cache = JSON.stringify(catalogCacheFromStation(station));

    if (complete) {
      await ds.query(
        `INSERT INTO "Station" (
          id, name, establishment, "provinceId", municipio,
          "admiteSalaEspera", "tieneValidacion", disponibilidades,
          active, "lastSeenAt", "firstSeenAt",
          "detDisponibilidades", "detAdmiteSalaEspera", confirmed, "detailCache"
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true,$9,$9,$8,$6,true,$10::jsonb)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          establishment = EXCLUDED.establishment,
          "provinceId" = EXCLUDED."provinceId",
          municipio = EXCLUDED.municipio,
          "admiteSalaEspera" = EXCLUDED."admiteSalaEspera",
          "tieneValidacion" = EXCLUDED."tieneValidacion",
          disponibilidades = EXCLUDED.disponibilidades,
          active = true,
          "lastSeenAt" = EXCLUDED."lastSeenAt",
          "detDisponibilidades" = EXCLUDED."detDisponibilidades",
          "detAdmiteSalaEspera" = EXCLUDED."detAdmiteSalaEspera",
          confirmed = true,
          "detailCache" = COALESCE("Station"."detailCache", '{}'::jsonb) || EXCLUDED."detailCache"`,
        [
          station.id,
          station.name,
          station.establishment,
          provinceId,
          station.municipio,
          station.admiteSalaEspera,
          station.tieneValidacion,
          station.disponibilidades,
          now,
          cache,
        ],
      );
    } else {
      await ds.query(
        `INSERT INTO "Station" (
          id, name, establishment, "provinceId", municipio,
          "admiteSalaEspera", "tieneValidacion", disponibilidades,
          active, "lastSeenAt", "firstSeenAt", "detailCache"
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true,$9,$9,$10::jsonb)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          establishment = EXCLUDED.establishment,
          "provinceId" = EXCLUDED."provinceId",
          municipio = EXCLUDED.municipio,
          "admiteSalaEspera" = EXCLUDED."admiteSalaEspera",
          "tieneValidacion" = EXCLUDED."tieneValidacion",
          disponibilidades = EXCLUDED.disponibilidades,
          active = true,
          "lastSeenAt" = EXCLUDED."lastSeenAt",
          "detailCache" = COALESCE("Station"."detailCache", '{}'::jsonb) || EXCLUDED."detailCache"`,
        [
          station.id,
          station.name,
          station.establishment,
          provinceId,
          station.municipio,
          station.admiteSalaEspera,
          station.tieneValidacion,
          station.disponibilidades,
          now,
          cache,
        ],
      );
    }
    count++;
  }

  return count;
}

export async function deactivateUnseenStations(seenIds: number[]): Promise<void> {
  if (seenIds.length === 0) return;
  const ds = await db();
  await ds.query(
    `UPDATE "Station" SET active = false
     WHERE active = true AND NOT (id = ANY($1::int[]))`,
    [seenIds],
  );
}

export async function insertStationSnapshots(
  stations: FuelStation[],
  seenIds: Set<number>,
): Promise<void> {
  const ds = await db();
  for (const s of stations) {
    if (!seenIds.has(s.id)) continue;
    await ds.query(
      `INSERT INTO "StationSnapshot" (
        "stationId", disponible, disponibilidades, views, rating, "queuePosicion", "queueTotal"
      ) VALUES ($1, $2, $3, $4, $5, NULL, NULL)`,
      [s.id, s.disponibilidades > 0, s.disponibilidades, s.views ?? null, s.rating ?? null],
    );
  }
}

type StationPriorRow = {
  id: number;
  admiteSalaEspera: boolean;
  disponibilidades: number;
  active: boolean;
  provinceName: string;
};

export async function loadConfirmedStationPrior(): Promise<Map<number, StationPriorRow>> {
  const ds = await db();
  const rows = (await ds.query(
    `SELECT s.id, s."detAdmiteSalaEspera", s."detDisponibilidades", s.active, p.name AS "provinceName"
     FROM "Station" s
     INNER JOIN "Province" p ON p.id = s."provinceId"
     WHERE s.confirmed = true`,
  )) as Array<{
    id: number;
    detAdmiteSalaEspera: boolean;
    detDisponibilidades: number | null;
    active: boolean;
    provinceName: string;
  }>;

  const prior = new Map<number, StationPriorRow>();
  for (const s of rows) {
    prior.set(s.id, {
      id: s.id,
      admiteSalaEspera: s.detAdmiteSalaEspera,
      disponibilidades: s.detDisponibilidades ?? 0,
      active: s.active,
      provinceName: s.provinceName,
    });
  }
  return prior;
}

/** Any station row ever ingested — used to suppress false NEW on partial flushes. */
export async function loadKnownStationIds(): Promise<Set<number>> {
  const ds = await db();
  const rows = (await ds.query(`SELECT id FROM "Station"`)) as Array<{ id: number }>;
  return new Set(rows.map((r) => r.id));
}

/** Mark existing active stations as baseline so only future discoveries are NEW. */
export async function establishStationBaseline(): Promise<number> {
  const ds = await db();
  await ds.query(
    `CREATE TABLE IF NOT EXISTS "AppMeta" (
      key varchar PRIMARY KEY,
      value varchar NOT NULL
    )`,
  );

  const updated = (await ds.query(
    `UPDATE "Station" SET
      confirmed = true,
      "detDisponibilidades" = COALESCE("detDisponibilidades", disponibilidades),
      "detAdmiteSalaEspera" = "admiteSalaEspera"
     WHERE active = true AND confirmed = false
     RETURNING id`,
  )) as Array<{ id: number }>;

  const [flag] = (await ds.query(
    `SELECT value FROM "AppMeta" WHERE key = 'station_baseline_v1'`,
  )) as Array<{ value: string }>;

  if (!flag) {
    await ds.query(
      `INSERT INTO "AppMeta" (key, value) VALUES ('station_baseline_v1', $1)`,
      [new Date().toISOString()],
    );
  }

  return updated.length;
}
