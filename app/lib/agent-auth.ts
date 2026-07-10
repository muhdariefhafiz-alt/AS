import { b64url, resolveSecret, sign as hmacSign, verifyTimingSafe } from "./hmac";
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

export function issueAgentMagicLink(email: string): string {
  return issueToken(email, MAGIC_LINK_TTL_MS);
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
): { email: string; impersonatedBy?: string } | null {
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
