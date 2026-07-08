import crypto from "crypto";

// Signed one-click unsubscribe. The link is public (it ships in every email and
// agent emails are semi-public), so the email alone must never be enough to opt
// someone out: without a valid signature anyone could script
// /unsubscribe?email=<competitor> and silently kill their digest. We HMAC the
// address so only links we generated are honoured, and the route mutates on POST
// only (GET renders a confirm page) so link-prefetchers / mail scanners that
// fetch the URL on delivery cannot auto-unsubscribe the recipient.

function getSecret(): string {
  const s = process.env.ADMIN_SECRET;
  if (!s || s.length < 16) throw new Error("ADMIN_SECRET not configured");
  return s;
}

const norm = (email: string) => email.toLowerCase().trim();

export function signUnsubscribe(email: string): string {
  return crypto.createHmac("sha256", getSecret()).update(`unsub:${norm(email)}`).digest("base64url");
}

export function verifyUnsubscribe(email: string, token: string | null | undefined): boolean {
  if (!email || !token) return false;
  const expected = signUnsubscribe(email);
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  // Length-guard first: timingSafeEqual throws on unequal lengths.
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// Canonical unsubscribe URL for emails. Single source of truth so every sender
// produces a signed link against the same origin (callers were passing the
// domain inconsistently — a literal in two crons, a BASE const in a third).
const SITE_URL = "https://fair-comparisons.com";

export function unsubscribeUrl(email: string): string {
  const e = encodeURIComponent(email);
  const t = encodeURIComponent(signUnsubscribe(email));
  return `${SITE_URL}/unsubscribe?email=${e}&t=${t}`;
}
