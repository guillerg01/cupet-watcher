import { NextResponse } from "next/server";
import { z } from "zod";
import { AssignmentStatus, DetectionType, db } from "@/infra/db";
import { newId } from "@/infra/db/id";
import { deviceFromRequest } from "@/lib/device-auth";
import { detect, detectDepartures } from "@/core/detection/detect";
import type { PriorStationState } from "@/core/detection/types";
import type { FuelStation } from "@/core/station/types";
import {
  upsertStationRows,
  deactivateUnseenStations,
  insertStationSnapshots,
  loadConfirmedStationPrior,
  loadKnownStationIds,
} from "@/lib/ingest-stations";
import { notifyMobileDevices } from "@/lib/device-notify";
import {
  detectionPushBody,
  detectionPushTitle,
  summarizeDetectionEvents,
} from "@/lib/detection-labels";

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
  imageUrl: z.string().nullable().optional(),
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

    // Anti-poisoning gate: detection, deactivation and notifications only run
    // for sweeps backed by a real coordinator assignment for THIS device. An
    // unassigned/manual sweep can still refresh station data, but cannot emit
    // false NEW alerts or mass-deactivate the catalog.
    let assignmentValid = false;
    if (assignmentId) {
      const dsAuth = await db();
      const [arow] = (await dsAuth.query(
        `SELECT 1 FROM "Assignment" WHERE id = $1 AND "deviceId" = $2 LIMIT 1`,
        [assignmentId, auth.deviceId],
      )) as Array<{ "?column?": number }>;
      assignmentValid = !!arow;
    }
    const trusted = complete && assignmentValid;
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
      imageUrl: s.imageUrl ?? null,
    }));

    const dataSource = await db();

    if (provinces && provinces.length > 0) {
      for (const p of provinces) {
        await dataSource.query(
          `INSERT INTO "Province" (id, name) VALUES ($1, $2)
           ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
          [p.id, p.name.trim()],
        );
      }
    }

    const provinceRows = (await dataSource.query(`SELECT id, name FROM "Province"`)) as Array<{
      id: number;
      name: string;
    }>;
    const provinceMap = new Map<string, number>(
      provinceRows.map((p) => [p.name.trim().toUpperCase(), p.id]),
    );

    const mappableCurrent = current.filter(
      (s) => provinceMap.get(s.provinceName.trim().toUpperCase()) !== undefined,
    );
    const seenIds = new Set(mappableCurrent.map((s) => s.id));

    const priorRaw = await loadConfirmedStationPrior();
    const prior = new Map<number, PriorStationState>(priorRaw);
    const knownStationIds = await loadKnownStationIds();

    const [baseline] = (await dataSource.query(
      `SELECT EXISTS(SELECT 1 FROM "Station" WHERE confirmed = true) AS ready`,
    )) as Array<{ ready: boolean }>;
    const isFirstSweep = !baseline?.ready;
    const rawArrivals =
      trusted && !isFirstSweep ? detect({ prior, current: mappableCurrent }) : [];
    const arrivalDrafts = rawArrivals.filter(
      (d) => !(d.type === "NEW" && knownStationIds.has(d.stationId)),
    );
    const departureDrafts =
      trusted && !isFirstSweep
        ? detectDepartures(prior, seenIds)
        : [];
    const eventDrafts = [...arrivalDrafts, ...departureDrafts];
    const eventSummary = summarizeDetectionEvents(eventDrafts);

    const now = new Date();
    const BATCH = 50;
    const upsertBatch: Parameters<typeof upsertStationRows>[0] = [];

    for (const station of mappableCurrent) {
      const provinceId = provinceMap.get(station.provinceName.trim().toUpperCase())!;
      upsertBatch.push({ station, provinceId, complete });
    }

    for (let i = 0; i < upsertBatch.length; i += BATCH) {
      await upsertStationRows(upsertBatch.slice(i, i + BATCH), now);
    }

    if (trusted && seenIds.size > 0) {
      await deactivateUnseenStations(Array.from(seenIds));
    }

    await insertStationSnapshots(current, seenIds);

    let newEvents = 0;
    const newCupets: Array<{
      stationId: number;
      name: string;
      provinceId: number;
      provinceName: string;
      type: string;
    }> = [];

    const stationNameById = new Map(current.map((s) => [s.id, s.name]));
    const departedIds = departureDrafts.map((d) => d.stationId);
    const departedNameById = new Map<number, string>();
    if (departedIds.length > 0) {
      const departedRows = (await dataSource.query(
        `SELECT id, name FROM "Station" WHERE id = ANY($1::int[])`,
        [departedIds],
      )) as Array<{ id: number; name: string }>;
      for (const row of departedRows) departedNameById.set(row.id, row.name);
    }

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

        const name = stationNameById.get(draft.stationId) ?? departedNameById.get(draft.stationId) ?? `Cupet #${draft.stationId}`;
        if (
          draft.type === DetectionType.NEW ||
          draft.type === DetectionType.REAPPEARED ||
          draft.type === DetectionType.DEPARTED
        ) {
          newCupets.push({
            stationId: draft.stationId,
            name,
            provinceId,
            provinceName: draft.provinceName,
            type: draft.type,
          });
        }

        await notifyMobileDevices({
          title: detectionPushTitle(draft.type),
          body: detectionPushBody(draft.type, name, draft.provinceName),
          provinceId,
        });
      } catch {
        /* duplicate / constraint */
      }
    }

    if (assignmentId && complete) {
      await dataSource.query(
        `UPDATE "Assignment" SET status = $1, "completedAt" = $2
         WHERE id = $3 AND "deviceId" = $4
           AND status IN ($5, $6, $7)`,
        [
          AssignmentStatus.DONE,
          now,
          assignmentId,
          auth.deviceId,
          AssignmentStatus.PENDING,
          AssignmentStatus.CLAIMED,
          AssignmentStatus.EXPIRED,
        ],
      );
    }

    return NextResponse.json({
      stations: current.length,
      seen: seenIds.size,
      newEvents,
      eventSummary,
      newCupets,
      complete,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[ingest/catalog] ${message}\n`);
    return NextResponse.json({ error: "ingest_failed", message }, { status: 500 });
  }
}
