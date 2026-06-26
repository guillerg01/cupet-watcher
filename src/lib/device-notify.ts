import { db } from "@/infra/db";
import { appendToQueue, newPendingPush } from "@/lib/push-queue";
import { sendDevicePush } from "@/lib/push-send";

type DeviceRow = {
  id: string;
  pushToken: string | null;
  watchProvinceIds: number[] | null;
  pendingPushQueue: Array<{ id: string; title: string; body: string; createdAt: string }> | null;
};

function deviceWatchesProvince(device: DeviceRow, provinceId: number): boolean {
  const watch = device.watchProvinceIds ?? [];
  if (watch.length === 0) return true;
  return watch.includes(provinceId);
}

export async function notifyMobileDevices(input: {
  title: string;
  body: string;
  provinceId?: number;
}): Promise<{ devices: number; expoSent: number; fcmSent: number }> {
  const ds = await db();
  const devices = (await ds.query(
    `SELECT id, "pushToken", "watchProvinceIds", "pendingPushQueue"
     FROM "Device"`,
  )) as DeviceRow[];

  const targets = devices.filter((d) =>
    input.provinceId == null ? true : deviceWatchesProvince(d, input.provinceId),
  );

  const pushTokens: string[] = [];

  for (const d of targets) {
    const item = newPendingPush(input.title, input.body);
    const queue = appendToQueue(d.pendingPushQueue, item);
    await ds.query(
      `UPDATE "Device" SET "pendingPushQueue" = $1::jsonb, "pendingPush" = NULL WHERE id = $2`,
      [JSON.stringify(queue), d.id],
    );

    if (d.pushToken) pushTokens.push(d.pushToken);
  }

  const uniqueTokens = [...new Set(pushTokens)];
  const { expoSent, fcmSent } =
    uniqueTokens.length > 0
      ? await sendDevicePush({
          tokens: uniqueTokens,
          title: input.title,
          body: input.body,
          data: { type: "CUPET_ALERT" },
        })
      : { expoSent: 0, fcmSent: 0 };

  return { devices: targets.length, expoSent, fcmSent };
}
