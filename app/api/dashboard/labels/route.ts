import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { getAgentSession } from "../../../lib/agent-auth";
import { addLabel, removeLabel, listLabels, isInboxLabel } from "../../../lib/inbox-labels";

// Toggle a private label on an inbox item (a sg_lead_shortlist row). Session-
// gated; the shortlist row must belong to the signed-in agent. Controlled
// vocabulary only. Returns the current label set for optimistic UI reconcile.
export async function POST(req: Request) {
  const session = await getAgentSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (session.impersonatedBy) {
    return NextResponse.json({ error: "Disabled during admin impersonation." }, { status: 403 });
  }

  let body: { shortlist_id?: number; label?: string; action?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const shortlistId = Number(body.shortlist_id);
  const label = body.label;
  const action = body.action === "remove" ? "remove" : "add";
  if (!Number.isFinite(shortlistId) || !isInboxLabel(label)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const sb = supabaseAdmin();
  // Ownership check: the shortlist row must be this agent's.
  const { data: row } = await sb
    .from("sg_lead_shortlist")
    .select("id")
    .eq("id", shortlistId)
    .eq("agent_id", session.agentId)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  if (action === "remove") {
    await removeLabel(sb, shortlistId, session.agentId, label);
  } else {
    await addLabel(sb, shortlistId, session.agentId, label);
  }

  const labels = await listLabels(sb, shortlistId, session.agentId);
  return NextResponse.json({ ok: true, labels });
}
