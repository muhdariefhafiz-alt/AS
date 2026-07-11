import { NextResponse } from "next/server";
import { getAdminSession } from "../../../lib/admin-auth";
import { supabaseAdmin } from "../../../lib/supabase";

// Admin-only: record that the operator manually sent a lead invite over
// WhatsApp (official wa.me click-to-chat from the FairComparisons number,
// never automated). The button in the Leads worklist opens WhatsApp with the
// prefilled invite; AFTER the operator actually presses send there, a second
// tap posts here so the notification ledger and the seller-facing "we
// contacted your agent" copy reflect a real send, attested by the operator.
export async function POST(req: Request) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let leadId: number | null = null;
  let agentId: number | null = null;
  try {
    const body = await req.json();
    leadId = Number(body?.lead_id);
    agentId = Number(body?.agent_id);
  } catch {
    // fall through to validation
  }
  if (!leadId || !Number.isFinite(leadId) || !agentId || !Number.isFinite(agentId)) {
    return NextResponse.json(
      { error: "lead_id and agent_id required" },
      { status: 400 }
    );
  }

  const sb = supabaseAdmin();
  // The pair must be a real shortlist row: no free-form ledger writes.
  const { data: row } = await sb
    .from("sg_lead_shortlist")
    .select("id, status")
    .eq("lead_id", leadId)
    .eq("agent_id", agentId)
    .maybeSingle();
  if (!row) {
    return NextResponse.json(
      { error: "No shortlist row for that lead/agent." },
      { status: 404 }
    );
  }

  const { error: insErr } = await sb.from("sg_lead_notifications").insert({
    lead_id: leadId,
    agent_id: agentId,
    channel: "whatsapp_manual",
    provider_message_id: null,
    outcome: "sent",
    error: null,
  });
  if (insErr) {
    console.error("[admin/notify-manual] ledger insert failed", insErr);
    return NextResponse.json({ error: "Ledger write failed." }, { status: 500 });
  }

  // A manually contacted agent is genuinely invited: flip an 'unreachable'
  // row so the seller's page moves it from "could not reach" to "waiting".
  if (row.status === "unreachable") {
    await sb
      .from("sg_lead_shortlist")
      .update({ status: "invited", invited_at: new Date().toISOString() })
      .eq("id", row.id);
  }

  return NextResponse.json({ success: true });
}
