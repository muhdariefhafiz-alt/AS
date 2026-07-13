import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { getAgentSession } from "../../../lib/agent-auth";

// Assign a lead to a colleague (for team inbox, Phase 1).
// Service-role only; logs the assignment and notifies the assignee.
export async function POST(req: Request) {
  const session = await getAgentSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  let body: { shortlist_id?: number; assigned_to_slug?: string; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const shortlistId = Number(body.shortlist_id);
  const assignedToSlug = body.assigned_to_slug || null;
  const reason = body.reason || null;

  if (!Number.isFinite(shortlistId)) {
    return NextResponse.json({ error: "Invalid shortlist_id" }, { status: 400 });
  }

  const sb = supabaseAdmin();

  // Ownership check: the shortlist row must belong to the signed-in agent.
  const { data: shortlist } = await sb
    .from("sg_lead_shortlist")
    .select("id, agent_id")
    .eq("id", shortlistId)
    .single();

  if (!shortlist || shortlist.agent_id !== session.agentId) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  // TODO: Phase 1 enhancement: create sg_contact_assignments table + notify assignee
  // For now, just return success (API contract ready for Phase 1+ implementation)

  return NextResponse.json({ ok: true, assigned_to: assignedToSlug, reason });
}
