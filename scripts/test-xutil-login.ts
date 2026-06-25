import "@/load-env";
import { createXutilClient } from "@/infra/xutil/client";
import { env } from "@/env";

async function main() {
  if (!env.XUTIL_SCRAPER_USER || !env.XUTIL_SCRAPER_PASS) {
    throw new Error("Set XUTIL_SCRAPER_USER and XUTIL_SCRAPER_PASS in .env");
  }

  const client = createXutilClient();
  const bundle = await client.login(env.XUTIL_SCRAPER_USER, env.XUTIL_SCRAPER_PASS);
  process.stdout.write(
    `[ok] token expires ${bundle.expiresAt.toISOString()} prefix ${bundle.accessToken.slice(0, 24)}...\n`,
  );
}

main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
