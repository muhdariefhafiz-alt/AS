import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { getAgentSession } from "../../../lib/agent-auth";

// Add a private note to an inbox item. Notes are stored as sg_lead_events rows
// (event_type='agent_note', meta.text), so they land in the same contact
// timeline as replies and viewings for free. Session-gated; the shortlist row
// must belong to the signed-in agent. Notes are per-(lead, agent), never shared
// with other shortlisted agents.
const MAX_NOTE = 2000;

export async function POST(req: Request) {
  const session = await getAgentSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (session.impersonatedBy) {
    return NextResponse.json({ error: "Disabled during admin impersonation." }, { status: 403 });
  }

  let body: { shortlist_id?: number; text?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const shortlistId = Number(body.shortlist_id);
  const text = String(body.text ?? "").trim().slice(0, MAX_NOTE);
  if (!Number.isFinite(shortlistId) || !text) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const sb = supabaseAdmin();
  // Ownership check: the shortlist row must be this agent's, and gives us lead_id.
  const { data: row } = await sb
    .from("sg_lead_shortlist")
    .select("id, lead_id")
    .eq("id", shortlistId)
    .eq("agent_id", session.agentId)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const { data: inserted, error } = await sb
    .from("sg_lead_events")
    .insert({
      lead_id: Number(row.lead_id),
      agent_id: session.agentId,
      event_type: "agent_note",
      meta: { text, shortlist_id: shortlistId },
    })
    .select("id, event_type, meta, created_at")
    .maybeSingle();

  if (error) {
    console.error("[notes] insert failed", error);
    return NextResponse.json({ error: "Could not save the note." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, event: inserted });
}
