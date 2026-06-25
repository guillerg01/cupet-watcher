import "@/load-env";
import "reflect-metadata";
import { hash } from "bcryptjs";
import { syncSchema, repo, AppUser, UserRole } from "@/infra/db";
import { env } from "@/env";

async function main(): Promise<void> {
  const email = env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = env.ADMIN_PASSWORD;

  if (!email || !password) {
    process.stderr.write(
      "Set ADMIN_EMAIL and ADMIN_PASSWORD in .env (or Render env vars), then run again.\n",
    );
    process.exit(1);
  }

  await syncSchema();

  const userRepo = await repo(AppUser);
  const existing = await userRepo.findOne({ where: { email } });
  const passwordHash = await hash(password, 12);

  if (existing) {
    existing.role = UserRole.ADMIN;
    existing.passwordHash = passwordHash;
    if (!existing.name) existing.name = "Admin";
    await userRepo.save(existing);
    process.stdout.write(`[seed-admin] Updated admin: ${email}\n`);
  } else {
    await userRepo.save({
      email,
      passwordHash,
      name: "Admin",
      role: UserRole.ADMIN,
      notifyNew: false,
      notifyAvailable: false,
      notifyWaitroom: false,
    });
    process.stdout.write(`[seed-admin] Created admin: ${email}\n`);
  }
}

main().catch((err) => {
  process.stderr.write(`[seed-admin] Error: ${String(err)}\n`);
  process.exit(1);
});
