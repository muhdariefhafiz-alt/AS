import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { getAgentSession } from "../../../lib/agent-auth";
import { activeBroadcastsForAgent } from "../../../lib/broadcasts";

// Active in-app announcements for the signed-in agent (matched by cohort,
// minus any they have dismissed). Powers the dashboard banner.
export async function GET() {
  const session = await getAgentSession();
  if (!session) return NextResponse.json({ broadcasts: [] });

  const sb = supabaseAdmin();
  const { data: agent } = await sb
    .from("sg_agents")
    .select("id, subscription_tier, claimed, primary_area")
    .eq("id", session.agentId)
    .maybeSingle();
  if (!agent) return NextResponse.json({ broadcasts: [] });

  const broadcasts = await activeBroadcastsForAgent(sb, agent, session.agentId);
  return NextResponse.json({ broadcasts });
}
