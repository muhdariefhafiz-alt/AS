import crypto from "crypto";
import { supabaseAdmin } from "./supabase";

// Google Calendar OAuth + event write for the agent Planner. Inert until
// GOOGLE_CALENDAR_CLIENT_ID / _SECRET are set (like WhatsApp/Anthropic). Scope
// is calendar.events only (write viewings to the agent's own calendar) plus
// userinfo.email (to show which account connected). Tokens live in the
// service-role-only sg_agent_calendar table.

const GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO = "https://www.googleapis.com/oauth2/v3/userinfo";
const CAL_API = "https://www.googleapis.com/calendar/v3";
const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
];

function clientId() { return process.env.GOOGLE_CALENDAR_CLIENT_ID; }
function clientSecret() { return process.env.GOOGLE_CALENDAR_CLIENT_SECRET; }
function site() { return process.env.NEXT_PUBLIC_SITE_URL ?? "https://fair-comparisons.com"; }
export function calendarRedirectUri() { return `${site()}/api/agent/calendar/google/callback`; }
export function isGoogleCalendarConfigured() { return !!(clientId() && clientSecret()); }

// --- signed OAuth state (CSRF + binds the flow to the agent) ---
function stateSecret() { return process.env.AGENT_SESSION_SECRET || process.env.ADMIN_SECRET || ""; }
export function signCalendarState(agentId: number): string {
  const payload = Buffer.from(JSON.stringify({ a: agentId, n: crypto.randomBytes(8).toString("hex"), exp: Date.now() + 10 * 60 * 1000 })).toString("base64url");
  const sig = crypto.createHmac("sha256", stateSecret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}
export function verifyCalendarState(state: string | null): number | null {
  if (!state) return null;
  try {
    const [payload, sig] = state.split(".");
    if (!payload || !sig) return null;
    const expect = crypto.createHmac("sha256", stateSecret()).update(payload).digest("base64url");
    const a = Buffer.from(sig); const b = Buffer.from(expect);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const d = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (!d.exp || Date.now() > d.exp) return null;
    return Number(d.a) || null;
  } catch { return null; }
}

export function googleAuthUrl(agentId: number): string {
  const params = new URLSearchParams({
    client_id: clientId()!,
    redirect_uri: calendarRedirectUri(),
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent", // force a refresh_token on every connect
    include_granted_scopes: "true",
    state: signCalendarState(agentId),
  });
  return `${GOOGLE_AUTH}?${params.toString()}`;
}

type TokenResp = { access_token: string; refresh_token?: string; expires_in: number };

export async function exchangeCodeForTokens(code: string): Promise<TokenResp | null> {
  const res = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code, client_id: clientId()!, client_secret: clientSecret()!,
      redirect_uri: calendarRedirectUri(), grant_type: "authorization_code",
    }),
  });
  if (!res.ok) { console.error("[gcal] token exchange failed", res.status, await res.text()); return null; }
  return res.json();
}

export async function getGoogleEmail(accessToken: string): Promise<string | null> {
  const res = await fetch(GOOGLE_USERINFO, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) return null;
  return (await res.json()).email ?? null;
}

export async function storeCalendarTokens(agentId: number, tokens: { access_token: string; refresh_token?: string; expires_in: number }, email: string | null) {
  const row: Record<string, unknown> = {
    agent_id: agentId, provider: "google", google_email: email,
    access_token: tokens.access_token,
    token_expiry: new Date(Date.now() + (tokens.expires_in - 60) * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  };
  // Keep the existing refresh_token if Google didn't return a fresh one.
  if (tokens.refresh_token) row.refresh_token = tokens.refresh_token;
  await supabaseAdmin().from("sg_agent_calendar").upsert(row, { onConflict: "agent_id" });
}

export async function getCalendarConnection(agentId: number) {
  const { data } = await supabaseAdmin()
    .from("sg_agent_calendar")
    .select("google_email, access_token, refresh_token, token_expiry")
    .eq("agent_id", agentId)
    .maybeSingle();
  return data;
}

async function getValidAccessToken(agentId: number): Promise<string | null> {
  const conn = await getCalendarConnection(agentId);
  if (!conn) return null;
  if (conn.access_token && conn.token_expiry && new Date(String(conn.token_expiry)).getTime() > Date.now()) {
    return String(conn.access_token);
  }
  if (!conn.refresh_token) return null;
  const res = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId()!, client_secret: clientSecret()!,
      refresh_token: String(conn.refresh_token), grant_type: "refresh_token",
    }),
  });
  if (!res.ok) { console.error("[gcal] refresh failed", res.status); return null; }
  const j = await res.json();
  await storeCalendarTokens(agentId, { access_token: j.access_token, expires_in: j.expires_in }, (conn.google_email as string | null) ?? null);
  return j.access_token;
}

// Drop a confirmed viewing into the agent's primary calendar. Best-effort:
// returns false (never throws) so a calendar hiccup never blocks the confirm.
export async function insertViewingEvent(agentId: number, ev: { title: string; description: string; startIso: string; endIso: string; location?: string }): Promise<boolean> {
  try {
    if (!isGoogleCalendarConfigured()) return false;
    const token = await getValidAccessToken(agentId);
    if (!token) return false;
    const res = await fetch(`${CAL_API}/calendars/primary/events`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        summary: ev.title,
        description: ev.description,
        location: ev.location || undefined,
        start: { dateTime: ev.startIso, timeZone: "Asia/Singapore" },
        end: { dateTime: ev.endIso, timeZone: "Asia/Singapore" },
        reminders: { useDefault: true },
      }),
    });
    if (!res.ok) { console.error("[gcal] event insert failed", res.status, await res.text()); return false; }
    return true;
  } catch (e) {
    console.error("[gcal] event insert threw", e);
    return false;
  }
}
