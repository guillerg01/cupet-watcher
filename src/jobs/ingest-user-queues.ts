import { prisma } from "@/infra/db/prisma";
import { createXutilClient } from "@/infra/xutil/client";
import { decrypt } from "@/lib/crypto";

export async function runIngestUserQueues(): Promise<{
  users: number;
  samples: number;
}> {
  const client = createXutilClient();
  const now = new Date();

  const links = await prisma.xutilLink.findMany({
    where: {
      tokenExp: { gt: now },
    },
    select: {
      id: true,
      userId: true,
      encryptedToken: true,
      tokenExp: true,
    },
  });

  let users = 0;
  let samples = 0;

  for (const link of links) {
    // Double-check expiry in case query/clock skew
    if (link.tokenExp <= now) continue;

    let token: string;
    try {
      token = decrypt(link.encryptedToken);
    } catch (err) {
      console.error(
        `[ingest-user-queues] Failed to decrypt token for user ${link.userId}:`,
        err,
      );
      continue;
    }

    try {
      const salaEsperas = await client.getPosicionVisual(token);
      users++;

      for (const sala of salaEsperas) {
        for (const turno of sala.turnos) {
          try {
            await prisma.stationSnapshot.create({
              data: {
                stationId: sala.id_local_servicio,
                disponible: false,
                disponibilidades: 0,
                views: null,
                rating: null,
                queuePosicion: turno.posicion,
                queueTotal: turno.total,
              },
            });
            samples++;
          } catch (err) {
            console.error(
              `[ingest-user-queues] Failed snapshot for station ${sala.id_local_servicio} user ${link.userId}:`,
              err,
            );
          }
        }
      }
    } catch (err) {
      console.error(
        `[ingest-user-queues] getPosicionVisual failed for user ${link.userId}:`,
        err,
      );
      // Token may be expired server-side despite local exp; skip gracefully
    }
  }

  console.log(
    `[ingest-user-queues] Processed ${users} users, ${samples} queue samples`,
  );
  return { users, samples };
}
