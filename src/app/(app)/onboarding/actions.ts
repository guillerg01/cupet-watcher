"use server";

import { auth } from "@/auth";
import { prisma } from "@/infra/db/prisma";
import { redirect } from "next/navigation";
import { z } from "zod";

const schema = z.object({
  provinceIds: z.union([z.string(), z.array(z.string())]).transform((v) =>
    (Array.isArray(v) ? v : [v]).map(Number).filter((n) => !isNaN(n))
  ),
});

export async function saveProvincesAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;
  const raw = { provinceIds: formData.getAll("provinceIds") };
  const parsed = schema.safeParse(raw);
  if (!parsed.success) redirect("/onboarding");

  const { provinceIds } = parsed.data;

  await prisma.$transaction([
    prisma.userProvince.deleteMany({ where: { userId } }),
    ...(provinceIds.length > 0
      ? [
          prisma.userProvince.createMany({
            data: provinceIds.map((provinceId) => ({ userId, provinceId })),
            skipDuplicates: true,
          }),
        ]
      : []),
  ]);

  redirect("/dashboard");
}
