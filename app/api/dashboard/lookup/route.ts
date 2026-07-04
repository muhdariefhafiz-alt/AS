import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAgentSession } from "../../../lib/agent-auth";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Lookup a claimed agent by email.
 * Returns agent profile data if email matches a claimed agent.
 */
export async function POST() {
  try {
    // Session-gated: the agent must hold a valid signed session cookie minted
    // from a verified magic link. We never trust an email from the request body.
    const session = await getAgentSession();
    if (!session) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const { data: agent } = await supabase
      .from("sg_agents")
      .select("id, name, slug, bio, photo_url, whatsapp, message, marketing_name, score, agency_name, claimed, claimed_email, cea_registration, subscription_tier, claimed_at, primary_area")
      .eq("id", session.agentId)
      .single();

    if (!agent) {
      return NextResponse.json({ error: "No claimed profile found" }, { status: 404 });
    }

    // Count profile views in the last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    // First of the current month (UTC): movement compares live rank against the
    // most recent snapshot from a PRIOR month, so it is always real month-over-month.
    const now = new Date();
    const firstOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
      .toISOString()
      .slice(0, 10);

    const [viewsResult, clicksResult, standingResult, priorSnapResult] = await Promise.all([
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
      // "Your standing": rank among scored agents active in the agent's primary
      // area, by AgentScore. Returns [] when the agent is unranked.
      agent.cea_registration
        ? supabase.rpc("get_agent_standing", { p_reg: agent.cea_registration })
        : Promise.resolve({ data: null }),
      // Most recent snapshot from a prior month, for honest month-over-month movement.
      agent.cea_registration
        ? supabase
            .from("sg_agent_standing_snapshots")
            .select("snapshot_month, agent_rank, agent_pct, area_name, area_type")
            .eq("cea_registration", agent.cea_registration)
            .lt("snapshot_month", firstOfMonth)
            .order("snapshot_month", { ascending: false })
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const standingRow = Array.isArray(standingResult?.data) ? standingResult.data[0] ?? null : null;
    // Movement is only meaningful when the prior snapshot is in the SAME area
    // (a changed primary area makes rank deltas apples-to-oranges).
    const prior = priorSnapResult?.data ?? null;
    let movement: { delta: number; prev_month: string; prev_pct: number | null } | null = null;
    if (
      standingRow &&
      prior &&
      prior.area_name === standingRow.area_name &&
      prior.area_type === standingRow.area_type &&
      typeof prior.agent_rank === "number" &&
      typeof standingRow.agent_rank === "number"
    ) {
      movement = {
        delta: prior.agent_rank - standingRow.agent_rank, // positive = moved up
        prev_month: prior.snapshot_month,
        prev_pct: prior.agent_pct ?? null,
      };
    }
    const standing = standingRow ? { ...standingRow, movement } : null;

    // Fire-and-forget funnel events. standing_view instruments activation
    // (reached standing in a session) and habit (>=3 opens in 14 days).
    supabase
      .from("sg_funnel_events")
      .insert([
        {
          event: "dashboard_login",
          agent_id: agent.id,
          agent_slug: agent.slug,
          metadata: { tier: agent.subscription_tier || "free" },
        },
        {
          event: "standing_view",
          agent_id: agent.id,
          agent_slug: agent.slug,
          metadata: { ranked: !!standing, area: standing?.area_name ?? agent.primary_area ?? null, pct: standing?.agent_pct ?? null },
        },
      ])
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
        marketing_name: agent.marketing_name || null,
        score: agent.score,
        agency_name: agent.agency_name,
        cea_registration: agent.cea_registration,
        subscription_tier: agent.subscription_tier || "free",
        claimed_at: agent.claimed_at || null,
        email: agent.claimed_email || null,
        primary_area: agent.primary_area || null,
        views_this_week: viewsResult.count ?? 0,
        whatsapp_clicks_this_week: clicksResult.count ?? 0,
      },
      standing,
    });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
