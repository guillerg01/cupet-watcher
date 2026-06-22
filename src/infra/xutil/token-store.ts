import { prisma } from "@/infra/db/prisma";
import { createXutilClient } from "@/infra/xutil/client";
import { encrypt, decrypt } from "@/lib/crypto";
import { env } from "@/env";

const SCRAPER_ROW_ID = 1;
/** Refresh when fewer than 7 days remain. */
const REFRESH_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;

export async function getScraperToken(): Promise<string> {
  if (!env.XUTIL_SCRAPER_USER || !env.XUTIL_SCRAPER_PASS) {
    throw new Error(
      "[token-store] XUTIL_SCRAPER_USER / XUTIL_SCRAPER_PASS env vars are not set",
    );
  }

  const row = await prisma.scraperCredential.findUnique({
    where: { id: SCRAPER_ROW_ID },
  });

  const now = Date.now();
  const needsRefresh =
    !row || row.tokenExp.getTime() - now < REFRESH_THRESHOLD_MS;

  if (needsRefresh) {
    console.log("[token-store] Refreshing scraper token via login…");

    const client = createXutilClient();
    const bundle = await client.login(
      env.XUTIL_SCRAPER_USER,
      env.XUTIL_SCRAPER_PASS,
    );

    const encryptedToken = encrypt(bundle.accessToken);

    await prisma.scraperCredential.upsert({
      where: { id: SCRAPER_ROW_ID },
      create: {
        id: SCRAPER_ROW_ID,
        username: env.XUTIL_SCRAPER_USER,
        encryptedToken,
        tokenExp: bundle.expiresAt,
        refreshToken: bundle.refreshToken,
      },
      update: {
        username: env.XUTIL_SCRAPER_USER,
        encryptedToken,
        tokenExp: bundle.expiresAt,
        refreshToken: bundle.refreshToken,
      },
    });

    return bundle.accessToken;
  }

  return decrypt(row.encryptedToken);
}
