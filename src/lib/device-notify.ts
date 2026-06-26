import { repo, Device } from "@/infra/db";
import { sendExpoPush } from "@/infra/push/expo";
import { appendToQueue, newPendingPush } from "@/lib/push-queue";

function deviceWatchesProvince(device: Device, provinceId: number): boolean {
  const watch = device.watchProvinceIds ?? [];
  if (watch.length === 0) return true;
  return watch.includes(provinceId);
}

export async function notifyMobileDevices(input: {
  title: string;
  body: string;
  provinceId?: number;
}): Promise<{ devices: number; expoSent: number }> {
  const deviceRepo = await repo(Device);
  const devices = await deviceRepo.find({ where: { ticketLinked: true } });

  const targets = devices.filter((d) =>
    input.provinceId == null ? true : deviceWatchesProvince(d, input.provinceId),
  );

  const expoMessages: Parameters<typeof sendExpoPush>[0] = [];

  for (const d of targets) {
    const item = newPendingPush(input.title, input.body);
    const queue = appendToQueue(d.pendingPushQueue, item);
    await deviceRepo.update(d.id, { pendingPushQueue: queue, pendingPush: null });

    if (d.pushToken?.startsWith("ExponentPushToken")) {
      expoMessages.push({
        to: d.pushToken,
        title: input.title,
        body: input.body,
        sound: "default",
        priority: "high",
        data: { type: "CUPET_ALERT" },
      });
    }
  }

  let expoSent = 0;
  if (expoMessages.length > 0) {
    const results = await sendExpoPush(expoMessages);
    expoSent = results.filter((r) => r.ok).length;
  }

  return { devices: targets.length, expoSent };
}
