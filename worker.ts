import cron from "node-cron";
import { env } from "./src/env.js";
import { runScrapeCatalog } from "./src/jobs/scrape-catalog.js";
import { runScrapeAvailability } from "./src/jobs/scrape-availability.js";
import { runIngestUserQueues } from "./src/jobs/ingest-user-queues.js";
import { runSendNotifications } from "./src/jobs/send-notifications.js";
import { runComputePrediction } from "./src/jobs/compute-prediction.js";

const BANNER = `
╔══════════════════════════════════╗
║       Cupet Watcher Worker       ║
╚══════════════════════════════════╝
`;

console.log(BANNER);
console.log("[worker] Starting scheduled jobs…");
console.log(
  `  catalog     : ${env.SCRAPE_CATALOG_CRON}`,
);
console.log(
  `  availability: ${env.SCRAPE_AVAILABILITY_CRON}`,
);
console.log(
  `  notify      : ${env.SEND_NOTIFICATIONS_CRON}`,
);
console.log(`  predict     : 0 */6 * * *`);
console.log("");

// --- Catalog scrape ---
cron.schedule(env.SCRAPE_CATALOG_CRON, async () => {
  console.log("[worker] [catalog] Starting…");
  try {
    const result = await runScrapeCatalog();
    console.log("[worker] [catalog] Done:", result);
  } catch (err) {
    console.error("[worker] [catalog] Error:", err);
  }
});

// --- Availability scrape + user queue ingest ---
cron.schedule(env.SCRAPE_AVAILABILITY_CRON, async () => {
  console.log("[worker] [availability] Starting…");
  try {
    const avail = await runScrapeAvailability();
    console.log("[worker] [availability] Done:", avail);
  } catch (err) {
    console.error("[worker] [availability] Error:", err);
  }

  console.log("[worker] [queues] Starting…");
  try {
    const queues = await runIngestUserQueues();
    console.log("[worker] [queues] Done:", queues);
  } catch (err) {
    console.error("[worker] [queues] Error:", err);
  }
});

// --- Send notifications ---
cron.schedule(env.SEND_NOTIFICATIONS_CRON, async () => {
  console.log("[worker] [notify] Starting…");
  try {
    const result = await runSendNotifications();
    console.log("[worker] [notify] Done:", result);
  } catch (err) {
    console.error("[worker] [notify] Error:", err);
  }
});

// --- Prediction computation (every 6 hours) ---
cron.schedule("0 */6 * * *", async () => {
  console.log("[worker] [predict] Starting…");
  try {
    const result = await runComputePrediction();
    console.log("[worker] [predict] Done:", result);
  } catch (err) {
    console.error("[worker] [predict] Error:", err);
  }
});

console.log("[worker] All jobs scheduled. Process running.");

// Keep alive
process.on("SIGTERM", () => {
  console.log("[worker] SIGTERM received, shutting down.");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("[worker] SIGINT received, shutting down.");
  process.exit(0);
});
