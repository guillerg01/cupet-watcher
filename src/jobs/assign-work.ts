import {
  repo,
  Device,
  Assignment,
  AssignmentStatus,
  AssignmentKind,
} from "@/infra/db";
import { In, LessThan, MoreThan } from "typeorm";

const ONLINE_WINDOW_MS = 5 * 60 * 1000; // device online if heartbeat within this
const ASSIGNMENT_TTL_MS = 8 * 60 * 1000; // pending assignment lifetime
const CLAIM_TIMEOUT_MS = 5 * 60 * 1000; // claimed-but-no-result -> failover
const MAX_ATTEMPTS = 3;

export interface AssignWorkResult {
  onlineDevices: number;
  created: number;
  reassigned: number;
  expired: number;
}

/**
 * Coordinator cycle. One catalog sweep at a time, rotated across online devices —
 * this is the dedup that keeps each user's ETECSA data cost low. The server NEVER
 * touches ticket; it only schedules sweeps that phones execute.
 *
 *  1. Fail over stale CLAIMED assignments to another online device (or expire).
 *  2. Expire PENDING nobody claimed in time.
 *  3. If no sweep is outstanding, assign one to the least-recently-used device.
 */
export async function runAssignWork(): Promise<AssignWorkResult> {
  const now = Date.now();
  const assignmentRepo = await repo(Assignment);
  const deviceRepo = await repo(Device);

  const onlineDevices = await deviceRepo.find({
    where: {
      ticketLinked: true,
      lastHeartbeatAt: MoreThan(new Date(now - ONLINE_WINDOW_MS)),
    },
    // NULLS FIRST so a brand-new device (never assigned) is picked first.
    order: { lastAssignedAt: { direction: "ASC", nulls: "FIRST" } },
  });
  const deviceIds = onlineDevices.map((d) => d.id);

  let reassigned = 0;
  let expired = 0;

  // 1. Failover stale claims.
  const staleClaimed = await assignmentRepo.find({
    where: {
      status: AssignmentStatus.CLAIMED,
      claimedAt: LessThan(new Date(now - CLAIM_TIMEOUT_MS)),
    },
  });
  for (const a of staleClaimed) {
    const others = deviceIds.filter((id) => id !== a.deviceId);
    if (a.attempts + 1 >= MAX_ATTEMPTS || others.length === 0) {
      await assignmentRepo.update(a.id, { status: AssignmentStatus.EXPIRED });
      expired++;
    } else {
      await assignmentRepo.update(a.id, {
        status: AssignmentStatus.PENDING,
        deviceId: others[0],
        claimedAt: null,
        attempts: a.attempts + 1,
      });
      reassigned++;
    }
  }

  // 2. Expire PENDING nobody claimed in time.
  const expireResult = await assignmentRepo.update(
    {
      status: AssignmentStatus.PENDING,
      createdAt: LessThan(new Date(now - ASSIGNMENT_TTL_MS)),
    },
    { status: AssignmentStatus.EXPIRED },
  );
  expired += expireResult.affected ?? 0;

  if (deviceIds.length === 0) {
    return { onlineDevices: 0, created: 0, reassigned, expired };
  }

  // 3. One sweep at a time. If none outstanding, assign to the LRU online device.
  const outstanding = await assignmentRepo.count({
    where: { status: In([AssignmentStatus.PENDING, AssignmentStatus.CLAIMED]) },
  });

  let created = 0;
  if (outstanding === 0) {
    const target = onlineDevices[0]; // ordered by lastAssignedAt ASC
    await assignmentRepo.save({
      deviceId: target.id,
      kind: AssignmentKind.CATALOG,
      stationIds: [],
      status: AssignmentStatus.PENDING,
      expiresAt: new Date(now + ASSIGNMENT_TTL_MS),
      attempts: 0,
    });
    await deviceRepo.update(target.id, { lastAssignedAt: new Date() });
    created++;
  }

  return { onlineDevices: deviceIds.length, created, reassigned, expired };
}
