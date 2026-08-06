// Viewing-slot grounding for AI-drafted replies (the "agenda" tier of the drafter).
//
// When an agent has connected Google Calendar (sg_agent_calendar row, created by the
// approved calendar.events OAuth flow), we read their next 7 days and offer the draft
// up to three REAL open viewing windows. Fail-closed everywhere: no row, wrong
// provider, no env, expired-and-unrefreshable token, or any API error simply returns
// [] and the draft falls back to tentative suggestions the agent edits. The agent is
// never shown availability we did not verify.
//
// WHY events.list AND NOT freeBusy. The obvious call here is calendar/v3/freeBusy,
// and it is wrong for us: Google requires one of calendar, calendar.readonly,
// calendar.freebusy or calendar.events.freebusy for that endpoint, and our OAuth
// flow requests calendar.events only (google-calendar.ts SCOPES). freeBusy would
// therefore 403 insufficientPermissions for every agent, forever, and the failure is
// invisible because we fail closed. Widening the scope is not a code change: it
// alters the consent screen and would put the approved Google verification back
// through review. events.list IS covered by calendar.events, so we derive busy
// intervals from the events themselves and stay inside the grant we already hold.
//
// NOTE: inert until (a) GOOGLE_CALENDAR_CLIENT_ID/_SECRET exist in env and (b) at
// least one agent connects a calendar. NOT exercised end-to-end yet (0 connected
// calendars at build time); verify with the first real connection.

import type { SupabaseClient } from "@supabase/supabase-js";

const SGT_OFFSET_MS = 8 * 3600 * 1000; // Singapore is fixed UTC+8, no DST

type BusyInterval = { start: number; end: number };

// Viewing-friendly candidate windows, expressed in SGT wall-clock:
// weekends 10:00-12:00 / 14:00-16:00 / 16:00-18:00, weekdays 18:30-20:00.
function candidateWindows(now: Date): { start: Date; end: Date }[] {
  const out: { start: Date; end: Date }[] = [];
  const sgtNow = new Date(now.getTime() + SGT_OFFSET_MS);
  for (let d = 1; d <= 7; d++) {
    const day = new Date(Date.UTC(sgtNow.getUTCFullYear(), sgtNow.getUTCMonth(), sgtNow.getUTCDate() + d));
    const dow = day.getUTCDay();
    const mk = (h: number, m: number, durMin: number) => {
      const startUtc = new Date(day.getTime() + (h * 60 + m) * 60000 - SGT_OFFSET_MS);
      return { start: startUtc, end: new Date(startUtc.getTime() + durMin * 60000) };
    };
    if (dow === 0 || dow === 6) {
      out.push(mk(10, 0, 120), mk(14, 0, 120), mk(16, 0, 120));
    } else {
      out.push(mk(18, 30, 90));
    }
  }
  return out;
}

type GCalEvent = {
  status?: string;
  transparency?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  attendees?: { self?: boolean; responseStatus?: string }[];
};

// freeBusy would have computed this for us. Doing it by hand means being
// explicit about what counts as busy, which is no bad thing:
//   cancelled           not busy
//   transparency free   not busy. Google's all-day events default to Free, so
//                       a colleague's birthday does not swallow a Saturday.
//   agent declined it   not busy
//   all-day and opaque  busy for that whole SGT day (they are away)
// Anything unparseable is skipped rather than guessed at: a missed busy block
// costs one awkward reply, an invented one costs a viewing.
function busyIntervals(items: GCalEvent[]): BusyInterval[] {
  const out: BusyInterval[] = [];
  for (const ev of items) {
    if (ev.status === "cancelled") continue;
    if (ev.transparency === "transparent") continue;
    if (ev.attendees?.some((a) => a.self && a.responseStatus === "declined")) continue;

    const s = ev.start?.dateTime;
    const e = ev.end?.dateTime;
    if (s && e) {
      const start = Date.parse(s);
      const end = Date.parse(e);
      if (Number.isFinite(start) && Number.isFinite(end) && end > start) out.push({ start, end });
      continue;
    }
    // All-day events are date-only, start inclusive, end EXCLUSIVE.
    const sd = ev.start?.date;
    const ed = ev.end?.date;
    if (sd && ed) {
      const start = Date.parse(`${sd}T00:00:00+08:00`);
      const end = Date.parse(`${ed}T00:00:00+08:00`);
      if (Number.isFinite(start) && Number.isFinite(end) && end > start) out.push({ start, end });
    }
  }
  return out;
}

function overlaps(w: { start: Date; end: Date }, busy: BusyInterval[]): boolean {
  const s = w.start.getTime();
  const e = w.end.getTime();
  return busy.some((b) => b.start < e && b.end > s);
}

// "Saturday 2:00pm" in SGT.
function labelFor(d: Date): string {
  return new Intl.DateTimeFormat("en-SG", {
    weekday: "long",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Singapore",
  }).format(d).replace(":00 ", "").replace(" am", "am").replace(" pm", "pm");
}

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  // GOOGLE_CALENDAR_* , not GOOGLE_* . The calendar tokens are issued to the
  // calendar OAuth client (google-calendar.ts); GOOGLE_CLIENT_ID/_SECRET belong
  // to the separate sign-in client. Refreshing with the wrong client is an
  // invalid_client 401, so this refresh silently never worked.
  const id = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const secret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  if (!id || !secret) return null;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: id,
      client_secret: secret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { access_token?: string };
  return data.access_token ?? null;
}

// Up to `limit` open viewing windows from the agent's REAL calendar. [] = no
// calendar grounding available (caller falls back to tentative-suggestion mode).
export async function getAgentOpenSlots(sb: SupabaseClient, agentId: number, limit = 3): Promise<string[]> {
  try {
    // provider is load-bearing. sg_agent_calendar is one row per agent and BOTH
    // providers upsert into it (microsoft-calendar.ts, onConflict agent_id), so
    // without this filter an Outlook agent's Microsoft token would be handed to
    // Google. Both sibling modules guard exactly this way.
    const { data: cal } = await sb
      .from("sg_agent_calendar")
      .select("provider, access_token, refresh_token, token_expiry")
      .eq("agent_id", agentId)
      .eq("provider", "google")
      .maybeSingle();
    if (!cal?.access_token) return [];

    let token: string | null = String(cal.access_token);
    const expiry = cal.token_expiry ? new Date(String(cal.token_expiry)).getTime() : 0;
    if (expiry < Date.now() + 60_000) {
      token = cal.refresh_token ? await refreshAccessToken(String(cal.refresh_token)) : null;
    }
    if (!token) return [];

    const now = new Date();
    const windows = candidateWindows(now);
    const timeMax = new Date(now.getTime() + 8 * 86400_000);
    const qs = new URLSearchParams({
      timeMin: now.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: "true", // expand recurring events into real instances
      orderBy: "startTime",
      maxResults: "250", // a week of one agent's calendar, comfortably
    });
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${qs.toString()}`,
      { headers: { authorization: `Bearer ${token}` } },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { items?: GCalEvent[] };
    const busy = busyIntervals(data.items ?? []);

    return windows
      .filter((w) => !overlaps(w, busy))
      .slice(0, limit)
      .map((w) => labelFor(w.start));
  } catch {
    return []; // grounding is optional; never fail the draft over it
  }
}
