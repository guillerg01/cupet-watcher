import { prisma } from "@/infra/db/prisma";
import { sendNewCupetEmail } from "@/infra/email/resend";
import type { DetectionType } from "@/core/detection/types";

const PREF_KEY: Record<DetectionType, "notifyNew" | "notifyAvailable" | "notifyWaitroom"> = {
  NEW: "notifyNew",
  BECAME_AVAILABLE: "notifyAvailable",
  WAITROOM_ENABLED: "notifyWaitroom",
};

function buildPublicLink(stationId: number): string {
  return `https://ticket.xutil.net/store/service-detail?service=${stationId}`;
}

export async function runSendNotifications(): Promise<{
  sent: number;
  failed: number;
}> {
  const events = await prisma.detectionEvent.findMany({
    where: { notified: false },
    include: {
      station: {
        select: {
          name: true,
          establishment: true,
          municipio: true,
        },
      },
      province: {
        select: { name: true },
      },
    },
  });

  let sent = 0;
  let failed = 0;

  for (const event of events) {
    const prefKey = PREF_KEY[event.type as DetectionType];

    // Find subscribed users in this province with the matching pref on
    const subscribers = await prisma.appUser.findMany({
      where: {
        provinces: {
          some: { provinceId: event.provinceId },
        },
        [prefKey]: true,
      },
      select: {
        id: true,
        email: true,
      },
    });

    for (const user of subscribers) {
      // Upsert notification row (idempotent)
      const notification = await prisma.notification.upsert({
        where: { userId_eventId: { userId: user.id, eventId: event.id } },
        create: {
          userId: user.id,
          eventId: event.id,
          channel: "EMAIL",
          status: "PENDING",
        },
        update: {
          status: "PENDING",
        },
      });

      const result = await sendNewCupetEmail(user.email, {
        stationName: event.station.name,
        establishment: event.station.establishment,
        provinceName: event.province.name,
        municipio: event.station.municipio,
        type: event.type as DetectionType,
        publicLink: buildPublicLink(event.stationId),
      });

      try {
        if (result.ok) {
          await prisma.notification.update({
            where: { id: notification.id },
            data: { status: "SENT", sentAt: new Date(), error: null },
          });
          sent++;
        } else {
          await prisma.notification.update({
            where: { id: notification.id },
            data: {
              status: "FAILED",
              error: result.error ?? "unknown error",
            },
          });
          failed++;
        }
      } catch (err) {
        console.error(
          `[send-notifications] DB update failed for notification ${notification.id}:`,
          err,
        );
        failed++;
      }
    }

    // Mark event as notified after all recipients processed
    try {
      await prisma.detectionEvent.update({
        where: { id: event.id },
        data: { notified: true },
      });
    } catch (err) {
      console.error(
        `[send-notifications] Failed to mark event ${event.id} notified:`,
        err,
      );
    }
  }

  console.log(`[send-notifications] sent=${sent} failed=${failed}`);
  return { sent, failed };
}
