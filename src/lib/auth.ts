/**
 * Runtime-agnostic auth helpers using the Web Crypto API, so the same code
 * works in both Node API routes and the (edge) middleware.
 */

export const SESSION_COOKIE = "sh_session";

function secret(): string {
  return (
    process.env.SESSION_SECRET ||
    process.env.APP_PASSWORD ||
    "sarungallo-default-secret"
  );
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Deterministic session token derived from the configured password. */
export async function sessionToken(): Promise<string> {
  const pw = process.env.APP_PASSWORD ?? "";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`auth:${pw}`),
  );
  return toHex(sig);
}

export function verifyPassword(input: string): boolean {
  const expected = process.env.APP_PASSWORD ?? "";
  if (!expected) return false;
  if (input.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < input.length; i++) {
    mismatch |= input.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const expected = await sessionToken();
  if (token.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < token.length; i++) {
    mismatch |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}

/** True when a non-empty APP_PASSWORD is configured (matches middleware). */
export function authEnabled(): boolean {
  return Boolean(process.env.APP_PASSWORD?.trim());
}
