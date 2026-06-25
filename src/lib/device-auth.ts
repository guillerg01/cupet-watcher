import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/env";

/**
 * Stateless device command token (HMAC, no extra deps).
 * Format: base64url(JSON payload) "." base64url(HMAC-SHA256(payload)).
 * Signed with AUTH_SECRET. Held by the phone, sent as `Authorization: Bearer <token>`.
 * Ticket credentials are NEVER part of this — they stay on the device.
 */
export interface DeviceTokenPayload {
  deviceId: string;
  xutilUsername: string;
  iat: number;
}

function sign(data: string): string {
  return createHmac("sha256", env.AUTH_SECRET).update(data).digest("base64url");
}

export function signDeviceToken(input: { deviceId: string; xutilUsername: string }): string {
  const payload: DeviceTokenPayload = { ...input, iat: Date.now() };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifyDeviceToken(
  token: string | null | undefined,
): DeviceTokenPayload | null {
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
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as DeviceTokenPayload;
  } catch {
    return null;
  }
}

/** Extracts and verifies the device token from a request's Authorization header. */
export function deviceFromRequest(req: Request): DeviceTokenPayload | null {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : header;
  return verifyDeviceToken(token);
}
