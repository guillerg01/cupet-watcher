import { randomBytes } from "crypto";

export function newId(): string {
  const t = Date.now().toString(36);
  const r = randomBytes(8).toString("hex");
  return `c${t}${r}`;
}
