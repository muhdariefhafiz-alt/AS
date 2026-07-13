import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { getAgentSession } from "../../../lib/agent-auth";

// Lightweight "what needs you today" counts for the dashboard Home worklist:
// seller enquiries awaiting the agent's quote, and viewing requests to confirm.
// Session-gated; owned data only; never affects rank or lead flow.

export async function GET() {
  const session = await getAgentSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const sb = supabaseAdmin();
  const { data: agent } = await sb.from("sg_agents").select("cea_registration").eq("id", session.agentId).single();
  const cea = agent?.cea_registration ?? null;

  const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;

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

  return NextResponse.json({ openLeads, viewingRequests });
}
