import { headers } from "next/headers";
import { repo, AuthAttempt } from "@/infra/db";

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
