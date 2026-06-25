import {
  repo,
  AppUser,
  DetectionEvent,
  Notification,
  NotificationChannel,
  NotificationStatus,
  DetectionType,
} from "@/infra/db";
import { sendNewCupetEmail } from "@/infra/email/resend";

function buildPublicLink(stationId: number): string {
  return `https://ticket.xutil.net/store/service-detail?service=${stationId}`;
}

const PREF_BY_TYPE: Record<
  DetectionType,
  "notifyNew" | "notifyAvailable" | "notifyWaitroom"
> = {
  [DetectionType.NEW]: "notifyNew",
  [DetectionType.BECAME_AVAILABLE]: "notifyAvailable",
  [DetectionType.WAITROOM_ENABLED]: "notifyWaitroom",
};

export async function runSendNotifications(): Promise<{
  sent: number;
  failed: number;
  events: number;
}> {
  const eventRepo = await repo(DetectionEvent);
  const events = await eventRepo.find({
    where: { notified: false },
    relations: {
      station: true,
      province: true,
    },
  });

  let sent = 0;
  let failed = 0;
  const userRepo = await repo(AppUser);
  const notificationRepo = await repo(Notification);

  for (const event of events) {
    const prefKey = PREF_BY_TYPE[event.type];

    const subscribers = await userRepo
      .createQueryBuilder("u")
      .innerJoin("u.provinces", "up")
      .where("up.provinceId = :provinceId", { provinceId: event.provinceId })
      .andWhere(`u.${prefKey} = true`)
      .select(["u.id", "u.email"])
      .getMany();

    for (const user of subscribers) {
      const notification = await notificationRepo.upsert(
        {
          userId: user.id,
          eventId: event.id,
          channel: NotificationChannel.EMAIL,
          status: NotificationStatus.PENDING,
        },
        ["userId", "eventId"],
      );

      const notificationId = notification.identifiers[0]?.id as string | undefined;
      const resolvedId =
        notificationId ??
        (
          await notificationRepo.findOne({
            where: { userId: user.id, eventId: event.id },
          })
        )?.id;

      const result = await sendNewCupetEmail(user.email, {
        stationName: event.station.name,
        establishment: event.station.establishment,
        provinceName: event.province.name,
        municipio: event.station.municipio,
        type: event.type as DetectionType,
        publicLink: buildPublicLink(event.stationId),
      });

      if (!resolvedId) {
        failed++;
        continue;
      }

      if (result.ok) {
        await notificationRepo.update(resolvedId, {
          status: NotificationStatus.SENT,
          sentAt: new Date(),
          error: null,
        });
        sent++;
      } else {
        await notificationRepo.update(resolvedId, {
          status: NotificationStatus.FAILED,
          error: result.error ?? "unknown error",
        });
        failed++;
      }
    }

    await eventRepo.update(event.id, { notified: true });
  }

  return { sent, failed, events: events.length };
}
