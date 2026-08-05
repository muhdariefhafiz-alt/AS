import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { getAgentSession } from "../../../lib/agent-auth";
import { matchesAudience, type BroadcastAudience } from "../../../lib/broadcasts";

// Record what an agent did with an announcement.
//
//   seen  the card reached their screen (once per appearance)
//   ack   they closed it deliberately: read, not lost
//   click they went and used the thing
//
// Two rules keep the coverage number honest, because a number anyone can move
// is not evidence of anything:
//
//   ELIGIBILITY  the agent must actually be in the announcement's audience.
//                Without this check a signed-in agent could POST any id and
//                manufacture receipts for announcements never sent to them.
//   NO PROXIES   an impersonating admin writes nothing. An operator looking at
//                an agent's dashboard must never make it look like the agent
//                has seen the announcement.
//
// The write itself is a single upsert RPC: the primary path fires an impression
// and then a click milliseconds apart, so a read-then-insert would race with
// itself and drop acknowledgements.
type Action = "seen" | "ack" | "click";
const ACTIONS: Action[] = ["seen", "ack", "click"];

export async function POST(req: Request) {
  const session = await getAgentSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (session.impersonatedBy) return NextResponse.json({ ok: true, skipped: "impersonation" });

  let body: { broadcast_id?: number; action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const id = Number(body.broadcast_id);
  const action = String(body.action ?? "") as Action;
  if (!Number.isFinite(id) || !ACTIONS.includes(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const [{ data: broadcast }, { data: agent }] = await Promise.all([
    sb.from("sg_broadcasts").select("id, audience").eq("id", id).maybeSingle(),
    sb.from("sg_agents").select("id, subscription_tier, claimed, primary_area").eq("id", session.agentId).maybeSingle(),
  ]);
  if (!broadcast || !agent) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!matchesAudience(agent, (broadcast.audience ?? {}) as BroadcastAudience)) {
    return NextResponse.json({ error: "Not for you" }, { status: 403 });
  }

  const { error } = await sb.rpc("sg_record_broadcast_receipt", {
    p_broadcast_id: id,
    p_agent_id: session.agentId,
    p_action: action,
  });
  // supabase-js RESOLVES with an error rather than throwing, so a silent failure
  // here would look exactly like an announcement nobody engaged with.
  if (error) {
    console.error("[broadcast-receipt] write rejected", action, error);
    return NextResponse.json({ error: "Could not record" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
