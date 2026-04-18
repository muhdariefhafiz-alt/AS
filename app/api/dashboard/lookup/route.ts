import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Lookup a claimed agent by email.
 * Returns agent profile data if email matches a claimed agent.
 */
export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const normalized = email.toLowerCase().trim();

    const { data: agent } = await supabase
      .from("sg_agents")
      .select("id, name, slug, bio, photo_url, whatsapp, message, score, agency_name, claimed, claimed_email, subscription_tier, claimed_at")
      .eq("claimed", true)
      .eq("claimed_email", normalized)
      .single();

    if (!agent) {
      return NextResponse.json({ error: "No claimed profile found" }, { status: 404 });
    }

    // Count profile views in the last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [viewsResult, clicksResult] = await Promise.all([
      supabase
        .from("sg_funnel_events")
        .select("id", { count: "exact", head: true })
        .eq("event", "profile_view")
        .eq("agent_id", agent.id)
        .gte("created_at", sevenDaysAgo),
      supabase
        .from("sg_funnel_events")
        .select("id", { count: "exact", head: true })
        .eq("event", "whatsapp_click")
        .eq("agent_id", agent.id)
        .gte("created_at", sevenDaysAgo),
    ]);

    // Fire-and-forget dashboard_login funnel event
    supabase
      .from("sg_funnel_events")
      .insert({
        event: "dashboard_login",
        agent_id: agent.id,
        agent_slug: agent.slug,
        metadata: { tier: agent.subscription_tier || "free" },
      })
      .then(() => {});

    return NextResponse.json({
      agent: {
        id: agent.id,
        name: agent.name,
        slug: agent.slug,
        bio: agent.bio,
        photo_url: agent.photo_url,
        whatsapp: agent.whatsapp,
        message: agent.message || null,
        score: agent.score,
        agency_name: agent.agency_name,
        subscription_tier: agent.subscription_tier || "free",
        claimed_at: agent.claimed_at || null,
        views_this_week: viewsResult.count ?? 0,
        whatsapp_clicks_this_week: clicksResult.count ?? 0,
      },
    });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
