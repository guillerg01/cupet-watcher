import { db } from "@/infra/db";
import { sendFcmData } from "@/infra/push/fcm";

/**
 * Tell one device to run a catalog sweep now — even with its app closed and
 * screen off — by sending a data-only high-priority FCM message. The RN app's
 * background message handler picks up `type: "SCAN"` and runs the sweep.
 *
 * Best-effort: never throws (a wake failure must not break the coordinator).
 */
export async function wakeDeviceForScan(
  deviceId: string,
  assignmentId: string,
): Promise<boolean> {
  try {
    const ds = await db();
    const [row] = (await ds.query(`SELECT "pushToken" FROM "Device" WHERE id = $1`, [
      deviceId,
    ])) as Array<{ pushToken: string | null }>;
    const token = row?.pushToken;
    if (!token) return false;
    const [res] = await sendFcmData([token], { type: "SCAN", assignmentId });
    return res?.ok ?? false;
  } catch {
    return false;
  }
}
