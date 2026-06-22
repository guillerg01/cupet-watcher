import { runScrapeCatalog } from "@/jobs/scrape-catalog";
import { runScrapeAvailability } from "@/jobs/scrape-availability";
import { runIngestUserQueues } from "@/jobs/ingest-user-queues";
import { runSendNotifications } from "@/jobs/send-notifications";
import { runComputePrediction } from "@/jobs/compute-prediction";

type JobName = "catalog" | "availability" | "queues" | "notify" | "predict";

const JOBS: Record<JobName, () => Promise<unknown>> = {
  catalog: runScrapeCatalog,
  availability: runScrapeAvailability,
  queues: runIngestUserQueues,
  notify: runSendNotifications,
  predict: runComputePrediction,
};

const VALID: JobName[] = ["catalog", "availability", "queues", "notify", "predict"];

async function main(): Promise<void> {
  const arg = (process.argv[2] ?? "catalog") as JobName;

  if (!VALID.includes(arg)) {
    console.error(`Unknown job: "${arg}". Valid: ${VALID.join(", ")}`);
    process.exit(1);
  }

  console.log(`[run-once] Running job: ${arg}`);

  try {
    const result = await JOBS[arg]();
    console.log(`[run-once] Done:`, JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(`[run-once] Job "${arg}" failed:`, err);
    process.exit(1);
  }
}

main();
