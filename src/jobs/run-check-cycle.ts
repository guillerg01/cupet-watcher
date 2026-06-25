import { withXutilJob } from "@/infra/xutil/job-lock";
import { runScrapeCatalog } from "@/jobs/scrape-catalog";
import { runScrapeAvailability } from "@/jobs/scrape-availability";
import { runIngestUserQueues } from "@/jobs/ingest-user-queues";
import { runSendNotifications } from "@/jobs/send-notifications";

export interface CheckCycleResult {
  catalog: Awaited<ReturnType<typeof runScrapeCatalog>> | null;
  availability: Awaited<ReturnType<typeof runScrapeAvailability>> | null;
  queues: Awaited<ReturnType<typeof runIngestUserQueues>> | null;
  notify: Awaited<ReturnType<typeof runSendNotifications>>;
}

export async function runCheckCycle(): Promise<CheckCycleResult> {
  const catalog = await withXutilJob("catalog", () => runScrapeCatalog());
  const availability = await withXutilJob("availability", () =>
    runScrapeAvailability(),
  );
  const queues = await withXutilJob("queues", () => runIngestUserQueues());
  const notify = await runSendNotifications();

  return { catalog, availability, queues, notify };
}
