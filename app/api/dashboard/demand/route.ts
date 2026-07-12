import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { getAgentSession } from "../../../lib/agent-auth";

// Demand Dashboard: real seller demand for THIS agent, from owned data only.
// Views (funnel events), shortlist appearances, invites, quotes, wins. This
// surface only SHOWS demand; it never gates, reorders or allocates leads
// (rankings and lead flow stay record-driven and unbuyable).

export async function GET() {
  const session = await getAgentSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const sb = supabaseAdmin();
  const now = Date.now();
  const d7 = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  const d30 = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

  const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;

  const [views7, views30, shortlists30, invites30, quotes30, winsAll] = await Promise.all([
    count(sb.from("sg_funnel_events").select("id", { count: "exact", head: true }).eq("event", "profile_view").eq("agent_id", session.agentId).gte("created_at", d7)),
    count(sb.from("sg_funnel_events").select("id", { count: "exact", head: true }).eq("event", "profile_view").eq("agent_id", session.agentId).gte("created_at", d30)),
    count(sb.from("sg_lead_shortlist").select("id", { count: "exact", head: true }).eq("agent_id", session.agentId).gte("created_at", d30)),
    count(sb.from("sg_lead_shortlist").select("id", { count: "exact", head: true }).eq("agent_id", session.agentId).not("invited_at", "is", null).gte("invited_at", d30)),
    count(sb.from("sg_lead_shortlist").select("id", { count: "exact", head: true }).eq("agent_id", session.agentId).not("quoted_at", "is", null).gte("quoted_at", d30)),
    count(sb.from("sg_lead_shortlist").select("id", { count: "exact", head: true }).eq("agent_id", session.agentId).not("picked_at", "is", null)),
  ]);

  return NextResponse.json({ views7, views30, shortlists30, invites30, quotes30, winsAll });
}
