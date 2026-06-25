import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { repo, AppUser } from "@/infra/db";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
});

/**
 * Public signup (used by the mobile app and as a JSON alternative to the web form).
 * Creates an app account (email + bcrypt password). No ticket involved.
 */
export async function POST(req: Request): Promise<Response> {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const { email, password, name } = parsed.data;
  const userRepo = await repo(AppUser);

  const existing = await userRepo.findOne({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "email_taken" }, { status: 409 });
  }

  const passwordHash = await hash(password, 12);
  const user = await userRepo.save({
    email,
    passwordHash,
    name: name && name.trim() ? name.trim() : email.split("@")[0],
    notifyNew: true,
    notifyAvailable: false,
    notifyWaitroom: false,
  });

  return NextResponse.json({ id: user.id, email: user.email });
}
