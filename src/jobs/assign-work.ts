import {
  repo,
  Device,
  Assignment,
  AssignmentStatus,
  AssignmentKind,
} from "@/infra/db";
import { In, LessThan, Not, IsNull } from "typeorm";
import { getScanIntervalMinutes } from "@/lib/app-settings";
import { wakeDeviceForScan } from "@/lib/device-scan-wake";
import {
  ASSIGNMENT_TTL_MS,
  CLAIM_TIMEOUT_MS,
  MAX_ASSIGNMENT_ATTEMPTS,
} from "@/lib/assignment-timing";

export interface AssignWorkResult {
  wakeableDevices: number;
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

  // Target WAKEABLE devices (have an FCM push token), NOT only heartbeating ones:
  // the whole point is to wake a device whose app is CLOSED (it won't heartbeat).
  // The FCM data push starts the headless sweep.
  const onlineDevices = await deviceRepo.find({
    where: { pushToken: Not(IsNull()) },
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
    if (a.attempts + 1 >= MAX_ASSIGNMENT_ATTEMPTS || others.length === 0) {
      await assignmentRepo.update(a.id, { status: AssignmentStatus.EXPIRED });
      expired++;
    } else {
      await assignmentRepo.update(a.id, {
        status: AssignmentStatus.PENDING,
        deviceId: others[0],
        claimedAt: null,
        attempts: a.attempts + 1,
      });
      // Wake the failover device so it scans even with its app closed.
      await wakeDeviceForScan(others[0], a.id);
      reassigned++;
    }
  }

  // 2. Expire PENDING nobody claimed in time.
  const expireResult = await assignmentRepo.update(
    {
      status: AssignmentStatus.PENDING,
      expiresAt: LessThan(new Date(now)),
    },
    { status: AssignmentStatus.EXPIRED },
  );
  expired += expireResult.affected ?? 0;

  if (deviceIds.length === 0) {
    return { wakeableDevices: 0, created: 0, reassigned, expired };
  }

  // 3. One sweep at a time. If none outstanding, assign to the LRU online device.
  const outstanding = await assignmentRepo.count({
    where: { status: In([AssignmentStatus.PENDING, AssignmentStatus.CLAIMED]) },
  });

  let created = 0;
  if (outstanding === 0) {
    // Pace sweeps to the admin-configured interval. The worker cron ticks far
    // more often than we want to sweep, so without this gate a fast-completing
    // sweep would be re-assigned every few minutes instead of every 30/60 min.
    const intervalMs = (await getScanIntervalMinutes()) * 60 * 1000;
    const [latest] = await assignmentRepo.find({
      where: { kind: AssignmentKind.CATALOG },
      order: { createdAt: "DESC" },
      take: 1,
    });
    const sinceLastSweep = latest ? now - latest.createdAt.getTime() : Infinity;

    if (sinceLastSweep >= intervalMs) {
      const target = onlineDevices[0]; // ordered by lastAssignedAt ASC
      const saved = await assignmentRepo.save({
        deviceId: target.id,
        kind: AssignmentKind.CATALOG,
        stationIds: [],
        status: AssignmentStatus.PENDING,
        expiresAt: new Date(now + ASSIGNMENT_TTL_MS),
        attempts: 0,
      });
      await deviceRepo.update(target.id, { lastAssignedAt: new Date() });
      // Wake the device via FCM data push so it sweeps even if the app is
      // closed (it won't poll /devices/poll on its own when killed).
      await wakeDeviceForScan(target.id, saved.id);
      created++;
    }
  }

  return { wakeableDevices: deviceIds.length, created, reassigned, expired };
}
