import { repo, XutilLink, StationSnapshot } from "@/infra/db";
import { createXutilClient } from "@/infra/xutil/client";
import { decrypt } from "@/lib/crypto";
import { MoreThan } from "typeorm";

export async function runIngestUserQueues(): Promise<{
  users: number;
  samples: number;
}> {
  const client = createXutilClient();
  const now = new Date();

  const linkRepo = await repo(XutilLink);
  const links = await linkRepo.find({
    where: { tokenExp: MoreThan(now) },
    select: {
      id: true,
      userId: true,
      encryptedToken: true,
      tokenExp: true,
    },
  });

  const snapshotRepo = await repo(StationSnapshot);
  let users = 0;
  let samples = 0;

  for (const link of links) {
    if (link.tokenExp <= now) continue;

    let token: string;
    try {
      token = decrypt(link.encryptedToken);
    } catch {
      continue;
    }

    try {
      const salaEsperas = await client.getPosicionVisual(token);
      users++;

      for (const sala of salaEsperas) {
        for (const turno of sala.turnos) {
          try {
            await snapshotRepo.save({
              stationId: sala.id_local_servicio,
              disponible: false,
              disponibilidades: 0,
              views: null,
              rating: null,
              queuePosicion: turno.posicion,
              queueTotal: turno.total,
            });
            samples++;
          } catch {
            // skip failed snapshot
          }
        }
      }
    } catch {
      // token expired server-side
    }
  }

  return { users, samples };
}
