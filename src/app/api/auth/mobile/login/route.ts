import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { z } from "zod";
import { repo, AppUser } from "@/infra/db";
import { signAppSession } from "@/lib/app-session-auth";
import { logAuthAttempt } from "@/lib/auth-attempts";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request): Promise<Response> {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const userRepo = await repo(AppUser);
  const user = await userRepo.findOne({ where: { email } });
  if (!user) {
    await logAuthAttempt({ email, success: false, reason: "user_not_found" });
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  const ok = await compare(password, user.passwordHash);
  if (!ok) {
    await logAuthAttempt({ email, success: false, reason: "invalid_password" });
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  await logAuthAttempt({ email, success: true });

  return NextResponse.json({
    userId: user.id,
    email: user.email,
    name: user.name,
    sessionToken: signAppSession({ userId: user.id, email: user.email }),
  });
}
