import { createHash } from "crypto";

export function sha256Digest(input: unknown): string {
  const json = typeof input === "string" ? input : JSON.stringify(input);
  return createHash("sha256").update(json).digest("hex").slice(0, 16);
}

export function hashSignature(sig: string): string {
  return createHash("sha256").update(sig).digest("hex").slice(0, 16);
}
