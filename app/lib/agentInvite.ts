import { resolveSecret, sign, verifyTimingSafe, b64url } from "./hmac";

// Per-agent magic invite tokens.
//
// The old invite CTA (/dashboard?token=<lead token>) ignored the token and
// walled every unclaimed agent behind a sign-in form, so no invited agent
// could ever quote. This token binds (lead, agent) into a signed, expiring
// link: the brief page verifies it server-side, and acting on it doubles as
// email-ownership proof (the token only ever travels to that agent's
// address), which is what lets quote submission claim the profile in one
// step with no password.
//
// Format: b64url("<leadId>.<agentId>.<expMs>") + "." + hmac. Shared lead
// tokens prove nothing about WHO clicked; this token names the agent.

const TTL_DAYS_DEFAULT = 14;

function secret(): string {
  return resolveSecret("INVITE_SECRET", "ADMIN_SECRET");
}

export function mintInviteToken(
  leadId: number,
  agentId: number,
  ttlDays = TTL_DAYS_DEFAULT
): string {
  const exp = Date.now() + ttlDays * 24 * 60 * 60 * 1000;
  const payload = `${leadId}.${agentId}.${exp}`;
  return `${b64url(payload)}.${sign(`invite:${payload}`, secret())}`;
}

export function verifyInviteToken(
  token: string | null | undefined
): { leadId: number; agentId: number } | null {
  if (!token || token.length > 200) return null;
  const dot = token.indexOf(".");
  if (dot < 1) return null;
  let payload: string;
  try {
    payload = Buffer.from(token.slice(0, dot), "base64url").toString("utf8");
  } catch {
    return null;
  }
  const sig = token.slice(dot + 1);
  if (!verifyTimingSafe(sig, sign(`invite:${payload}`, secret()))) return null;
  const [leadRaw, agentRaw, expRaw] = payload.split(".");
  const leadId = Number(leadRaw);
  const agentId = Number(agentRaw);
  const exp = Number(expRaw);
  if (!Number.isFinite(leadId) || !Number.isFinite(agentId) || !Number.isFinite(exp)) {
    return null;
  }
  if (Date.now() > exp) return null;
  return { leadId, agentId };
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fair-comparisons.com";

export function agentInviteUrl(
  leadId: number,
  agentId: number,
  medium: string
): string {
  return `${SITE_URL}/invite/${mintInviteToken(leadId, agentId)}?utm_source=notify&utm_medium=${medium}`;
}
