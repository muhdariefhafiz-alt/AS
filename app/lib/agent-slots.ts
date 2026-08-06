// Viewing-slot grounding for AI-drafted replies (the "agenda" tier of the drafter).
//
// When an agent has connected Google Calendar (sg_agent_calendar row, created by the
// approved calendar.events OAuth flow), we read their free/busy for the next 7 days
// and offer the draft up to three REAL open viewing windows. Fail-closed everywhere:
// no row, no GOOGLE_* env, expired-and-unrefreshable token, or any API error simply
// returns [] and the draft falls back to tentative suggestions the agent edits.
//
// NOTE: the Google path is inert until (a) GOOGLE_CLIENT_ID/SECRET exist in env and
// (b) at least one agent connects a calendar. It has NOT been exercised end-to-end
// yet (0 connected calendars at build time); verify with the first real connection.

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
  const id = process.env.GOOGLE_CLIENT_ID;
  const secret = process.env.GOOGLE_CLIENT_SECRET;
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
    const { data: cal } = await sb
      .from("sg_agent_calendar")
      .select("access_token, refresh_token, token_expiry")
      .eq("agent_id", agentId)
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
    const res = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({
        timeMin: now.toISOString(),
        timeMax: timeMax.toISOString(),
        items: [{ id: "primary" }],
      }),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      calendars?: { primary?: { busy?: { start: string; end: string }[] } };
    };
    const busy: BusyInterval[] = (data.calendars?.primary?.busy ?? []).map((b) => ({
      start: new Date(b.start).getTime(),
      end: new Date(b.end).getTime(),
    }));

    return windows
      .filter((w) => !overlaps(w, busy))
      .slice(0, limit)
      .map((w) => labelFor(w.start));
  } catch {
    return []; // grounding is optional; never fail the draft over it
  }
}
