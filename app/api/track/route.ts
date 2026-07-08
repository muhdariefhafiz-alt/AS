import { supabaseAdmin } from "../../lib/supabase";
import { isBotUA, isInternalPath } from "../../lib/isBot";
import { checkRateLimit, clientIp } from "../../lib/rateLimit";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { path, referrer, event, session_id, utm_source, utm_medium, utm_campaign } = await req.json();
    // Anonymous per-tab session id from PageTracker (see there). Sanitized to a
    // UUID-shaped string so this open endpoint cannot stuff junk into the column.
    const sessionId =
      typeof session_id === "string" && /^[0-9a-f-]{16,64}$/i.test(session_id) ? session_id : null;
    // Service-role write: the anon client silently fails RLS-protected inserts,
    // which is why first-party page_views stopped collecting. supabaseAdmin fixes it.
    const supabase = supabaseAdmin();

    // page_views is shared with the NL (MakelaarsScan) app in this DB. Stamp the
    // request host so FairComparisons traffic can be cleanly separated from NL.
    const host = (req.headers.get("x-forwarded-host") || req.headers.get("host") || "")
      .split(",")[0]
      .trim()
      .toLowerCase() || null;

    const ua = req.headers.get("user-agent") || "";
    // Server-side bot/headless/AI-crawler filter (single source of truth in
    // lib/isBot). The client filter can be bypassed and real-time AI fetchers
    // (ChatGPT-User, Perplexity-User, anthropic-ai...) never run client JS, so
    // this server gate is the one that actually keeps them out of page_views.
    const isBot = isBotUA(ua);
    // Empty UA = not a real browser. Email-link scanners / prefetchers (Gmail,
    // corporate mail gateways, antivirus link-checkers) fetch magic-link URLs
    // like /claim/verify with no User-Agent; those are not human page views.
    const hasUa = ua.trim().length > 0;
    if (path && hasUa && !isBot && !isInternalPath(path)) {
      // Generous per-IP flood cap: stops anyone hammering this open endpoint to
      // inflate an agent's view counts / bloat the table, without dropping real
      // multi-page browsing sessions.
      const { limited } = await checkRateLimit(
        `track:${clientIp(req)}`,
        300,
        10 * 60 * 1000
      );
      if (!limited) {
        await supabase.from("page_views").insert({
          path,
          referrer: referrer || null,
          host,
          user_agent: ua || null,
          event: event || null,
          session_id: sessionId,
          utm_source: utm_source || null,
          utm_medium: utm_medium || null,
          utm_campaign: utm_campaign || null,
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
