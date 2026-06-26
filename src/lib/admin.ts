import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { UserRole } from "@/infra/db";

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== UserRole.ADMIN) redirect("/dashboard");
  return session;
}

export async function requireAdminApi(): Promise<
  { ok: true; session: Session } | { ok: false; response: NextResponse }
> {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      ok: false,
      response: NextResponse.json({ error: "No autenticado." }, { status: 401 }),
    };
  }
  if (session.user.role !== UserRole.ADMIN) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Sin permisos de admin." }, { status: 403 }),
    };
  }
  return { ok: true, session };
}

export function isAdminRole(role: string | undefined): boolean {
  return role === UserRole.ADMIN;
}
