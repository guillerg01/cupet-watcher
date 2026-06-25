import "@/load-env";
import "reflect-metadata";
import bcrypt from "bcryptjs";
import { syncSchema, repo, AppUser, UserRole } from "@/infra/db";
import { env } from "@/env";

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

syncSchema()
  .then(() => seedAdmin())
  .then(() => process.stdout.write("[sync-db] Done.\n"))
  .catch((err) => {
    process.stderr.write(`[sync-db] Error: ${String(err)}\n`);
    process.exit(1);
  });
