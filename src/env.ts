import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().url(),
  XUTIL_BASE: z.string().url().default("https://ticket.xutil.net/apps/bienestar/api"),
  XUTIL_OAUTH_URL: z.string().url().default("https://ticket.xutil.net/oauth2/token"),
  XUTIL_APP_HEADER: z.string().default("agencia-citas"),
  XUTIL_CLIENT_ID: z.string().optional().default(""),
  XUTIL_SCRAPER_USER: z.string().optional().default(""),
  XUTIL_SCRAPER_PASS: z.string().optional().default(""),
  RESEND_API_KEY: z.string().optional().default(""),
  EMAIL_FROM: z.string().default("Cupet Watcher <alerts@example.com>"),
  AUTH_SECRET: z.string().optional().default("dev-secret-change-me"),
  ENCRYPTION_KEY: z.string().optional().default(""),
  SCRAPE_PAGE_DELAY_MS_MIN: z.coerce.number().default(300),
  SCRAPE_PAGE_DELAY_MS_MAX: z.coerce.number().default(800),
  SCRAPE_CATALOG_CRON: z.string().default("0 * * * *"),
  SCRAPE_AVAILABILITY_CRON: z.string().default("*/20 * * * *"),
  SEND_NOTIFICATIONS_CRON: z.string().default("*/2 * * * *"),
});

export const env = schema.parse(process.env);
export type Env = z.infer<typeof schema>;
