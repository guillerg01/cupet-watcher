import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/env";

export interface AppSessionPayload {
  userId: string;
  email: string;
  iat: number;
}

function sign(data: string): string {
  return createHmac("sha256", env.AUTH_SECRET).update(data).digest("base64url");
}

export function signAppSession(input: { userId: string; email: string }): string {
  const payload: AppSessionPayload = { ...input, iat: Date.now() };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifyAppSession(token: string | null | undefined): AppSessionPayload | null {
  if (!token) return null;
  const dot = token.indexOf(".");
  if (dot < 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!body || !sig) return null;
  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as AppSessionPayload;
  } catch {
    return null;
  }
}

export function appSessionFromRequest(req: Request): AppSessionPayload | null {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : header;
  return verifyAppSession(token);
}
