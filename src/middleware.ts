import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";
import { UserRole } from "@/infra/db/entities/enums";

const PROTECTED = ["/dashboard", "/onboarding", "/settings", "/queues", "/admin"];

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const isProtected = PROTECTED.some((p) => nextUrl.pathname.startsWith(p));
  const isAdminRoute = nextUrl.pathname.startsWith("/admin");

  if (isProtected && !session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isAdminRoute && session?.user?.role !== UserRole.ADMIN) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
