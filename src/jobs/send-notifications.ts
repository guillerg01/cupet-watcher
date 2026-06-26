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
import { sendFcmPush, isUnrecoverableFcmError } from "@/infra/push/fcm";
import { getUsersWithPendingAlerts, clearDeadPushToken } from "@/lib/pending-alerts";
import { db } from "@/infra/db";

// Don't re-push the reminder more than once per this interval, even though the
// cron passes more often. Avoids hammering a user who hasn't opened the app.
const REMINDER_THROTTLE_MS = 2 * 60 * 60 * 1000;

function buildPublicLink(stationId: number): string {
  return `https://ticket.xutil.net/store/service-detail?service=${stationId}`;
}

const PREF_BY_TYPE: Record<
  DetectionType,
  "notifyNew" | "notifyAvailable" | "notifyWaitroom"
> = {
  [DetectionType.NEW]: "notifyNew",
  [DetectionType.REAPPEARED]: "notifyNew",
  [DetectionType.DEPARTED]: "notifyNew",
  [DetectionType.BECAME_AVAILABLE]: "notifyAvailable",
  [DetectionType.WAITROOM_ENABLED]: "notifyWaitroom",
};

export async function runSendNotifications(): Promise<{
  sent: number;
  failed: number;
  events: number;
  remindersSent: number;
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

  // Recurring push reminder: every cron pass, re-notify users who still have
  // unacknowledged new cupets. Email above fires once per event (deduped by
  // Notification rows); this push repeats until the user opens the app and
  // dismisses the modal (which advances lastAlertsSeenAt → no more pending).
  const { remindersSent } = await runAlertReminders();

  return { sent, failed, events: events.length, remindersSent };
}

export async function runAlertReminders(): Promise<{ remindersSent: number }> {
  const users = await getUsersWithPendingAlerts();
  const now = Date.now();
  let remindersSent = 0;

  for (const u of users) {
    if (u.pushTokens.length === 0) continue;

    // Throttle: skip users reminded within the window.
    if (u.lastReminderAt && now - u.lastReminderAt.getTime() < REMINDER_THROTTLE_MS) {
      continue;
    }

    const title = u.count === 1 ? "Cupet nuevo en tu provincia" : `${u.count} cupets nuevos`;
    const body = "Abrí Cupet Watcher para verlos.";

    try {
      const results = await sendFcmPush(u.pushTokens, title, body, {
        type: "PENDING_ALERTS",
        count: String(u.count),
      });

      // Prune dead tokens (index-aligned with the tokens we sent).
      await Promise.all(
        results.map(async (r, i) => {
          if (!r.ok && isUnrecoverableFcmError(r.error)) {
            await clearDeadPushToken(u.pushTokens[i]);
          }
        }),
      );

      const ok = results.filter((r) => r.ok).length;
      remindersSent += ok;
      if (ok > 0) {
        const ds = await db();
        await ds.query(`UPDATE "AppUser" SET "lastAlertsReminderAt" = now() WHERE id = $1`, [
          u.userId,
        ]);
      }
    } catch {
      /* best-effort — never block the cron */
    }
  }

  return { remindersSent };
}
