import { hash } from "bcryptjs";
import { repo, AppUser, XutilLink } from "@/infra/db";
import { createXutilClient } from "@/infra/xutil/client";
import { encrypt } from "@/lib/crypto";
import type { TokenBundle } from "@/infra/xutil/contract";

export async function upsertUserFromXutilLogin(
  email: string,
  password: string,
  bundle: TokenBundle,
): Promise<AppUser> {
  const userRepo = await repo(AppUser);
  const linkRepo = await repo(XutilLink);
  const passwordHash = await hash(password, 12);

  let user = await userRepo.findOne({ where: { email } });
  if (!user) {
    user = await userRepo.save({
      email,
      name: email.split("@")[0],
      passwordHash,
      notifyNew: false,
      notifyAvailable: false,
      notifyWaitroom: false,
    });
  } else {
    await userRepo.update(user.id, { passwordHash });
  }

  await linkRepo.upsert(
    {
      userId: user.id,
      xutilUsername: email,
      encryptedToken: encrypt(bundle.accessToken),
      encryptedRefreshToken: bundle.refreshToken ? encrypt(bundle.refreshToken) : null,
      tokenExp: bundle.expiresAt,
    },
    ["userId"],
  );

  return user;
}

export async function loginWithXutilCredentials(
  email: string,
  password: string,
): Promise<AppUser> {
  const client = createXutilClient();
  const bundle = await client.login(email, password);
  return upsertUserFromXutilLogin(email, password, bundle);
}
