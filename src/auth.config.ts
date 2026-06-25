import type { NextAuthConfig } from "next-auth";
import type { UserRole } from "@/infra/db/entities/enums";

const THIRTY_DAYS_S = 30 * 24 * 60 * 60;

export const authConfig = {
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: THIRTY_DAYS_S,
  },
  jwt: {
    maxAge: THIRTY_DAYS_S,
  },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.id = user.id;
      if (user?.email) token.email = user.email;
      if (user?.role) token.role = user.role;
      return token;
    },
    session({ session, token }) {
      if (token.id && session.user) {
        session.user.id = token.id as string;
      }
      if (token.email && session.user) {
        session.user.email = token.email as string;
      }
      if (token.role && session.user) {
        session.user.role = token.role as UserRole;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
