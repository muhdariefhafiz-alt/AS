import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { checkRateLimit, clientIp } from "../../../lib/rateLimit";

// Lightweight client-side funnel beacon. Only whitelisted top-of-funnel
// events that have no server-side firing point (the /sell form is rendered
// before any lead exists, so "view_form" can only come from the client).
// Rate-limited and whitelisted so it can't be used to pollute sg_lead_events.

const ALLOWED = new Set(["view_form"]);

export async function POST(req: Request) {
  try {
    const ip = clientIp(req);
    const { limited } = await checkRateLimit(`selltrack:${ip}`, 20, 60 * 60 * 1000);
    if (limited) return NextResponse.json({ ok: true }); // silently drop

    const { event, source } = await req.json();
    if (!ALLOWED.has(event)) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const sb = supabaseAdmin();
    await sb.from("sg_lead_events").insert({
      lead_id: null,
      event_type: event,
      meta: { source: typeof source === "string" ? source.slice(0, 60) : null },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
