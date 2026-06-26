import "@/load-env";
import "reflect-metadata";
import bcrypt from "bcryptjs";
import { syncSchema, repo, AppUser, UserRole, db } from "@/infra/db";
import { establishStationBaseline } from "@/lib/ingest-stations";
import { env } from "@/env";

// New DetectionType values must exist in the Postgres enum BEFORE TypeORM's
// synchronize runs — otherwise synchronize tries to recreate the enum and can
// fail. ADD VALUE IF NOT EXISTS is idempotent and must run outside a tx (the
// TypeORM query() autocommits each statement, so this is fine).
async function ensureEnums(): Promise<void> {
  const dataSource = await db();
  const cols = (await dataSource.query(
    `SELECT udt_name FROM information_schema.columns
     WHERE table_name = 'DetectionEvent' AND column_name = 'type'`,
  )) as Array<{ udt_name: string }>;

  const enumName = cols[0]?.udt_name;
  if (!enumName) {
    // Fresh DB — synchronize will create the enum with all current values.
    process.stdout.write("[sync-db] DetectionEvent enum not present yet (fresh DB).\n");
    return;
  }

  for (const value of ["NEW", "REAPPEARED", "BECAME_AVAILABLE", "WAITROOM_ENABLED"]) {
    await dataSource.query(
      `ALTER TYPE "${enumName}" ADD VALUE IF NOT EXISTS '${value}'`,
    );
  }
  process.stdout.write("[sync-db] DetectionEvent enum values OK (REAPPEARED ensured).\n");
}

async function ensureDeviceColumns(): Promise<void> {
  const dataSource = await db();
  await dataSource.query(
    `ALTER TABLE "Device" ADD COLUMN IF NOT EXISTS "pendingPushQueue" jsonb NOT NULL DEFAULT '[]'`,
  );
  await dataSource.query(
    `ALTER TABLE "Device" ADD COLUMN IF NOT EXISTS "watchProvinceIds" jsonb NOT NULL DEFAULT '[]'`,
  );
  await dataSource.query(
    `ALTER TABLE "Device" ADD COLUMN IF NOT EXISTS "pendingPush" jsonb`,
  );
  await dataSource.query(
    `ALTER TABLE "AppUser" ADD COLUMN IF NOT EXISTS "lastAlertsSeenAt" timestamptz`,
  );
  await dataSource.query(
    `ALTER TABLE "AppUser" ADD COLUMN IF NOT EXISTS "lastAlertsReminderAt" timestamptz`,
  );
  process.stdout.write("[sync-db] Device/AppUser columns OK.\n");
}

async function seedAdmin(): Promise<void> {
  const email = env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = env.ADMIN_PASSWORD;

  if (!email || !password) {
    process.stdout.write("[sync-db] Admin seed skipped (ADMIN_EMAIL / ADMIN_PASSWORD not set).\n");
    return;
  }

  const userRepo = await repo(AppUser);
  const existing = await userRepo.findOne({ where: { email } });
  const passwordHash = await bcrypt.hash(password, 12);

  if (existing) {
    existing.role = UserRole.ADMIN;
    existing.passwordHash = passwordHash;
    if (!existing.name) existing.name = "Admin";
    await userRepo.save(existing);
    process.stdout.write(`[sync-db] Admin updated: ${email}\n`);
    return;
  }

  await userRepo.save({
    email,
    passwordHash,
    name: "Admin",
    role: UserRole.ADMIN,
    notifyNew: false,
    notifyAvailable: false,
    notifyWaitroom: false,
  });
  process.stdout.write(`[sync-db] Admin created: ${email}\n`);
}

ensureEnums()
  .then(() => syncSchema())
  .then(() => ensureDeviceColumns())
  .then(async () => {
    const n = await establishStationBaseline();
    if (n > 0) process.stdout.write(`[sync-db] Station baseline: ${n} cupets marked confirmed.\n`);
  })
  .then(() => seedAdmin())
  .then(() => process.stdout.write("[sync-db] Done.\n"))
  .catch((err) => {
    process.stderr.write(`[sync-db] Error: ${String(err)}\n`);
    process.exit(1);
  });
