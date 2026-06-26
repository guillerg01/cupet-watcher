import { db } from "@/infra/db";
import type { FuelStation } from "@/core/station/types";

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
    if (complete) {
      await ds.query(
        `INSERT INTO "Station" (
          id, name, establishment, "provinceId", municipio,
          "admiteSalaEspera", "tieneValidacion", disponibilidades,
          active, "lastSeenAt", "firstSeenAt",
          "detDisponibilidades", "detAdmiteSalaEspera", confirmed
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true,$9,$9,$8,$6,true)
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
          confirmed = true`,
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
        ],
      );
    } else {
      await ds.query(
        `INSERT INTO "Station" (
          id, name, establishment, "provinceId", municipio,
          "admiteSalaEspera", "tieneValidacion", disponibilidades,
          active, "lastSeenAt", "firstSeenAt"
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true,$9,$9)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          establishment = EXCLUDED.establishment,
          "provinceId" = EXCLUDED."provinceId",
          municipio = EXCLUDED.municipio,
          "admiteSalaEspera" = EXCLUDED."admiteSalaEspera",
          "tieneValidacion" = EXCLUDED."tieneValidacion",
          disponibilidades = EXCLUDED.disponibilidades,
          active = true,
          "lastSeenAt" = EXCLUDED."lastSeenAt"`,
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

export async function loadConfirmedStationPrior(): Promise<
  Map<number, { id: number; admiteSalaEspera: boolean; disponibilidades: number }>
> {
  const ds = await db();
  const rows = (await ds.query(
    `SELECT id, "detAdmiteSalaEspera", "detDisponibilidades"
     FROM "Station" WHERE confirmed = true`,
  )) as Array<{
    id: number;
    detAdmiteSalaEspera: boolean;
    detDisponibilidades: number | null;
  }>;

  const prior = new Map<number, { id: number; admiteSalaEspera: boolean; disponibilidades: number }>();
  for (const s of rows) {
    prior.set(s.id, {
      id: s.id,
      admiteSalaEspera: s.detAdmiteSalaEspera,
      disponibilidades: s.detDisponibilidades ?? 0,
    });
  }
  return prior;
}
