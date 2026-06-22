import { prisma } from "@/infra/db/prisma";
import { createXutilClient } from "@/infra/xutil/client";
import { getScraperToken } from "@/infra/xutil/token-store";
import { sleep, jitter } from "@/lib/sleep";
import { env } from "@/env";

const STATION_CAP = 200;

export async function runScrapeAvailability(): Promise<{ sampled: number }> {
  const token = await getScraperToken();
  const client = createXutilClient();

  const stations = await prisma.station.findMany({
    where: { active: true },
    orderBy: { lastSeenAt: "desc" },
    take: STATION_CAP,
    select: { id: true },
  });

  let sampled = 0;

  for (const station of stations) {
    try {
      const detail = await client.getServicioDetail(token, station.id);

      await prisma.stationSnapshot.create({
        data: {
          stationId: station.id,
          disponible: detail.disponible,
          disponibilidades: detail.disponibilidades,
          views: detail.views,
          rating: null, // detail shape has no rating field
          queuePosicion: null,
          queueTotal: null,
        },
      });

      sampled++;
    } catch (err) {
      console.error(
        `[scrape-availability] Failed for station ${station.id}:`,
        err,
      );
    }

    await sleep(
      jitter(
        env.SCRAPE_PAGE_DELAY_MS_MIN,
        env.SCRAPE_PAGE_DELAY_MS_MAX,
      ),
    );
  }

  console.log(`[scrape-availability] Sampled ${sampled}/${stations.length}`);
  return { sampled };
}
