import { env } from "@/env";
import { jitter, sleep } from "@/lib/sleep";

let cooldownUntil = 0;

export async function waitForXutilSlot(): Promise<void> {
  const waitMs = cooldownUntil - Date.now();
  if (waitMs > 0) await sleep(waitMs);
}

export function extendXutilCooldown(extraMs: number): void {
  cooldownUntil = Math.max(cooldownUntil, Date.now() + extraMs);
}

export function afterRateLimitHit(attempt: number): void {
  const backoff = 20_000 * attempt + jitter(3000, 8000);
  extendXutilCooldown(backoff + env.SCRAPE_RATE_LIMIT_COOLDOWN_MS);
}

export function afterSuccessfulRetry(): void {
  extendXutilCooldown(env.SCRAPE_RATE_LIMIT_COOLDOWN_MS);
}
