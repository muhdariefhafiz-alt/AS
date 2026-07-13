import { supabaseAdmin } from "./supabase";
import { signCalendarState } from "./google-calendar";

// Microsoft (Outlook / M365) calendar OAuth + event write for the agent
// Planner. Mirrors google-calendar.ts: inert until MICROSOFT_CALENDAR_CLIENT_ID
// / _SECRET are set. Multitenant + personal accounts (/common). Delegated
// scopes: Calendars.ReadWrite (Graph has no write-only calendar scope) +
// User.Read for the account email. Tokens share the same service-role-only
// sg_agent_calendar row (one calendar connection per agent; provider column
// says which).

const MS_AUTH = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize";
const MS_TOKEN = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
const GRAPH = "https://graph.microsoft.com/v1.0";
const SCOPES = ["openid", "email", "offline_access", "User.Read", "Calendars.ReadWrite"];

function clientId() { return process.env.MICROSOFT_CALENDAR_CLIENT_ID; }
function clientSecret() { return process.env.MICROSOFT_CALENDAR_CLIENT_SECRET; }
function site() { return process.env.NEXT_PUBLIC_SITE_URL ?? "https://fair-comparisons.com"; }
export function microsoftRedirectUri() { return `${site()}/api/agent/calendar/microsoft/callback`; }
export function isMicrosoftCalendarConfigured() { return !!(clientId() && clientSecret()); }

export function microsoftAuthUrl(agentId: number): string {
  const params = new URLSearchParams({
    client_id: clientId()!,
    redirect_uri: microsoftRedirectUri(),
    response_type: "code",
    response_mode: "query",
    scope: SCOPES.join(" "),
    prompt: "select_account",
    state: signCalendarState(agentId),
  });
  return `${MS_AUTH}?${params.toString()}`;
}

type TokenResp = { access_token: string; refresh_token?: string; expires_in: number };

export async function msExchangeCodeForTokens(code: string): Promise<TokenResp | null> {
  const res = await fetch(MS_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code, client_id: clientId()!, client_secret: clientSecret()!,
      redirect_uri: microsoftRedirectUri(), grant_type: "authorization_code",
      scope: SCOPES.join(" "),
    }),
  });
  if (!res.ok) { console.error("[mscal] token exchange failed", res.status, await res.text()); return null; }
  return res.json();
}

export async function msGetAccountEmail(accessToken: string): Promise<string | null> {
  const res = await fetch(`${GRAPH}/me`, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) return null;
  const j = await res.json();
  return j.mail ?? j.userPrincipalName ?? null;
}

export async function msStoreCalendarTokens(agentId: number, tokens: TokenResp, email: string | null) {
  const row: Record<string, unknown> = {
    agent_id: agentId, provider: "microsoft",
    account_email: email,
    google_email: null, // switching provider: clear the stale Google label
    access_token: tokens.access_token,
    token_expiry: new Date(Date.now() + (tokens.expires_in - 60) * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (tokens.refresh_token) row.refresh_token = tokens.refresh_token;
  await supabaseAdmin().from("sg_agent_calendar").upsert(row, { onConflict: "agent_id" });
}

async function msGetValidAccessToken(agentId: number): Promise<string | null> {
  const { data: conn } = await supabaseAdmin()
    .from("sg_agent_calendar")
    .select("provider, account_email, access_token, refresh_token, token_expiry")
    .eq("agent_id", agentId)
    .maybeSingle();
  if (!conn || conn.provider !== "microsoft") return null;
  if (conn.access_token && conn.token_expiry && new Date(String(conn.token_expiry)).getTime() > Date.now()) {
    return String(conn.access_token);
  }
  if (!conn.refresh_token) return null;
  const res = await fetch(MS_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId()!, client_secret: clientSecret()!,
      refresh_token: String(conn.refresh_token), grant_type: "refresh_token",
      scope: SCOPES.join(" "),
    }),
  });
  if (!res.ok) { console.error("[mscal] refresh failed", res.status); return null; }
  const j = await res.json();
  // Microsoft rotates refresh tokens: store the new one when present.
  await msStoreCalendarTokens(agentId, { access_token: j.access_token, refresh_token: j.refresh_token, expires_in: j.expires_in }, (conn.account_email as string | null) ?? null);
  return j.access_token;
}

// Graph wants a local wall-clock time + a Windows time zone name.
function toSgtLocal(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 8 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 19);
}

// Best-effort: returns false, never throws (a calendar hiccup must not block
// the viewing confirm).
export async function msInsertViewingEvent(agentId: number, ev: { title: string; description: string; startIso: string; endIso: string; location?: string }): Promise<boolean> {
  try {
    if (!isMicrosoftCalendarConfigured()) return false;
    const token = await msGetValidAccessToken(agentId);
    if (!token) return false;
    const res = await fetch(`${GRAPH}/me/events`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        subject: ev.title,
        body: { contentType: "text", content: ev.description },
        location: ev.location ? { displayName: ev.location } : undefined,
        start: { dateTime: toSgtLocal(ev.startIso), timeZone: "Singapore Standard Time" },
        end: { dateTime: toSgtLocal(ev.endIso), timeZone: "Singapore Standard Time" },
      }),
    });
    if (!res.ok) { console.error("[mscal] event insert failed", res.status, await res.text()); return false; }
    return true;
  } catch (e) {
    console.error("[mscal] event insert threw", e);
    return false;
  }
}
