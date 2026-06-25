import { NextResponse } from "next/server";
import { repo, Assignment, AssignmentStatus } from "@/infra/db";
import { deviceFromRequest } from "@/lib/device-auth";

export const dynamic = "force-dynamic";

/**
 * Command channel (short-poll). The device asks for its next pending assignment.
 * Outbound from the phone → CGNAT-safe, no FCM dependency. Claims the assignment
 * so the coordinator can fail it over if no result arrives in time.
 */
export async function GET(req: Request): Promise<Response> {
  const auth = deviceFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const assignmentRepo = await repo(Assignment);
  const pending = await assignmentRepo.findOne({
    where: { deviceId: auth.deviceId, status: AssignmentStatus.PENDING },
    order: { createdAt: "ASC" },
  });

  if (!pending) {
    return NextResponse.json({ assignment: null });
  }

  await assignmentRepo.update(pending.id, {
    status: AssignmentStatus.CLAIMED,
    claimedAt: new Date(),
  });

  return NextResponse.json({
    assignment: { id: pending.id, kind: pending.kind, stationIds: pending.stationIds },
  });
}
