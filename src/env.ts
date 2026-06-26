import { z } from "zod";

const schema = z.object({
  // Optional at build time — the build does not connect to the DB. data-source.ts
  // resolves/validates the real URL at runtime (initialize()).
  DATABASE_URL: z.string().optional().default(""),
  XUTIL_BASE: z.string().url().default("https://ticket.xutil.net/apps/bienestar/api"),
  XUTIL_OAUTH_URL: z.string().url().default("https://ticket.xutil.net/oauth2/token"),
  XUTIL_APP_HEADER: z.string().default("agencia-citas"),
  XUTIL_OAUTH_CLIENT_ID: z.string().default("6Z2XcgkMQkXtUWCxy6y7eOK2ZIAa"),
  XUTIL_OAUTH_CLIENT_SECRET: z.string().default("WHkjL78tUHlwMPj7fd_FF5kU2hIa"),
  XUTIL_OAUTH_BASIC: z.string().optional().default(""),
  XUTIL_SCRAPER_USER: z.string().optional().default(""),
  XUTIL_SCRAPER_PASS: z.string().optional().default(""),
  XUTIL_TLS_INSECURE: z
    .string()
    .optional()
    .default("false")
    .transform((v) => v === "true" || v === "1"),
  XUTIL_DEBUG: z
    .string()
    .optional()
    .default("false")
    .transform((v) => v === "true" || v === "1"),
  RESEND_API_KEY: z.string().optional().default(""),
  EMAIL_FROM: z.string().default("Cupet Watcher <alerts@example.com>"),
  AUTH_SECRET: z.string().optional().default("dev-secret-change-me"),
  ADMIN_EMAIL: z.string().optional().default(""),
  ADMIN_PASSWORD: z.string().optional().default(""),
  ENCRYPTION_KEY: z.string().optional().default(""),
  SCRAPE_PAGE_DELAY_MS_MIN: z.coerce.number().default(3500),
  SCRAPE_PAGE_DELAY_MS_MAX: z.coerce.number().default(7000),
  SCRAPE_RATE_LIMIT_COOLDOWN_MS: z.coerce.number().default(10_000),
  WORKER_CHECK_CRON: z.string().default("*/5 * * * *"),
  PREDICT_CRON: z.string().default("0 */6 * * *"),
});

export const env = schema.parse(process.env);
export type Env = z.infer<typeof schema>;
