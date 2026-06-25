import { repo, ScraperCredential } from "@/infra/db";
import { createXutilClient } from "@/infra/xutil/client";
import { xutilLog } from "@/infra/xutil/log";
import { encrypt, decrypt } from "@/lib/crypto";
import { env } from "@/env";

const SCRAPER_ROW_ID = 1;
const REFRESH_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000;

export async function getScraperToken(): Promise<string> {
  if (!env.XUTIL_SCRAPER_USER || !env.XUTIL_SCRAPER_PASS) {
    throw new Error(
      "[token-store] XUTIL_SCRAPER_USER / XUTIL_SCRAPER_PASS env vars are not set",
    );
  }

  const credRepo = await repo(ScraperCredential);
  const row = await credRepo.findOne({ where: { id: SCRAPER_ROW_ID } });

  const now = Date.now();
  const needsRefresh =
    !row || row.tokenExp.getTime() - now < REFRESH_THRESHOLD_MS;

  if (needsRefresh) {
    xutilLog("token-store refreshing scraper token", {
      user: env.XUTIL_SCRAPER_USER,
      hadCached: Boolean(row),
    });
    const client = createXutilClient();
    const bundle = await client.login(
      env.XUTIL_SCRAPER_USER,
      env.XUTIL_SCRAPER_PASS,
    );

    const encryptedToken = encrypt(bundle.accessToken);

    await credRepo.upsert(
      {
        id: SCRAPER_ROW_ID,
        username: env.XUTIL_SCRAPER_USER,
        encryptedToken,
        tokenExp: bundle.expiresAt,
        refreshToken: bundle.refreshToken,
      },
      ["id"],
    );

    return bundle.accessToken;
  }

  xutilLog("token-store using cached scraper token", {
    user: env.XUTIL_SCRAPER_USER,
    exp: row!.tokenExp.toISOString(),
  });

  return decrypt(row!.encryptedToken);
}
