import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { sendEmail } from "../../../lib/email";
import { emailShell, p } from "../../../lib/email-layout";

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
      const sellerLabel = lead.full_name ?? "Seller";
      const commissionPct = Number(quote.commission_pct);
      const bodyParts = [
        p(
          `${sellerLabel} picked you at <strong>${commissionPct.toFixed(2)}%</strong> commission.`
        ),
        p(
          "There is no platform fee or commission on this sale, it is entirely yours. Manage your profile and tools any time from your dashboard."
        ),
      ];
      sendEmail({
        to: agent.email,
        subject: `You won the instruction: ${sellerLabel} picked you`,
        html: emailShell({
          preheader: `${sellerLabel} picked you at ${commissionPct.toFixed(2)}% commission.`,
          heading: `${agent.name ? `${agent.name}, you` : "You"} have been instructed.`,
          bodyHtml: bodyParts.join(""),
          cta: { label: "Open dashboard", href: link },
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
