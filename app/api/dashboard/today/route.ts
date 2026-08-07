import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { getAgentSession } from "../../../lib/agent-auth";
import { nextAction, OPEN_STAGES, type DealStage } from "../../../lib/deals";

// "What needs you today" for the dashboard worklist.
//
// It used to count exactly two things, both of which depend on DEMAND: seller
// enquiries awaiting a quote, and viewing requests to confirm. Four seller leads
// have ever existed and none reached a claimed agent, and sg_viewings is empty,
// so this endpoint returned {0,0} for every agent who has ever signed in and the
// worklist never rendered once. An agent could hand-enter four live deals and
// still be told nothing needed them.
//
// So it now also reads the deal spine, which needs no lead, no viewing and no
// setup: a deal the agent typed in themselves is work, and the stalest open deal
// is the most useful thing this surface can point at. nextAction() already
// computes the right instruction per stage, so the copy stays in one place.
//
// Session-gated; owned data only; never affects rank or lead flow.

export async function GET() {
  const session = await getAgentSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const sb = supabaseAdmin();
  const { data: agent } = await sb.from("sg_agents").select("cea_registration").eq("id", session.agentId).single();
  const cea = agent?.cea_registration ?? null;

  const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;

  // The deal spine. OPEN_STAGES only: a completed or lost deal is not work.
  // Stalest first, because "this one has not moved in three weeks" is the most
  // useful thing a worklist can say.
  const { data: dealRows, error: dealsError } = await sb
    .from("sg_deals")
    .select("id, stage, property_label, updated_at")
    .eq("agent_id", session.agentId)
    .in("stage", OPEN_STAGES)
    .order("updated_at", { ascending: true })
    .limit(50);
  if (dealsError) {
    // Fail loudly rather than reporting an empty worklist, which is exactly the
    // bug this endpoint is being fixed for.
    console.error("[dashboard/today] deals load failed", dealsError);
    return NextResponse.json({ error: "Could not load your work" }, { status: 500 });
  }
  const deals = dealRows ?? [];

  // Which artefacts hang off each deal, so nextAction() can name the real step.
  const dealIds = deals.map((d) => d.id);
  const [{ data: vRows }, { data: dRows }] = dealIds.length
    ? await Promise.all([
        sb.from("sg_viewings").select("deal_id, status").in("deal_id", dealIds),
        sb.from("sg_documents").select("deal_id, doc_type").in("deal_id", dealIds).neq("status", "void"),
      ])
    : [{ data: [] }, { data: [] }];
  const hasViewing = new Set((vRows ?? []).map((v) => String(v.deal_id)));
  const hasLoi = new Set((dRows ?? []).filter((d) => d.doc_type === "loi").map((d) => String(d.deal_id)));
  const hasTa = new Set((dRows ?? []).filter((d) => d.doc_type === "tenancy_agreement").map((d) => String(d.deal_id)));

  const DAY = 24 * 60 * 60 * 1000;
  const needsYou = deals.slice(0, 3).map((d) => {
    const id = String(d.id);
    return {
      id,
      property_label: String(d.property_label ?? ""),
      stage: d.stage as DealStage,
      action: nextAction(d.stage as DealStage, {
        viewing: hasViewing.has(id),
        loi: hasLoi.has(id),
        ta: hasTa.has(id),
      }),
      idle_days: Math.floor((Date.now() - new Date(String(d.updated_at)).getTime()) / DAY),
    };
  });

  const [openLeads, viewingRequests] = await Promise.all([
    // Invited to quote, not yet quoted = awaiting the agent's action.
    count(
      sb.from("sg_lead_shortlist").select("id", { count: "exact", head: true })
        .eq("agent_id", session.agentId)
        .not("invited_at", "is", null)
        .is("quoted_at", null),
    ),
    // Viewing requests booked via /book that still need confirm/decline.
    cea
      ? count(
          sb.from("sg_viewings").select("id", { count: "exact", head: true })
            .eq("agent_cea_no", cea)
            .eq("status", "requested"),
        )
      : Promise.resolve(0),
  ]);

  return NextResponse.json({ openLeads, viewingRequests, deals: needsYou, openDeals: deals.length });
}
