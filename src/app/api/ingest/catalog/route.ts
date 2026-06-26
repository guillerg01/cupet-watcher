import { NextResponse } from "next/server";
import { z } from "zod";
import { Not, In } from "typeorm";
import {
  repo,
  Province,
  Station,
  StationSnapshot,
  DetectionEvent,
  Assignment,
  AssignmentStatus,
  DetectionType,
} from "@/infra/db";
import { deviceFromRequest } from "@/lib/device-auth";
import { detect } from "@/core/detection/detect";
import type { PriorStationState } from "@/core/detection/types";
import type { FuelStation } from "@/core/station/types";

export const dynamic = "force-dynamic";

const stationSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  establishment: z.string(),
  provinceName: z.string(),
  municipio: z.string().nullable().optional(),
  admiteSalaEspera: z.boolean(),
  tieneValidacion: z.boolean(),
  disponibilidades: z.number().int().min(0),
  rating: z.number().nullable().optional(),
  views: z.number().int().nullable().optional(),
});

const schema = z.object({
  assignmentId: z.string().optional(),
  // true when the phone swept the whole catalog (safe to deactivate unseen stations)
  complete: z.boolean().default(false),
  provinces: z.array(z.object({ id: z.number().int(), name: z.string() })).optional(),
  stations: z.array(stationSchema).max(5000),
});

/**
 * Catalog ingest — the heart of "is there a new cupet?".
 * Port of jobs/scrape-catalog.ts, fed by the phone (Cuban IP) instead of the server.
 * Upserts fuel stations, runs the pure detect() diff, emits DetectionEvents.
 */
export async function POST(req: Request): Promise<Response> {
  try {
    const auth = deviceFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_body", detail: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { assignmentId, complete, provinces, stations } = parsed.data;
  const current: FuelStation[] = stations.map((s) => ({
    id: s.id,
    name: s.name,
    establishment: s.establishment,
    provinceName: s.provinceName,
    municipio: s.municipio ?? null,
    admiteSalaEspera: s.admiteSalaEspera,
    tieneValidacion: s.tieneValidacion,
    disponibilidades: s.disponibilidades,
    rating: s.rating ?? null,
    views: s.views ?? null,
  }));

  const provinceRepo = await repo(Province);

  // Phone may send the province catalog so IDs resolve even before a seed runs.
  if (provinces && provinces.length > 0) {
    for (const p of provinces) {
      await provinceRepo.upsert({ id: p.id, name: p.name.trim() }, ["id"]);
    }
  }

  const allProvinces = await provinceRepo.find();
  const provinceMap = new Map<string, number>(
    allProvinces.map((p) => [p.name.trim().toUpperCase(), p.id]),
  );

  const stationRepo = await repo(Station);
  const existingStations = await stationRepo.find({
    select: { id: true, detAdmiteSalaEspera: true, detDisponibilidades: true, confirmed: true },
  });
  // Detection prior = the baseline from the last COMPLETE sweep. Only CONFIRMED
  // stations count, so a station inserted by a partial flush this sweep is still
  // detected as NEW on the complete flush, and partials never pollute the diff.
  const prior = new Map<number, PriorStationState>(
    existingStations
      .filter((s) => s.confirmed)
      .map((s) => [
        s.id,
        {
          id: s.id,
          admiteSalaEspera: s.detAdmiteSalaEspera,
          disponibilidades: s.detDisponibilidades ?? 0,
        },
      ]),
  );

  // Detection runs ONLY on a complete sweep (full set). Cold start: the first
  // complete sweep (no confirmed stations yet) is a BASELINE — no events, else
  // every station would diff as NEW and flood notifications.
  const isFirstSweep = prior.size === 0;
  const eventDrafts = complete && !isFirstSweep ? detect({ prior, current }) : [];

  const seenIds = new Set<number>();
  const now = new Date();
  const BATCH = 50;
  const existingIdSet = new Set(
    (await stationRepo.find({ select: { id: true } })).map((s) => s.id),
  );

  for (let i = 0; i < current.length; i += BATCH) {
    const batch = current.slice(i, i + BATCH);
    for (const station of batch) {
      const provinceId = provinceMap.get(station.provinceName.trim().toUpperCase());
      if (provinceId === undefined) continue;
      seenIds.add(station.id);

      const common = {
        name: station.name,
        establishment: station.establishment,
        provinceId,
        municipio: station.municipio,
        admiteSalaEspera: station.admiteSalaEspera,
        tieneValidacion: station.tieneValidacion,
        disponibilidades: station.disponibilidades,
        active: true,
        lastSeenAt: now,
        ...(complete
          ? {
              detDisponibilidades: station.disponibilidades,
              detAdmiteSalaEspera: station.admiteSalaEspera,
              confirmed: true,
            }
          : {}),
      };
      if (existingIdSet.has(station.id)) {
        await stationRepo.update(station.id, common);
      } else {
        existingIdSet.add(station.id);
        await stationRepo.save({ id: station.id, ...common, firstSeenAt: now });
      }
    }
  }

  // Only deactivate unseen stations when the phone reports a COMPLETE sweep —
  // a partial sweep must not wipe the active set.
  if (complete && seenIds.size > 0) {
    await stationRepo.update(
      { id: Not(In(Array.from(seenIds))), active: true },
      { active: false },
    );
  }

  // Lightweight availability snapshots from the catalog data.
  const snapshotRepo = await repo(StationSnapshot);
  for (const s of current) {
    if (!seenIds.has(s.id)) continue;
    await snapshotRepo.save({
      stationId: s.id,
      disponible: s.disponibilidades > 0,
      disponibilidades: s.disponibilidades,
      views: s.views,
      rating: s.rating,
      queuePosicion: null,
      queueTotal: null,
    });
  }

  const eventRepo = await repo(DetectionEvent);
  let newEvents = 0;
  const newCupets: Array<{
    stationId: number;
    name: string;
    provinceId: number;
    provinceName: string;
    type: string;
  }> = [];

  const stationNameById = new Map(current.map((s) => [s.id, s.name]));

  for (const draft of eventDrafts) {
    const provinceId = provinceMap.get(draft.provinceName.trim().toUpperCase());
    if (provinceId === undefined) continue;
    try {
      await eventRepo.save({
        stationId: draft.stationId,
        provinceId,
        type: draft.type as DetectionType,
        notified: false,
      });
      newEvents++;
      if (draft.type === DetectionType.NEW) {
        newCupets.push({
          stationId: draft.stationId,
          name: stationNameById.get(draft.stationId) ?? `Cupet #${draft.stationId}`,
          provinceId,
          provinceName: draft.provinceName,
          type: draft.type,
        });
      }
    } catch {
      // duplicate / constraint — ignore
    }
  }

  if (assignmentId) {
    const assignmentRepo = await repo(Assignment);
    await assignmentRepo.update(
      { id: assignmentId, deviceId: auth.deviceId },
      { status: AssignmentStatus.DONE, completedAt: now },
    );
  }

  return NextResponse.json({
    stations: current.length,
    seen: seenIds.size,
    newEvents,
    newCupets,
    complete,
  });
  } catch (err) {
    process.stderr.write(`[ingest/catalog] ${String(err)}\n`);
    return NextResponse.json({ error: "ingest_failed", message: String(err) }, { status: 500 });
  }
}
