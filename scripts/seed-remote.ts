import "@/load-env";
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import { newId } from "../src/infra/db/id.js";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL missing");
  process.exit(1);
}

const email = (process.env.ADMIN_EMAIL ?? "admin@admin.com").trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD ?? "Admin";

const sql = neon(url);

async function main(): Promise<void> {
  console.log("[seed-remote] Connecting via Neon HTTP...");

  await sql`SELECT 1 AS ok`;
  console.log("[seed-remote] Connected.");

  const enumRows = await sql`
    SELECT t.typname
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE e.enumlabel = 'ADMIN'
    GROUP BY t.typname
    LIMIT 1
  `;
  const roleEnum = (enumRows[0]?.typname as string | undefined) ?? "UserRole";

  await sql`
    CREATE TABLE IF NOT EXISTS "AppUser" (
      "id" varchar NOT NULL,
      "email" varchar NOT NULL,
      "passwordHash" varchar NOT NULL,
      "name" varchar,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "notifyNew" boolean NOT NULL DEFAULT false,
      "notifyAvailable" boolean NOT NULL DEFAULT false,
      "notifyWaitroom" boolean NOT NULL DEFAULT false,
      CONSTRAINT "PK_AppUser" PRIMARY KEY ("id"),
      CONSTRAINT "UQ_AppUser_email" UNIQUE ("email")
    )
  `;

  const hasRole = await sql`
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'AppUser' AND column_name = 'role'
    LIMIT 1
  `;
  if (hasRole.length === 0) {
    await sql.unsafe(
      `ALTER TABLE "AppUser" ADD COLUMN IF NOT EXISTS "role" "${roleEnum}" NOT NULL DEFAULT 'USER'`,
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const existing = await sql`SELECT id FROM "AppUser" WHERE email = ${email} LIMIT 1`;

  if (existing.length > 0) {
    await sql`
      UPDATE "AppUser"
      SET "passwordHash" = ${passwordHash},
          "name" = COALESCE("name", 'Admin')
      WHERE email = ${email}
    `;
    await sql.unsafe(`UPDATE "AppUser" SET "role" = 'ADMIN'::"${roleEnum}" WHERE email = '${email.replace(/'/g, "''")}'`);
    console.log(`[seed-remote] Admin updated: ${email}`);
    return;
  }

  const id = newId();
  await sql`
    INSERT INTO "AppUser" (
      "id", "email", "passwordHash", "name",
      "notifyNew", "notifyAvailable", "notifyWaitroom"
    ) VALUES (
      ${id}, ${email}, ${passwordHash}, 'Admin',
      false, false, false
    )
  `;
  await sql.unsafe(`UPDATE "AppUser" SET "role" = 'ADMIN'::"${roleEnum}" WHERE id = '${id}'`);
  console.log(`[seed-remote] Admin created: ${email}`);
}

main().catch((err) => {
  console.error("[seed-remote] Error:", err);
  process.exit(1);
});
