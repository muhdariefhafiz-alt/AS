import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase";
import { getAgentSession } from "../../../../lib/agent-auth";
import { logReplySent } from "../../../../lib/inbox-activation";

// "Mark as replied" on a seller lead. Session-gated; the shortlist row must
// belong to the signed-in agent. Sets first_reply_at (once) and logs the reply
// signal that powers the Phase-0 North Star and the Aha/Habit activation events.
// The agent sends via their own channel; this only records that they replied.
export async function POST(req: Request) {
  const session = await getAgentSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (session.impersonatedBy) {
    return NextResponse.json({ error: "Disabled during admin impersonation." }, { status: 403 });
  }

  let body: { shortlist_id?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const shortlistId = Number(body.shortlist_id);
  if (!Number.isFinite(shortlistId)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const { data: agent } = await sb
    .from("sg_agents")
    .select("id, slug")
    .eq("id", session.agentId)
    .single();
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  // Ownership check: the shortlist row must be this agent's.
  const { data: row } = await sb
    .from("sg_lead_shortlist")
    .select("id, lead_id, first_reply_at")
    .eq("id", shortlistId)
    .eq("agent_id", agent.id)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const firstReply = !row.first_reply_at;
  if (firstReply) {
    await sb
      .from("sg_lead_shortlist")
      .update({ first_reply_at: new Date().toISOString() })
      .eq("id", shortlistId);
  }

  // Instrumentation is best-effort; never fail the action on a logging error.
  await logReplySent(sb, {
    agentId: Number(agent.id),
    agentSlug: (agent.slug as string | null) ?? null,
    shortlistId,
    leadId: Number(row.lead_id),
  });

  return NextResponse.json({ ok: true, first_reply: firstReply });
}
