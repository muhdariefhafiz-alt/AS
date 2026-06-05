import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { sendEmail } from "../../../lib/email";

// Homeowner picks a winning agent → creates the instruction row in sg_lead_completions.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token, quote_id } = body ?? {};

    if (typeof token !== "string" || token.length < 8 || token.length > 64) {
      return NextResponse.json({ error: "Invalid token." }, { status: 400 });
    }
    const qId = Number(quote_id);
    if (!Number.isFinite(qId) || qId <= 0) {
      return NextResponse.json({ error: "Invalid quote id." }, { status: 400 });
    }

    const sb = supabaseAdmin();
    const { data: lead } = await sb
      .from("sg_leads")
      .select("id, token, status, full_name, email")
      .eq("token", token)
      .single();
    if (!lead) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    const { data: quote } = await sb
      .from("sg_lead_quotes")
      .select("id, agent_id, commission_pct, est_value_low, est_value_high, status")
      .eq("id", qId)
      .eq("lead_id", lead.id)
      .single();
    if (!quote) {
      return NextResponse.json(
        { error: "Quote does not belong to this lead." },
        { status: 404 }
      );
    }
    if (quote.status === "rejected" || quote.status === "withdrawn") {
      return NextResponse.json(
        { error: "That quote is no longer available." },
        { status: 410 }
      );
    }

    const nowIso = new Date().toISOString();

    // Mark all quotes: accepted for the picked, rejected for the rest.
    await sb
      .from("sg_lead_quotes")
      .update({ status: "rejected", decided_at: nowIso })
      .eq("lead_id", lead.id)
      .neq("id", qId);
    await sb
      .from("sg_lead_quotes")
      .update({ status: "accepted", decided_at: nowIso })
      .eq("id", qId);

    // Mark shortlist rows: picked for winner, not_picked for the rest.
    await sb
      .from("sg_lead_shortlist")
      .update({ status: "not_picked" })
      .eq("lead_id", lead.id)
      .neq("agent_id", quote.agent_id);
    await sb
      .from("sg_lead_shortlist")
      .update({ status: "picked", picked_at: nowIso })
      .eq("lead_id", lead.id)
      .eq("agent_id", quote.agent_id);

    // Create the instruction row (if not already there).
    await sb
      .from("sg_lead_completions")
      .upsert(
        {
          lead_id: lead.id,
          agent_id: quote.agent_id,
          quote_id: quote.id,
          instruction_signed_at: nowIso,
        },
        { onConflict: "lead_id" }
      );

    await sb.from("sg_leads").update({ status: "instructed" }).eq("id", lead.id);
    await sb.from("sg_lead_events").insert({
      lead_id: lead.id,
      agent_id: quote.agent_id,
      event_type: "pick_winner",
      meta: { quote_id: qId, commission_pct: Number(quote.commission_pct) },
    });

    // Notify the picked agent so they can follow up.
    const { data: agent } = await sb
      .from("sg_agents")
      .select("name, email")
      .eq("id", quote.agent_id)
      .single();
    if (agent?.email) {
      const site =
        process.env.NEXT_PUBLIC_SITE_URL ?? "https://fair-comparisons.com";
      const link = `${site}/dashboard?token=${token}`;
      sendEmail({
        to: agent.email,
        subject: `You won the instruction — ${lead.full_name ?? "Seller"}`,
        html: pickedAgentHtml({
          agentName: agent.name ?? "",
          sellerName: lead.full_name ?? "",
          commissionPct: Number(quote.commission_pct),
          link,
        }),
        metric: "Agent Notification",
        properties: { lead_token: token, kind: "picked" },
      }).catch((e) => console.error("[sell/pick] notify failed", e));
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[sell/pick] unexpected", err);
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}

function pickedAgentHtml({
  agentName,
  sellerName,
  commissionPct,
  link,
}: {
  agentName: string;
  sellerName: string;
  commissionPct: number;
  link: string;
}): string {
  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f9fafb">
<tr><td align="center" style="padding:24px 16px">
<table cellpadding="0" cellspacing="0" border="0" width="560" style="background:#ffffff;border-radius:12px;overflow:hidden">
  <tr><td style="background:#0a1733;padding:24px 32px">
    <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff">FairComparisons</p>
  </td></tr>
  <tr><td style="padding:32px">
    <p style="margin:0 0 16px;font-size:20px;font-weight:700;color:#111827">${agentName}, you have been instructed.</p>
    <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6">
      ${sellerName} picked you at <strong>${commissionPct.toFixed(2)}%</strong> commission.
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#4b5563;line-height:1.6">
      Platform fee of 0.25% of sale price + GST is due on completion. Log the OTP signing date and completion date in your dashboard once they occur.
    </p>
    <p style="margin:0 0 16px">
      <a href="${link}" style="display:inline-block;background:#1f44ff;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
        Open dashboard
      </a>
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}
