import { repo, Station, StationSnapshot } from "@/infra/db";
import { createXutilClient } from "@/infra/xutil/client";
import { getScraperToken } from "@/infra/xutil/token-store";
import { sleep, jitter } from "@/lib/sleep";
import { env } from "@/env";

const STATION_CAP = 200;

export async function runScrapeAvailability(): Promise<{ sampled: number }> {
  const token = await getScraperToken();
  const client = createXutilClient();

  const stationRepo = await repo(Station);
  const stations = await stationRepo.find({
    where: { active: true },
    order: { lastSeenAt: "DESC" },
    take: STATION_CAP,
    select: { id: true },
  });

  const snapshotRepo = await repo(StationSnapshot);
  let sampled = 0;

  for (const station of stations) {
    try {
      const detail = await client.getServicioDetail(token, station.id);

      await snapshotRepo.save({
        stationId: station.id,
        disponible: detail.disponible,
        disponibilidades: detail.disponibilidades,
        views: detail.views,
        rating: null,
        queuePosicion: null,
        queueTotal: null,
      });

      sampled++;
    } catch (err) {
      process.stderr.write(
        `[scrape-availability] Failed for station ${station.id}: ${String(err)}\n`,
      );
    }

    await sleep(
      jitter(
        env.SCRAPE_PAGE_DELAY_MS_MIN,
        env.SCRAPE_PAGE_DELAY_MS_MAX,
      ),
    );
  }

  return { sampled };
}
