"use server";

import { auth } from "@/auth";
import { prisma } from "@/infra/db/prisma";
import { redirect } from "next/navigation";
import { z } from "zod";
import { encrypt } from "@/lib/crypto";

const notifSchema = z.object({
  notifyNew: z.coerce.boolean().default(false),
  notifyAvailable: z.coerce.boolean().default(false),
  notifyWaitroom: z.coerce.boolean().default(false),
});

export interface SettingsResult {
  error?: string;
  success?: boolean;
}

export async function updateNotificationsAction(_prevState: SettingsResult, formData: FormData): Promise<SettingsResult> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const raw = {
    notifyNew: formData.get("notifyNew") === "on",
    notifyAvailable: formData.get("notifyAvailable") === "on",
    notifyWaitroom: formData.get("notifyWaitroom") === "on",
  };

  const parsed = notifSchema.safeParse(raw);
  if (!parsed.success) return { error: "Datos inválidos" };

  await prisma.appUser.update({
    where: { id: session.user.id },
    data: parsed.data,
  });

  return { success: true };
}

const xutilSchema = z.object({
  xutilUsername: z.string().min(1, "Usuario requerido"),
  xutilToken: z.string().min(10, "Token muy corto"),
  tokenExp: z.string().datetime("Fecha inválida"),
});

export async function saveXutilLinkAction(_prevState: SettingsResult, formData: FormData): Promise<SettingsResult> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const raw = {
    xutilUsername: formData.get("xutilUsername"),
    xutilToken: formData.get("xutilToken"),
    tokenExp: formData.get("tokenExp"),
  };

  const parsed = xutilSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const encryptedToken = encrypt(parsed.data.xutilToken);

  await prisma.xutilLink.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      xutilUsername: parsed.data.xutilUsername,
      encryptedToken,
      tokenExp: new Date(parsed.data.tokenExp),
    },
    update: {
      xutilUsername: parsed.data.xutilUsername,
      encryptedToken,
      tokenExp: new Date(parsed.data.tokenExp),
    },
  });

  return { success: true };
}
