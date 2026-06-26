import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { repo, AppUser, UserProvince, UserRole } from "@/infra/db";
import { logAuthAttempt, tooManyRecentFailures } from "@/lib/auth-attempts";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request): Promise<Response> {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    const email = typeof body?.email === "string" ? body.email : "";
    if (email) await logAuthAttempt({ email, success: false, reason: "invalid_body" });
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase().trim();
  const { password } = parsed.data;

  if (await tooManyRecentFailures(email)) {
    return NextResponse.json(
      { error: "Demasiados intentos. Esperá unos minutos." },
      { status: 429 },
    );
  }

  try {
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      await logAuthAttempt({ email, success: false, reason: "invalid_credentials" });
      return NextResponse.json({ error: "Email o contraseña incorrectos" }, { status: 401 });
    }
  } catch (err) {
    if (err instanceof AuthError) {
      await logAuthAttempt({ email, success: false, reason: "invalid_credentials" });
      return NextResponse.json({ error: "Email o contraseña incorrectos" }, { status: 401 });
    }
    throw err;
  }

  // NOTE: do NOT call auth() here. signIn() set the session cookie on this
  // response, but it is not readable within the SAME request — auth() would see
  // the incoming (empty) cookies and return null → false 500. Look the user up
  // directly to decide the redirect.
  const userRepo = await repo(AppUser);
  const user = await userRepo.findOne({
    where: { email },
    select: { id: true, role: true },
  });

  let redirectTo = "/dashboard";
  if (user?.role === UserRole.ADMIN) {
    redirectTo = "/admin";
  } else if (user) {
    const userProvinceRepo = await repo(UserProvince);
    const provinceCount = await userProvinceRepo.count({
      where: { userId: user.id },
    });
    if (provinceCount === 0) redirectTo = "/onboarding";
  }

  return NextResponse.json({ redirectTo });
}
