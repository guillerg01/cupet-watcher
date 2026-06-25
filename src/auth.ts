import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { z } from "zod";
import { authConfig } from "@/auth.config";
import { repo, AppUser, UserRole } from "@/infra/db";
import { logAuthAttempt } from "@/lib/auth-attempts";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// v2: web auth is DECOUPLED from ticket. The server has no Cuban IP, so it cannot
// validate ticket credentials. The app account is a plain email+password (bcrypt).
// Ticket login happens only on the phone, where the token stays local.
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const userRepo = await repo(AppUser);
        const user = await userRepo.findOne({ where: { email } });
        if (!user) {
          await logAuthAttempt({ email, success: false, reason: "user_not_found" });
          return null;
        }

        const ok = await compare(password, user.passwordHash);
        if (!ok) {
          await logAuthAttempt({ email, success: false, reason: "invalid_password" });
          return null;
        }

        await logAuthAttempt({ email, success: true });
        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          role: user.role ?? UserRole.USER,
        };
      },
    }),
  ],
});
