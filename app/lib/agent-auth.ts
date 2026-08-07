import { b64url, resolveSecret, sign as hmacSign, verifyTimingSafe } from "./hmac";
import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { supabaseAdmin } from "./supabase";
import { isAdminEmail } from "./admin-auth";

/**
 * Magic-link session auth for the AGENT dashboard.
 *
 * Replaces the old "email in the request body" model, where knowing a claimed
 * agent's (semi-public) email was enough to read their pipeline or act as them.
 * Now an agent must prove control of their claimed email via a magic link, which
 * sets an HMAC-signed httpOnly session cookie; every agent route derives the
 * agent from that cookie, never from request input.
 *
 * Reuses ADMIN_SECRET as the HMAC key (a separate cookie name + a claimed-agent
 * check keep agent and admin sessions from crossing over). Set AGENT_SESSION_SECRET
 * to override if you want fully isolated keys.
 */

export const AGENT_COOKIE = "fc_agent";
const MAGIC_LINK_TTL_MS = 24 * 60 * 60 * 1000;
export const AGENT_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
// Admin-help impersonation sessions are deliberately short-lived.
export const IMPERSONATION_TTL_MS = 2 * 60 * 60 * 1000;

// Agent sessions prefer a dedicated AGENT_SESSION_SECRET, falling back to
// ADMIN_SECRET (the shared default). Preference order passed to resolveSecret.
function getSecret(): string {
  return resolveSecret("AGENT_SESSION_SECRET", "ADMIN_SECRET");
}

function sign(payload: string): string {
  return hmacSign(payload, getSecret());
}

function issueToken(email: string, ttlMs: number): string {
  const payload = JSON.stringify({ email: email.toLowerCase().trim(), kind: "agent", exp: Date.now() + ttlMs });
  const payloadB64 = b64url(payload);
  return `${payloadB64}.${sign(payloadB64)}`;
}

/**
 * A magic link carries a `jti` so its redemption can be recorded and a replay
 * rejected. Deliberately NOT routed through issueToken(): a 30-day session
 * token must never be usable as a magic link, and vice versa.
 */
export function issueAgentMagicLink(email: string): string {
  const payload = JSON.stringify({
    email: email.toLowerCase().trim(),
    kind: "agent",
    jti: randomUUID(),
    exp: Date.now() + MAGIC_LINK_TTL_MS,
  });
  const payloadB64 = b64url(payload);
  return `${payloadB64}.${sign(payloadB64)}`;
}

/**
 * Verify a magic link AND spend it. Returns the email on the first redemption
 * and null on every later one.
 *
 * The login email promises the link "can be used once". Before this it was good
 * for its full 24 hours and each use minted a fresh 30-day session, so a
 * forwarded mail, a shared agency inbox, a mail backup or synced history handed
 * over the agent's entire dashboard. The insert is the lock: jti is the primary
 * key, so a concurrent second redemption loses on the unique violation rather
 * than racing a read-then-write check.
 */
export async function redeemAgentMagicLink(
  token: string | undefined | null
): Promise<{ email: string } | null> {
  const session = verifyAgentToken(token);
  // Impersonation tokens must never be upgraded into a clean agent session.
  if (!session || session.impersonatedBy) return null;

  const jti = session.jti;
  // Links minted before this shipped carry no jti. Accept them (rejecting would
  // strand an agent mid-login through no fault of theirs) but say so in the
  // log. They age out on their own within 24 hours of the deploy.
  if (!jti) {
    console.warn("[agent-auth] redeeming a legacy magic link with no jti; replay not enforced");
    return { email: session.email };
  }

  const { error } = await supabaseAdmin()
    .from("sg_magic_link_redemptions")
    .insert({ jti, email: session.email });
  if (error) {
    // 23505 = unique_violation: already spent. Anything else is a real failure,
    // and failing closed is right for an auth path.
    console.warn("[agent-auth] magic link rejected", error.code === "23505" ? "already used" : error);
    return null;
  }
  return { email: session.email };
}

export function issueAgentSession(email: string): string {
  return issueToken(email, AGENT_SESSION_TTL_MS);
}

/**
 * Mint an ADMIN IMPERSONATION session for a claimed agent. Carries the
 * impersonating admin's email in `imp` so the dashboard can flag it and routes
 * can tell a real agent apart from an admin acting as one. Short-lived.
 */
export function issueImpersonationSession(email: string, adminEmail: string): string {
  const payload = JSON.stringify({
    email: email.toLowerCase().trim(),
    kind: "agent",
    imp: adminEmail.toLowerCase().trim(),
    exp: Date.now() + IMPERSONATION_TTL_MS,
  });
  const payloadB64 = b64url(payload);
  return `${payloadB64}.${sign(payloadB64)}`;
}

export function verifyAgentToken(
  token: string | undefined | null
): { email: string; impersonatedBy?: string; jti?: string } | null {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [payloadB64, sig] = parts;
    const expected = sign(payloadB64);
    if (!verifyTimingSafe(sig, expected)) return null;
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
    if (payload.kind !== "agent") return null;
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    if (typeof payload.email !== "string") return null;
    return {
      email: payload.email,
      ...(typeof payload.imp === "string" && payload.imp ? { impersonatedBy: payload.imp } : {}),
      ...(typeof payload.jti === "string" && payload.jti ? { jti: payload.jti } : {}),
    };
  } catch {
    return null;
  }
}

/**
 * Resolve the current agent session to a verified, CLAIMED agent.
 * Returns { agentId, email } or null. The agent must still be claimed under
 * this email (so a deleted/unclaimed profile cannot keep a live session).
 */
export async function getAgentSession(): Promise<{ agentId: number; email: string; impersonatedBy?: string } | null> {
  try {
    const store = await cookies();
    const session = verifyAgentToken(store.get(AGENT_COOKIE)?.value);
    if (!session) return null;
    // A revoked admin must not keep a live impersonation session: re-check the
    // allowlist on every use, not just at mint time.
    if (session.impersonatedBy && !isAdminEmail(session.impersonatedBy)) return null;
    const { data } = await supabaseAdmin()
      .from("sg_agents")
      .select("id")
      .eq("claimed", true)
      .eq("claimed_email", session.email)
      .maybeSingle();
    if (!data) return null;
    return {
      agentId: Number(data.id),
      email: session.email,
      ...(session.impersonatedBy ? { impersonatedBy: session.impersonatedBy } : {}),
    };
  } catch {
    return null;
  }
}
