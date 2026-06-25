"use server";

import { auth } from "@/auth";
import { db, repo, AppUser, UserProvince } from "@/infra/db";
import { redirect } from "next/navigation";
import { z } from "zod";

const schema = z.object({
  provinceIds: z.union([z.string(), z.array(z.string())]).transform((v) =>
    (Array.isArray(v) ? v : [v]).map(Number).filter((n) => !isNaN(n)),
  ),
  notifyNew: z.coerce.boolean().default(false),
});

export async function saveProvincesAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;
  const raw = {
    provinceIds: formData.getAll("provinceIds"),
    notifyNew: formData.get("notifyNew") === "on",
  };
  const parsed = schema.safeParse(raw);
  if (!parsed.success) redirect("/onboarding");

  const { provinceIds, notifyNew } = parsed.data;
  const ds = await db();

  await ds.transaction(async (manager) => {
    await manager.delete(UserProvince, { userId });

    if (provinceIds.length > 0) {
      await manager.insert(
        UserProvince,
        provinceIds.map((provinceId) => ({ userId, provinceId })),
      );
    }

    await manager.getRepository(AppUser).update(userId, { notifyNew });
  });

  redirect("/dashboard");
}
