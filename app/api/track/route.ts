import { supabase } from "../../lib/supabase";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { path, referrer, event, utm_source, utm_medium, utm_campaign } = await req.json();

    if (path) {
      await supabase.from("page_views").insert({
        path,
        referrer: referrer || null,
        user_agent: req.headers.get("user-agent") || null,
        event: event || null,
        utm_source: utm_source || null,
        utm_medium: utm_medium || null,
        utm_campaign: utm_campaign || null,
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
