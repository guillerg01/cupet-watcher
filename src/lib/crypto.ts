import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { env } from "@/env";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;

let _warned = false;

/**
 * Resolves the 32-byte encryption key.
 * If ENCRYPTION_KEY is set, decodes from base64.
 * Otherwise derives a deterministic dev key via SHA-256 of a constant and warns once.
 */
function resolveKey(): Buffer {
  if (env.ENCRYPTION_KEY) {
    const buf = Buffer.from(env.ENCRYPTION_KEY, "base64");
    if (buf.byteLength !== 32) {
      throw new Error(
        `ENCRYPTION_KEY must be 32 bytes (base64-encoded). Got ${buf.byteLength} bytes.`,
      );
    }
    return buf;
  }

  // Dev fallback — NOT secure for production
  if (!_warned) {
    console.warn(
      "[crypto] ENCRYPTION_KEY not set — using insecure dev key derived from constant. Set ENCRYPTION_KEY in production.",
    );
    _warned = true;
  }
  return createHash("sha256").update("cupet-watcher-dev-constant").digest();
}

/**
 * Encrypts `plain` using AES-256-GCM.
 * Returns base64(iv | authTag | ciphertext) — all fields concatenated.
 */
export function encrypt(plain: string): string {
  const key = resolveKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  // Layout: iv (12) | tag (16) | ciphertext (variable)
  const combined = Buffer.concat([iv, tag, encrypted]);
  return combined.toString("base64");
}

/**
 * Decrypts a payload previously produced by `encrypt`.
 * Expects base64(iv | authTag | ciphertext).
 */
export function decrypt(payload: string): string {
  const key = resolveKey();
  const combined = Buffer.from(payload, "base64");

  if (combined.byteLength < IV_BYTES + TAG_BYTES) {
    throw new Error("decrypt: payload too short — likely corrupted.");
  }

  const iv = combined.subarray(0, IV_BYTES);
  const tag = combined.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const ciphertext = combined.subarray(IV_BYTES + TAG_BYTES);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString(
    "utf8",
  );
}
