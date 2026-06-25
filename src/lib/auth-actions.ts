"use server";

import { z } from "zod";
import { hash } from "bcryptjs";
import { repo, AppUser, UserProvince, UserRole } from "@/infra/db";
import { signIn, auth } from "@/auth";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { logAuthAttempt } from "@/lib/auth-attempts";
import { isAdminRole } from "@/lib/admin";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Contraseña requerida"),
});

const registerSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
  name: z.string().optional(),
});

export interface ActionResult {
  error?: string;
}

export async function loginAction(_prevState: ActionResult, formData: FormData): Promise<ActionResult> {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    const email = typeof raw.email === "string" ? raw.email : "";
    if (email) {
      await logAuthAttempt({ email, success: false, reason: "invalid_form" });
    }
    return { error: parsed.error.errors[0].message };
  }

  try {
    const result = await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });

    if (result?.error) {
      return { error: "Email o contraseña incorrectos" };
    }
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Email o contraseña incorrectos" };
    }
    throw err;
  }

  const session = await auth();
  if (!session?.user?.id) {
    return { error: "No se pudo iniciar sesión" };
  }

  if (isAdminRole(session.user.role)) {
    redirect("/admin");
  }

  const userProvinceRepo = await repo(UserProvince);
  const provinceCount = await userProvinceRepo.count({
    where: { userId: session.user.id },
  });

  redirect(provinceCount > 0 ? "/dashboard" : "/onboarding");
}

export async function registerAction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    name: formData.get("name") ?? undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const { email, password, name } = parsed.data;
  const userRepo = await repo(AppUser);

  const existing = await userRepo.findOne({ where: { email } });
  if (existing) {
    return { error: "Ese email ya está registrado" };
  }

  const passwordHash = await hash(password, 12);
  await userRepo.save({
    email,
    passwordHash,
    name: name && name.trim() ? name.trim() : email.split("@")[0],
    role: UserRole.USER,
    notifyNew: true,
    notifyAvailable: false,
    notifyWaitroom: false,
  });

  try {
    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) {
      return { error: "Cuenta creada, pero falló el inicio de sesión. Probá entrar." };
    }
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Cuenta creada, pero falló el inicio de sesión. Probá entrar." };
    }
    throw err;
  }

  redirect("/onboarding");
}
