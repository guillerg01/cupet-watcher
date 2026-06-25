import { repo, XutilLink } from "@/infra/db";
import { decrypt } from "@/lib/crypto";

export async function getUserXutilToken(userId: string): Promise<string | null> {
  const linkRepo = await repo(XutilLink);
  const link = await linkRepo.findOne({ where: { userId } });
  if (!link || link.tokenExp <= new Date()) return null;
  return decrypt(link.encryptedToken);
}
