import { auth } from "@/auth";
import { NextResponse } from "next/server";

const PROTECTED = ["/dashboard", "/onboarding", "/stations", "/analytics", "/settings", "/predict"];

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const isProtected = PROTECTED.some((p) => nextUrl.pathname.startsWith(p));

  if (isProtected && !session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
