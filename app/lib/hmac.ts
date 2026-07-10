import crypto from "crypto";

// Shared HMAC signing primitive. admin-auth, agent-auth, and unsubscribe each
// hand-rolled this same quartet (secret resolution + base64url + createHmac +
// length-guarded timingSafeEqual); a re-typed constant-time compare is exactly
// the code you do not want three copies of. The token FORMATS stay in their own
// modules (auth = payload.sig JSON with exp; unsubscribe = hmac(email), no exp)
// because those legitimately differ; only the raw crypto moves down here.

export function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

// Resolve the first CONFIGURED (truthy) secret from an ordered preference list,
// then enforce the >=16 char guard on the winner. This preserves the exact
// semantics of the previous per-module getSecret() copies: agent-auth used
// `AGENT_SESSION_SECRET || ADMIN_SECRET` (first truthy, then length-check the
// winner, no fallback if the winner is set-but-short); admin-auth and
// unsubscribe used ADMIN_SECRET alone. Callers pass their own preference order so
// each domain keeps its intended key while sharing one implementation.
export function resolveSecret(...envNames: string[]): string {
  let s: string | undefined;
  for (const name of envNames) {
    if (process.env[name]) { s = process.env[name]; break; }
  }
  if (!s || s.length < 16) throw new Error(`Signing secret not configured (${envNames.join(" || ")})`);
  return s;
}

// base64url HMAC-SHA256 of payload. Byte-identical to the previous
// b64url(createHmac(...).digest()) and createHmac(...).digest("base64url")
// forms, so tokens/links signed before this refactor still verify.
export function sign(payload: string, secret: string): string {
  return b64url(crypto.createHmac("sha256", secret).update(payload).digest());
}

// Constant-time string equality. Length-guard first so timingSafeEqual never
// throws on mismatched lengths.
export function verifyTimingSafe(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
