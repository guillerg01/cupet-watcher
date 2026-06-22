"use server";

import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/infra/db/prisma";
import { signIn } from "@/auth";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";

const registerSchema = z.object({
  email: z.string().email("Email inválido"),
  name: z.string().min(2, "Nombre demasiado corto"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Contraseña requerida"),
});

export interface ActionResult {
  error?: string;
}

export async function registerAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const raw = {
    email: formData.get("email"),
    name: formData.get("name"),
    password: formData.get("password"),
  };

  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const { email, name, password } = parsed.data;

  const existing = await prisma.appUser.findUnique({ where: { email } });
  if (existing) {
    return { error: "Ya existe una cuenta con ese email" };
  }

  const passwordHash = await hash(password, 12);
  await prisma.appUser.create({
    data: {
      email,
      name,
      passwordHash,
      notifyNew: false,
      notifyAvailable: false,
      notifyWaitroom: false,
    },
  });

  redirect("/login?registered=1");
}

export async function loginAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/dashboard",
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Credenciales incorrectas" };
    }
    throw err;
  }

  return {};
}
