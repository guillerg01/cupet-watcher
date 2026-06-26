import { NextResponse } from "next/server";
import { MoreThan } from "typeorm";
import { repo, Assignment, AssignmentStatus, AssignmentKind } from "@/infra/db";
import { deviceFromRequest } from "@/lib/device-auth";
import { CLAIM_TIMEOUT_MS } from "@/lib/assignment-timing";

export const dynamic = "force-dynamic";

/**
 * Command channel (short-poll). The device asks for its next pending assignment.
 * Outbound from the phone → CGNAT-safe, no FCM dependency. Claims the assignment
 * so the coordinator can fail it over if no result arrives in time.
 *
 * If a catalog sweep was claimed but interrupted (app killed, network drop), the
 * same device can resume the in-flight CLAIMED job within the claim window.
 */
export async function GET(req: Request): Promise<Response> {
  const auth = deviceFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const assignmentRepo = await repo(Assignment);
  const resumeAfter = new Date(Date.now() - CLAIM_TIMEOUT_MS);

  const pending = await assignmentRepo.findOne({
    where: { deviceId: auth.deviceId, status: AssignmentStatus.PENDING },
    order: { createdAt: "ASC" },
  });

  if (pending) {
    await assignmentRepo.update(pending.id, {
      status: AssignmentStatus.CLAIMED,
      claimedAt: new Date(),
    });

    return NextResponse.json({
      assignment: { id: pending.id, kind: pending.kind, stationIds: pending.stationIds },
    });
  }

  const inProgress = await assignmentRepo.findOne({
    where: {
      deviceId: auth.deviceId,
      status: AssignmentStatus.CLAIMED,
      kind: AssignmentKind.CATALOG,
      claimedAt: MoreThan(resumeAfter),
    },
    order: { claimedAt: "DESC" },
  });

  if (inProgress) {
    return NextResponse.json({
      assignment: {
        id: inProgress.id,
        kind: inProgress.kind,
        stationIds: inProgress.stationIds,
      },
    });
  }

  return NextResponse.json({ assignment: null });
}
