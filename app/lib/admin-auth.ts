import crypto from "crypto";
import { cookies } from "next/headers";

/**
 * Minimal magic-link auth for the admin dashboard.
 * Single allowed email (ADMIN_EMAIL). HMAC-signed tokens.
 *
 * Required env:
 *   ADMIN_SECRET  - 32+ char random string (HMAC key)
 *   ADMIN_EMAIL   - the single email allowed to sign in
 */

export const COOKIE_NAME = "fc_admin";
const MAGIC_LINK_TTL_MS = 24 * 60 * 60 * 1000;
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function getSecret(): string {
  const s = process.env.ADMIN_SECRET;
  if (!s || s.length < 16) throw new Error("ADMIN_SECRET not configured");
  return s;
}

export function getAdminEmail(): string {
  return (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(payload: string): string {
  return b64url(crypto.createHmac("sha256", getSecret()).update(payload).digest());
}

function issueToken(email: string, ttlMs: number): string {
  const payload = JSON.stringify({ email: email.toLowerCase().trim(), exp: Date.now() + ttlMs });
  const payloadB64 = b64url(payload);
  return `${payloadB64}.${sign(payloadB64)}`;
}

export function issueMagicLink(email: string): string {
  return issueToken(email, MAGIC_LINK_TTL_MS);
}

export function issueSession(email: string): string {
  return issueToken(email, SESSION_TTL_MS);
}

export function verifyToken(token: string | undefined | null): { email: string } | null {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [payloadB64, sig] = parts;
    const expected = sign(payloadB64);
    // Constant-time comparison
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    if (typeof payload.email !== "string") return null;
    return { email: payload.email };
  } catch {
    return null;
  }
}

export async function getAdminSession(): Promise<{ email: string } | null> {
  try {
    const store = await cookies();
    const token = store.get(COOKIE_NAME)?.value;
    const session = verifyToken(token);
    if (!session) return null;
    const allowed = getAdminEmail();
    if (!allowed || session.email !== allowed) return null;
    return session;
  } catch {
    return null;
  }
}
