import crypto from "crypto";
import { cookies } from "next/headers";

/**
 * Minimal magic-link auth for the admin dashboard.
 * Allowlist of emails (ADMIN_EMAILS, comma-separated). HMAC-signed tokens.
 *
 * Required env:
 *   ADMIN_SECRET  - 32+ char random string (HMAC key)
 *   ADMIN_EMAILS  - comma-separated allowlist (e.g.
 *                   "lex@coachup.sg,hello@fair-comparisons.com")
 *
 * Back-compat: if ADMIN_EMAILS is unset, falls back to ADMIN_EMAIL (single).
 */

export const COOKIE_NAME = "fc_admin";
const MAGIC_LINK_TTL_MS = 24 * 60 * 60 * 1000;
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function getSecret(): string {
  const s = process.env.ADMIN_SECRET;
  if (!s || s.length < 16) throw new Error("ADMIN_SECRET not configured");
  return s;
}

export function getAdminEmails(): Set<string> {
  const list = process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? "";
  const set = new Set<string>();
  for (const raw of list.split(",")) {
    const e = raw.toLowerCase().trim();
    if (e) set.add(e);
  }
  return set;
}

export function isAdminEmail(email: string): boolean {
  return getAdminEmails().has(email.toLowerCase().trim());
}

/**
 * Constant-time check of a submitted password against ADMIN_PASSWORD. Both sides
 * are trimmed (a trailing newline pasted into the Vercel env var is the classic
 * "correct password rejected" cause) then SHA-256'd so the comparison is
 * fixed-length and timingSafeEqual never throws on length mismatch. Returns
 * false when ADMIN_PASSWORD is unset/blank, so the password path is simply
 * unavailable until the operator configures it (fails closed).
 */
export function verifyAdminPassword(password: string | undefined | null): boolean {
  const expected = (process.env.ADMIN_PASSWORD ?? "").trim();
  if (!expected) return false;
  if (typeof password !== "string") return false;
  const given = password.trim();
  if (!given) return false;
  const h = (s: string) => crypto.createHash("sha256").update(s).digest();
  return crypto.timingSafeEqual(h(given), h(expected));
}

/** Runtime state of the password path, for diagnostics only (no secret value). */
export function adminPasswordDiag(): {
  configured: boolean;
  length: number;
  adminEmails: number;
} {
  const p = (process.env.ADMIN_PASSWORD ?? "").trim();
  return { configured: p.length > 0, length: p.length, adminEmails: getAdminEmails().size };
}

/** @deprecated Use isAdminEmail / getAdminEmails. Kept for back-compat. */
export function getAdminEmail(): string {
  const first = [...getAdminEmails()][0];
  return first ?? "";
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
    if (!isAdminEmail(session.email)) return null;
    return session;
  } catch {
    return null;
  }
}
