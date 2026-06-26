import { headers } from "next/headers";
import { repo, AuthAttempt, db } from "@/infra/db";

const FAIL_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 8;

/**
 * Brute-force guard: true if this email hit MAX_FAILS failed logins within the
 * window. Cheap count over the existing AuthAttempt log.
 */
export async function tooManyRecentFailures(email: string): Promise<boolean> {
  const ds = await db();
  const since = new Date(Date.now() - FAIL_WINDOW_MS);
  const [row] = (await ds.query(
    `SELECT COUNT(*)::int AS n FROM "AuthAttempt"
     WHERE email = $1 AND success = false AND "createdAt" > $2`,
    [email.toLowerCase().trim(), since],
  )) as Array<{ n: number }>;
  return (row?.n ?? 0) >= MAX_FAILS;
}

export async function logAuthAttempt(input: {
  email: string;
  success: boolean;
  reason?: string | null;
}): Promise<void> {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    null;
  const userAgent = h.get("user-agent");

  const attemptRepo = await repo(AuthAttempt);
  await attemptRepo.save({
    email: input.email.toLowerCase().trim(),
    success: input.success,
    reason: input.reason ?? null,
    ip,
    userAgent,
  });
}
