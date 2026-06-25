import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { UserRole } from "@/infra/db";

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== UserRole.ADMIN) redirect("/dashboard");
  return session;
}

export function isAdminRole(role: string | undefined): boolean {
  return role === UserRole.ADMIN;
}
