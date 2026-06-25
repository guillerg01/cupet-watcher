import { db, repo, Province, Station, DetectionEvent, DetectionType } from "@/infra/db";
import { createXutilClient } from "@/infra/xutil/client";
import { getScraperToken } from "@/infra/xutil/token-store";
import { runSyncProvinces } from "@/jobs/sync-provinces";
import { toFuelStation, isFuelService } from "@/core/station/map";
import { detect } from "@/core/detection/detect";
import type { PriorStationState } from "@/core/detection/types";
import { Not, In } from "typeorm";

export async function runScrapeCatalog(): Promise<{
  scanned: number;
  fuel: number;
  newEvents: number;
}> {
  const token = await getScraperToken();
  await runSyncProvinces(token);
  const client = createXutilClient();

  const raw = await client.sweepAllServices(token, (p) => {
    process.stdout.write(
      `[scrape-catalog] page ${p.page}/${p.lastPage} (${p.total} total)\n`,
    );
  });

  const scanned = raw.length;
  const fuelRaw = raw.filter(isFuelService);
  const fuel = fuelRaw.length;

  const fuelStations = fuelRaw.map(toFuelStation);

  const provinceRepo = await repo(Province);
  const provinces = await provinceRepo.find();
  const provinceMap = new Map<string, number>(
    provinces.map((p) => [p.name.trim().toUpperCase(), p.id]),
  );

  const stationRepo = await repo(Station);
  const existingStations = await stationRepo.find({
    select: {
      id: true,
      admiteSalaEspera: true,
      disponibilidades: true,
    },
  });
  const prior = new Map<number, PriorStationState>(
    existingStations.map((s) => [
      s.id,
      {
        id: s.id,
        admiteSalaEspera: s.admiteSalaEspera,
        disponibilidades: s.disponibilidades,
      },
    ]),
  );

  const eventDrafts = detect({ prior, current: fuelStations });

  const seenIds = new Set<number>();
  const BATCH = 50;
  const now = new Date();
  const dataSource = await db();

  for (let i = 0; i < fuelStations.length; i += BATCH) {
    const batch = fuelStations.slice(i, i + BATCH);

    await dataSource.transaction(async (manager) => {
      const txStationRepo = manager.getRepository(Station);

      for (const station of batch) {
        const provinceId = provinceMap.get(
          station.provinceName.trim().toUpperCase(),
        );

        if (provinceId === undefined) continue;

        seenIds.add(station.id);

        const existing = await txStationRepo.findOne({
          where: { id: station.id },
        });

        if (existing) {
          await txStationRepo.update(station.id, {
            name: station.name,
            establishment: station.establishment,
            provinceId,
            municipio: station.municipio,
            admiteSalaEspera: station.admiteSalaEspera,
            tieneValidacion: station.tieneValidacion,
            disponibilidades: station.disponibilidades,
            active: true,
            lastSeenAt: now,
          });
        } else {
          await txStationRepo.save({
            id: station.id,
            name: station.name,
            establishment: station.establishment,
            provinceId,
            municipio: station.municipio,
            admiteSalaEspera: station.admiteSalaEspera,
            tieneValidacion: station.tieneValidacion,
            disponibilidades: station.disponibilidades,
            active: true,
            firstSeenAt: now,
            lastSeenAt: now,
          });
        }
      }
    });
  }

  if (seenIds.size > 0) {
    await stationRepo.update(
      { id: Not(In(Array.from(seenIds))), active: true },
      { active: false },
    );
  }

  const eventRepo = await repo(DetectionEvent);
  let newEvents = 0;

  for (const draft of eventDrafts) {
    const provinceId = provinceMap.get(
      draft.provinceName.trim().toUpperCase(),
    );

    if (provinceId === undefined) continue;

    try {
      await eventRepo.save({
        stationId: draft.stationId,
        provinceId,
        type: draft.type as DetectionType,
        notified: false,
      });
      newEvents++;
    } catch {
      // duplicate or constraint — skip
    }
  }

  return { scanned, fuel, newEvents };
}
