import { env } from "@/env";

export function xutilLog(message: string, data?: Record<string, unknown>): void {
  if (!env.XUTIL_DEBUG) return;
  if (data) {
    process.stdout.write(`[xutil] ${message} ${JSON.stringify(data)}\n`);
    return;
  }
  process.stdout.write(`[xutil] ${message}\n`);
}
