import { prisma } from "@/infra/db/prisma";
import { createXutilClient } from "@/infra/xutil/client";
import { getScraperToken } from "@/infra/xutil/token-store";
import { toFuelStation, isFuelService } from "@/core/station/map";
import { detect } from "@/core/detection/detect";
import type { PriorStationState } from "@/core/detection/types";

export async function runScrapeCatalog(): Promise<{
  scanned: number;
  fuel: number;
  newEvents: number;
}> {
  const token = await getScraperToken();
  const client = createXutilClient();

  console.log("[scrape-catalog] Sweeping all services…");
  const raw = await client.sweepAllServices(token, (p) => {
    console.log(
      `[scrape-catalog] page ${p.page}/${p.lastPage} (${p.total} total)`,
    );
  });

  const scanned = raw.length;
  const fuelRaw = raw.filter(isFuelService);
  const fuel = fuelRaw.length;
  console.log(`[scrape-catalog] ${scanned} services scanned, ${fuel} fuel`);

  const fuelStations = fuelRaw.map(toFuelStation);

  // Build province name->id map (normalized: trim().toUpperCase())
  const provinces = await prisma.province.findMany();
  const provinceMap = new Map<string, number>(
    provinces.map((p) => [p.name.trim().toUpperCase(), p.id]),
  );

  // Build prior state from DB
  const existingStations = await prisma.station.findMany({
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

  // Detect events
  const eventDrafts = detect({ prior, current: fuelStations });
  console.log(`[scrape-catalog] ${eventDrafts.length} events detected`);

  const seenIds = new Set<number>();

  // Upsert stations in batches to avoid blowing memory
  const BATCH = 50;
  const now = new Date();

  for (let i = 0; i < fuelStations.length; i += BATCH) {
    const batch = fuelStations.slice(i, i + BATCH);

    await prisma.$transaction(async (tx) => {
      for (const station of batch) {
        const provinceId = provinceMap.get(
          station.provinceName.trim().toUpperCase(),
        );

        if (provinceId === undefined) {
          console.warn(
            `[scrape-catalog] Province not found: "${station.provinceName}" — skipping station ${station.id}`,
          );
          continue;
        }

        seenIds.add(station.id);

        await tx.station.upsert({
          where: { id: station.id },
          create: {
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
          },
          update: {
            name: station.name,
            establishment: station.establishment,
            provinceId,
            municipio: station.municipio,
            admiteSalaEspera: station.admiteSalaEspera,
            tieneValidacion: station.tieneValidacion,
            disponibilidades: station.disponibilidades,
            active: true,
            lastSeenAt: now,
          },
        });
      }
    });
  }

  // Mark unseen stations as inactive
  if (seenIds.size > 0) {
    await prisma.station.updateMany({
      where: { id: { notIn: Array.from(seenIds) }, active: true },
      data: { active: false },
    });
  }

  // Persist detection events
  let newEvents = 0;
  for (const draft of eventDrafts) {
    const provinceId = provinceMap.get(
      draft.provinceName.trim().toUpperCase(),
    );

    if (provinceId === undefined) {
      console.warn(
        `[scrape-catalog] Province not found for event: "${draft.provinceName}" — skipping`,
      );
      continue;
    }

    try {
      await prisma.detectionEvent.create({
        data: {
          stationId: draft.stationId,
          provinceId,
          type: draft.type,
          notified: false,
        },
      });
      newEvents++;
    } catch (err) {
      console.error(
        `[scrape-catalog] Failed to create event for station ${draft.stationId}:`,
        err,
      );
    }
  }

  return { scanned, fuel, newEvents };
}
