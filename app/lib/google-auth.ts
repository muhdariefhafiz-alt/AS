import { b64url, resolveSecret, sign as hmacSign, verifyTimingSafe } from "./hmac";

/**
 * Sign in with Google for the AGENT dashboard.
 *
 * Identity-only scopes (openid email profile) on the same OAuth client as
 * calendar sync, so the user sees the verified FairComparisons consent screen.
 * The Google-verified email is matched against sg_agents.claimed_email and,
 * on match, the callback mints the exact same HMAC session cookie as the
 * magic-link flow (lib/agent-auth). Google here is an email verifier, not a
 * separate account system: no new identity tables, nothing else changes.
 *
 * Owner setup (one-time, Google Cloud Console, same OAuth client as calendar):
 * add the authorized redirect URI
 *   https://fair-comparisons.com/api/agent/auth/google/callback
 * (and http://localhost:3001/api/agent/auth/google/callback for local dev).
 */

const LOGIN_STATE_TTL_MS = 10 * 60 * 1000;

export function isGoogleLoginConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function getSecret(): string {
  return resolveSecret("AGENT_SESSION_SECRET", "ADMIN_SECRET");
}

export function signLoginState(): string {
  const payload = JSON.stringify({ kind: "glogin", exp: Date.now() + LOGIN_STATE_TTL_MS });
  const payloadB64 = b64url(payload);
  return `${payloadB64}.${hmacSign(payloadB64, getSecret())}`;
}

export function verifyLoginState(state: string | null): boolean {
  if (!state) return false;
  try {
    const [payloadB64, sig] = state.split(".");
    if (!payloadB64 || !sig) return false;
    if (!verifyTimingSafe(sig, hmacSign(payloadB64, getSecret()))) return false;
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
    return payload.kind === "glogin" && typeof payload.exp === "number" && payload.exp > Date.now();
  } catch {
    return false;
  }
}

export function loginRedirectUri(): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fair-comparisons.com";
  return `${site}/api/agent/auth/google/callback`;
}

export function buildLoginAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: loginRedirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state: signLoginState(),
    // Always let the agent pick the account: many use one device for a
    // personal and a work Google account.
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchange the code and return the Google-VERIFIED email. The id_token comes
 * straight from Google's token endpoint over TLS in a confidential-client
 * exchange, so decoding its payload without a second signature check is the
 * standard, safe pattern. Unverified emails are rejected.
 */
export async function exchangeCodeForEmail(code: string): Promise<string | null> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: loginRedirectUri(),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    console.error("[google-auth] token exchange failed", res.status, await res.text().catch(() => ""));
    return null;
  }
  const tokens = (await res.json()) as { id_token?: string };
  if (!tokens.id_token) return null;
  try {
    const claims = JSON.parse(Buffer.from(tokens.id_token.split(".")[1], "base64url").toString()) as {
      email?: string;
      email_verified?: boolean;
    };
    if (!claims.email || claims.email_verified !== true) return null;
    return claims.email.toLowerCase().trim();
  } catch {
    return null;
  }
}
