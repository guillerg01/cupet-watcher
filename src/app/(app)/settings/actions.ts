"use server";

import { auth } from "@/auth";
import { repo, AppUser } from "@/infra/db";
import { redirect } from "next/navigation";
import { z } from "zod";

const notifSchema = z.object({
  notifyNew: z.coerce.boolean().default(false),
  notifyAvailable: z.coerce.boolean().default(false),
  notifyWaitroom: z.coerce.boolean().default(false),
});

export interface SettingsResult {
  error?: string;
  success?: boolean;
}

export async function updateNotificationsAction(
  _prevState: SettingsResult,
  formData: FormData,
): Promise<SettingsResult> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const raw = {
    notifyNew: formData.get("notifyNew") === "on",
    notifyAvailable: formData.get("notifyAvailable") === "on",
    notifyWaitroom: formData.get("notifyWaitroom") === "on",
  };

  const parsed = notifSchema.safeParse(raw);
  if (!parsed.success) return { error: "Datos inválidos" };

  const userRepo = await repo(AppUser);
  await userRepo.update({ id: session.user.id }, parsed.data);

  return { success: true };
}
