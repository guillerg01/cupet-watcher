import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";
import { runWorkerCycle } from "./cycle";

export const WORKER_TASK = "cupet-worker-cycle";

// ⚠️ BACKGROUND EXECUTION LIMITS — READ THIS.
//
// expo-background-fetch runs OPPORTUNISTICALLY, minimum interval ~15 min, and the
// OS (Android Doze / iOS) decides WHEN — you do NOT get reliable short-interval
// polling here. This baseline is fine to prove the flow, but for the "grab it
// fast" goal on Android you must replace this with a FOREGROUND SERVICE
// (persistent notification) that runs runWorkerCycle on a short interval.
//
// TODO(foreground-service): add a config plugin + library such as
//   @notifee/react-native (foreground service) or react-native-foreground-service,
// start it after the user enables the worker, and call runWorkerCycle() on a
// setInterval inside the service. The cycle logic itself does not change.

TaskManager.defineTask(WORKER_TASK, async () => {
  try {
    const r = await runWorkerCycle();
    return r.newEvents > 0
      ? BackgroundFetch.BackgroundFetchResult.NewData
      : BackgroundFetch.BackgroundFetchResult.NoData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerWorker(): Promise<void> {
  await BackgroundFetch.registerTaskAsync(WORKER_TASK, {
    minimumInterval: 15 * 60, // seconds — OS floor, not a guarantee
    stopOnTerminate: false,
    startOnBoot: true,
  });
}

export async function unregisterWorker(): Promise<void> {
  await BackgroundFetch.unregisterTaskAsync(WORKER_TASK);
}

export async function isWorkerRegistered(): Promise<boolean> {
  return TaskManager.isTaskRegisteredAsync(WORKER_TASK);
}
