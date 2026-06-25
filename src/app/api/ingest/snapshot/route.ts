import { NextResponse } from "next/server";
import { z } from "zod";
import {
  repo,
  Station,
  StationSnapshot,
  DetectionEvent,
  Assignment,
  AssignmentStatus,
  DetectionType,
} from "@/infra/db";
import { deviceFromRequest } from "@/lib/device-auth";
import { detectFromSnapshot } from "@/core/detection/ingest";

export const dynamic = "force-dynamic";

const snapshotSchema = z.object({
  stationId: z.number().int(),
  disponible: z.boolean(),
  disponibilidades: z.number().int().min(0),
  admiteSalaEspera: z.boolean(),
  views: z.number().int().nullable().optional(),
});

const schema = z.object({
  assignmentId: z.string().optional(),
  snapshots: z.array(snapshotSchema).min(1).max(500),
});

const DETECTION_ENUM: Record<"BECAME_AVAILABLE" | "WAITROOM_ENABLED", DetectionType> = {
  BECAME_AVAILABLE: DetectionType.BECAME_AVAILABLE,
  WAITROOM_ENABLED: DetectionType.WAITROOM_ENABLED,
};

/**
 * Phone reports freshly-fetched station detail (it has the Cuban IP; the server
 * does not). We store a snapshot, run detection vs persisted state, emit events,
 * and update the station's current state. Never trusts unknown stations.
 */
export async function POST(req: Request): Promise<Response> {
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

  const { assignmentId, snapshots } = parsed.data;

  const stationRepo = await repo(Station);
  const snapshotRepo = await repo(StationSnapshot);
  const eventRepo = await repo(DetectionEvent);

  const now = new Date();
  let stored = 0;
  let events = 0;

  for (const s of snapshots) {
    const station = await stationRepo.findOne({
      where: { id: s.stationId },
      select: { id: true, provinceId: true, admiteSalaEspera: true, disponibilidades: true },
    });
    if (!station) continue; // unknown station — catalog ingest handles new ones

    await snapshotRepo.save({
      stationId: s.stationId,
      disponible: s.disponible,
      disponibilidades: s.disponibilidades,
      views: s.views ?? null,
      rating: null,
      queuePosicion: null,
      queueTotal: null,
    });
    stored++;

    const detected = detectFromSnapshot(
      { admiteSalaEspera: station.admiteSalaEspera, disponibilidades: station.disponibilidades },
      {
        disponible: s.disponible,
        disponibilidades: s.disponibilidades,
        admiteSalaEspera: s.admiteSalaEspera,
      },
    );

    if (detected) {
      try {
        await eventRepo.save({
          stationId: s.stationId,
          provinceId: station.provinceId,
          type: DETECTION_ENUM[detected],
          notified: false,
        });
        events++;
      } catch {
        // duplicate / constraint — ignore
      }
    }

    await stationRepo.update(s.stationId, {
      admiteSalaEspera: s.admiteSalaEspera,
      disponibilidades: s.disponibilidades,
      lastSeenAt: now,
      detailFetchedAt: now,
    });
  }

  if (assignmentId) {
    const assignmentRepo = await repo(Assignment);
    await assignmentRepo.update(
      { id: assignmentId, deviceId: auth.deviceId },
      { status: AssignmentStatus.DONE, completedAt: now },
    );
  }

  return NextResponse.json({ stored, events });
}
