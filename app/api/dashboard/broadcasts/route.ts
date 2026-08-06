import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { getAgentSession } from "../../../lib/agent-auth";
import { announcementsForAgent } from "../../../lib/broadcasts";

// The announcement feed for the signed-in agent: the one card to show now, plus
// the full archive behind What's new. Delivery state lives in
// sg_broadcast_receipts, so this route only reads.
const EMPTY = { spotlight: null, whatsNew: [], unreadCount: 0 };

export async function GET() {
  const session = await getAgentSession();
  // 401, matching every sibling dashboard route. This used to answer 200 with
  // an empty feed, which leaked nothing but made the route LOOK gated when it
  // was not, and that is how a real gap survives a future review. The panel
  // only mounts for a signed-in agent, so nothing in the app sees this.
  if (!session) return NextResponse.json({ error: "Not signed in", ...EMPTY }, { status: 401 });

  const sb = supabaseAdmin();
  const { data: agent } = await sb
    .from("sg_agents")
    .select("id, subscription_tier, claimed, primary_area")
    .eq("id", session.agentId)
    .maybeSingle();
  if (!agent) return NextResponse.json(EMPTY);

  const feed = await announcementsForAgent(sb, agent, session.agentId);
  return NextResponse.json(feed);
}
