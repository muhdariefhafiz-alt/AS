import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { getAgentSession } from "../../../lib/agent-auth";
import { tierAtLeast } from "../../../lib/tiers";

// Monthly performance report vs the agent's district or town (Professional+).
// Composes ONLY data the platform already computes and shows honestly:
//  - standing: AgentScore rank + percentile in the primary area, with real
//    month-over-month movement (prior-month snapshot, same-area only)
//  - demand: this agent's funnel counts, last 30 days vs the prior 30
//  - market: sg_area_intel competition + (districts) pricing, 12mo windows
//  - benchmark (Elite only): the agent's 12mo sales rank inside the area's
//    active field, top-5 concentration, and deals-per-active-agent context
// The paid gate is the COMPOSED report; every underlying number keeps its
// existing honesty rails (windows shown, sales vs rentals split upstream).

export async function GET() {
  const session = await getAgentSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const sb = supabaseAdmin();
  const { data: agent } = await sb
    .from("sg_agents")
    .select("id, cea_registration, subscription_tier, primary_area")
    .eq("id", session.agentId)
    .single();
  if (!agent) return NextResponse.json({ error: "No profile" }, { status: 404 });

  const tier = agent.subscription_tier || "free";
  if (!tierAtLeast(tier, "professional")) {
    return NextResponse.json(
      { upgrade: true, needed: "professional", error: "The performance report is a Professional tool." },
      { status: 403 }
    );
  }
  if (!agent.cea_registration) {
    return NextResponse.json({ error: "No CEA registration on this profile." }, { status: 400 });
  }

  const now = new Date();
  const d30 = new Date(now.getTime() - 30 * 86_400_000).toISOString();
  const d60 = new Date(now.getTime() - 60 * 86_400_000).toISOString();
  const firstOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);

  const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;
  const ev = (event: string, from: string, to?: string) => {
    let q = sb
      .from("sg_funnel_events")
      .select("id", { count: "exact", head: true })
      .eq("event", event)
      .eq("agent_id", agent.id)
      .gte("created_at", from);
    if (to) q = q.lt("created_at", to);
    return count(q);
  };

  const [standingRes, priorSnapRes, views30, viewsPrior30, clicks30, clicksPrior30, shortlists30, shortlistsPrior30] =
    await Promise.all([
      sb.rpc("get_agent_standing", { p_reg: agent.cea_registration }),
      sb
        .from("sg_agent_standing_snapshots")
        .select("snapshot_month, agent_rank, agent_pct, area_name, area_type")
        .eq("cea_registration", agent.cea_registration)
        .lt("snapshot_month", firstOfMonth)
        .order("snapshot_month", { ascending: false })
        .limit(1)
        .maybeSingle(),
      ev("profile_view", d30),
      ev("profile_view", d60, d30),
      ev("whatsapp_click", d30),
      ev("whatsapp_click", d60, d30),
      count(sb.from("sg_lead_shortlist").select("id", { count: "exact", head: true }).eq("agent_id", agent.id).gte("created_at", d30)),
      count(sb.from("sg_lead_shortlist").select("id", { count: "exact", head: true }).eq("agent_id", agent.id).gte("created_at", d60).lt("created_at", d30)),
    ]);

  const standing = Array.isArray(standingRes?.data) ? standingRes.data[0] ?? null : null;
  const prior = priorSnapRes?.data ?? null;
  const movement =
    standing &&
    prior &&
    prior.area_name === standing.area_name &&
    prior.area_type === standing.area_type &&
    typeof prior.agent_rank === "number" &&
    typeof standing.agent_rank === "number"
      ? { delta: prior.agent_rank - standing.agent_rank, prev_month: prior.snapshot_month }
      : null;

  // Market block for the standing's area (fail-soft: report renders without it).
  let market: unknown = null;
  if (standing?.area_name && (standing.area_type === "town" || standing.area_type === "district")) {
    const { data } = await sb.rpc("sg_area_intel", {
      p_area_type: standing.area_type,
      p_area: standing.area_name,
      p_reg: agent.cea_registration,
    });
    market = data ?? null;
  }

  type Farm = {
    active_agents_12mo?: number; deals_12mo?: number; deals_per_agent?: number; top5_share_pct?: number;
    me?: { sales_12mo?: number; rank_by_deals?: number; of_agents?: number } | null;
  };
  const farm = (market as { farm?: Farm } | null)?.farm ?? null;

  // Elite benchmarking: position inside the active field, aggregate-only.
  const benchmark =
    tierAtLeast(tier, "elite") && farm
      ? {
          my_sales_12mo: farm.me?.sales_12mo ?? 0,
          my_rank_by_deals: farm.me?.rank_by_deals ?? null,
          of_active_agents: farm.me?.of_agents ?? farm.active_agents_12mo ?? null,
          area_deals_per_agent: farm.deals_per_agent ?? null,
          top5_share_pct: farm.top5_share_pct ?? null,
        }
      : null;

  return NextResponse.json({
    tier,
    month: now.toLocaleDateString("en-SG", { month: "long", year: "numeric" }),
    standing: standing ? { ...standing, movement } : null,
    demand: {
      window_days: 30,
      views: { current: views30, prior: viewsPrior30 },
      contact_clicks: { current: clicks30, prior: clicksPrior30 },
      shortlists: { current: shortlists30, prior: shortlistsPrior30 },
    },
    market,
    benchmark,
  });
}
