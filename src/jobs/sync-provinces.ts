import { repo, Province } from "@/infra/db";
import { createXutilClient } from "@/infra/xutil/client";
import { getScraperToken } from "@/infra/xutil/token-store";

export async function runSyncProvinces(token?: string): Promise<number> {
  const accessToken = token ?? (await getScraperToken());
  const client = createXutilClient();
  const raw = await client.getProvincias(accessToken);
  const provinceRepo = await repo(Province);

  for (const p of raw) {
    await provinceRepo.upsert(
      { id: p.id, name: p.nombre_provincia.trim() },
      ["id"],
    );
  }

  return raw.length;
}
