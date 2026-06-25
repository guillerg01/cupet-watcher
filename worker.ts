import "@/load-env";
import cron from "node-cron";
import { env } from "./src/env.js";
import { runAssignWork } from "./src/jobs/assign-work.js";
import { runSendNotifications } from "./src/jobs/send-notifications.js";
import { runComputePrediction } from "./src/jobs/compute-prediction.js";

// v2: the server NEVER scrapes ticket (no Cuban IP). It only coordinates the
// phone fleet (assign work + failover) and dispatches notifications from the
// data the phones submit.
async function runScheduledCheck(label: string): Promise<void> {
  console.log(`[worker] [${label}] Coordinator cycle…`);
  try {
    const assigned = await runAssignWork();
    const notify = await runSendNotifications();
    console.log(`[worker] [${label}] Done:`, { assigned, notify });
  } catch (err) {
    console.error(`[worker] [${label}] Error:`, err);
  }
}

const BANNER = `
╔══════════════════════════════════╗
║       Cupet Watcher Worker       ║
╚══════════════════════════════════╝
`;

console.log(BANNER);
console.log("[worker] Starting scheduled jobs…");
console.log(`  coordinator : ${env.WORKER_CHECK_CRON} (assign work → failover → notify)`);
console.log(`  predict     : ${env.PREDICT_CRON}`);
console.log("");

cron.schedule(env.WORKER_CHECK_CRON, () => runScheduledCheck("check"));

cron.schedule(env.PREDICT_CRON, async () => {
  console.log("[worker] [predict] Starting…");
  try {
    const result = await runComputePrediction();
    console.log("[worker] [predict] Done:", result);
  } catch (err) {
    console.error("[worker] [predict] Error:", err);
  }
});

console.log("[worker] All jobs scheduled. Process running.");

void runScheduledCheck("startup");

process.on("SIGTERM", () => {
  console.log("[worker] SIGTERM received, shutting down.");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("[worker] SIGINT received, shutting down.");
  process.exit(0);
});
