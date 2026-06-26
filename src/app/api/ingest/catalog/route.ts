import { NextResponse } from "next/server";
import { z } from "zod";
import { repo, Province, Assignment, AssignmentStatus, DetectionType, db } from "@/infra/db";
import { newId } from "@/infra/db/id";
import { deviceFromRequest } from "@/lib/device-auth";
import { detect } from "@/core/detection/detect";
import type { PriorStationState } from "@/core/detection/types";
import type { FuelStation } from "@/core/station/types";
import {
  upsertStationRows,
  deactivateUnseenStations,
  insertStationSnapshots,
  loadConfirmedStationPrior,
} from "@/lib/ingest-stations";
import { notifyMobileDevices } from "@/lib/device-notify";

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
  complete: z.boolean().default(false),
  provinces: z.array(z.object({ id: z.number().int(), name: z.string() })).optional(),
  stations: z.array(stationSchema).max(5000),
});

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

    if (provinces && provinces.length > 0) {
      for (const p of provinces) {
        await provinceRepo.upsert({ id: p.id, name: p.name.trim() }, ["id"]);
      }
    }

    const allProvinces = await provinceRepo.find();
    const provinceMap = new Map<string, number>(
      allProvinces.map((p) => [p.name.trim().toUpperCase(), p.id]),
    );

    const priorRaw = await loadConfirmedStationPrior();
    const prior = new Map<number, PriorStationState>(priorRaw);

    const isFirstSweep = prior.size === 0;
    const eventDrafts = complete && !isFirstSweep ? detect({ prior, current }) : [];

    const seenIds = new Set<number>();
    const now = new Date();
    const BATCH = 50;
    const upsertBatch: Parameters<typeof upsertStationRows>[0] = [];

    for (const station of current) {
      const provinceId = provinceMap.get(station.provinceName.trim().toUpperCase());
      if (provinceId === undefined) continue;
      seenIds.add(station.id);
      upsertBatch.push({ station, provinceId, complete });
    }

    for (let i = 0; i < upsertBatch.length; i += BATCH) {
      await upsertStationRows(upsertBatch.slice(i, i + BATCH), now);
    }

    if (complete && seenIds.size > 0) {
      await deactivateUnseenStations(Array.from(seenIds));
    }

    await insertStationSnapshots(current, seenIds);

    const dataSource = await db();
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
        await dataSource.query(
          `INSERT INTO "DetectionEvent" (id, "stationId", "provinceId", type, notified)
           VALUES ($1, $2, $3, $4, false)`,
          [newId(), draft.stationId, provinceId, draft.type],
        );
        newEvents++;

        const name = stationNameById.get(draft.stationId) ?? `Cupet #${draft.stationId}`;
        if (draft.type === DetectionType.NEW) {
          newCupets.push({
            stationId: draft.stationId,
            name,
            provinceId,
            provinceName: draft.provinceName,
            type: draft.type,
          });
        }

        const title =
          draft.type === DetectionType.NEW
            ? "Cupet nuevo"
            : draft.type === DetectionType.BECAME_AVAILABLE
              ? "Cupet con disponibilidad"
              : "Sala de espera habilitada";

        await notifyMobileDevices({
          title,
          body: `${name} · ${draft.provinceName}`,
          provinceId,
        });
      } catch {
        /* duplicate / constraint */
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
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[ingest/catalog] ${message}\n`);
    return NextResponse.json({ error: "ingest_failed", message }, { status: 500 });
  }
}
