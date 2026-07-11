import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { sendEmail } from "../../../lib/email";
import { emailShell, p, muted, rows } from "../../../lib/email-layout";
import { greetName, titleName, cleanAgency } from "../../../lib/names";

// Homeowner picks a winning agent → creates the instruction row in
// sg_lead_completions, hands the seller's contact details to the winner (the
// one agent the seller chose, exactly what the PDPA consent permits) and
// confirms the pick to the seller in writing. Without the handoff email the
// funnel dead-ends here: the seller waits for a call the agent has no number
// to make.
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
      .select(
        "id, token, status, full_name, email, phone, whatsapp, timeline, property_type, town, district_code"
      )
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

    // Create the completion row in picked-only state. instruction_signed_at
    // is deliberately NOT set here: no agency agreement has been signed at
    // pick time, and stamping it would fabricate a legal milestone (it also
    // silently pre-completed step 1 of the agent's completion stepper). The
    // agent logs the real signing date via the stepper.
    await sb
      .from("sg_lead_completions")
      .upsert(
        {
          lead_id: lead.id,
          agent_id: quote.agent_id,
          quote_id: quote.id,
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

    // Hand the winner everything they need to actually contact the seller.
    const { data: agent } = await sb
      .from("sg_agents")
      .select("name, email, claimed_email, agency_name, cea_registration")
      .eq("id", quote.agent_id)
      .single();
    const site =
      process.env.NEXT_PUBLIC_SITE_URL ?? "https://fair-comparisons.com";
    const commissionPct = Number(quote.commission_pct);
    const sellerLabel = lead.full_name ?? "Seller";
    const agentTo = agent?.claimed_email ?? agent?.email ?? null;

    if (agentTo) {
      const first = greetName(agent?.name ?? "");
      // The seller CHOSE this agent: sharing their contact details with the
      // winner (and only the winner) is exactly what the sell-form PDPA
      // consent permits. Without it the handoff cannot happen.
      const contactRows: string[] = [`<strong>Seller:</strong> ${sellerLabel}`];
      if (lead.phone || lead.whatsapp) {
        contactRows.push(
          `<strong>Phone / WhatsApp:</strong> ${String(lead.whatsapp || lead.phone)}`
        );
      }
      if (lead.email) contactRows.push(`<strong>Email:</strong> ${String(lead.email)}`);
      if (lead.timeline) contactRows.push(`<strong>Timeline:</strong> ${String(lead.timeline)}`);

      sendEmail({
        to: agentTo,
        subject: `You won the instruction: ${sellerLabel} picked you`,
        html: emailShell({
          preheader: `${sellerLabel} picked you at ${commissionPct.toFixed(2)}% commission. Their contact details are inside.`,
          heading: `${first ? `${first}, you` : "You"} have been instructed.`,
          bodyHtml:
            p(
              `${sellerLabel} picked you at <strong>${commissionPct.toFixed(2)}%</strong> commission for their ${lead.property_type ?? "property"} in ${lead.town ?? lead.district_code ?? "Singapore"}.`
            ) +
            rows(contactRows) +
            p(
              "Please contact them within 24 hours to arrange the agency agreement. They were told to expect your call or message."
            ) +
            muted(
              "There is no platform fee or commission on this sale, it is entirely yours."
            ),
          cta: { label: "Open your dashboard", href: `${site}/dashboard?utm_source=notify&utm_medium=picked` },
        }),
        metric: "Agent Notification",
        properties: { lead_token: token, kind: "picked" },
      }).catch((e) => console.error("[sell/pick] winner notify failed", e));
    }

    // Written confirmation to the seller: the terms they accepted, what
    // happens next, and their permanent link back to the record.
    if (lead.email) {
      const agentDisplay = titleName(agent?.name ?? "your agent");
      sendEmail({
        to: lead.email,
        subject: `You instructed ${agentDisplay} at ${commissionPct.toFixed(2)}% commission`,
        html: emailShell({
          preheader: `${agentDisplay} has your contact details and is expected to reach out.`,
          heading: `You instructed ${agentDisplay}.`,
          bodyHtml:
            rows([
              `<strong>Agent:</strong> ${agentDisplay}`,
              `<strong>Agency:</strong> ${cleanAgency(agent?.agency_name ?? "")}`,
              ...(agent?.cea_registration
                ? [`<strong>CEA registration:</strong> ${String(agent.cea_registration)}`]
                : []),
              `<strong>Agreed commission:</strong> ${commissionPct.toFixed(2)}%`,
            ]) +
            p(
              `We have sent ${agentDisplay} your contact details. They are expected to contact you within a day or two to arrange the agency agreement. Nothing is legally binding until you sign that agreement with them.`
            ) +
            p(
              "If you hear nothing within a few days, reply to this email and we will chase it for you."
            ),
          cta: { label: "View your record", href: `${site}/sell/quotes/${lead.token}` },
        }),
        metric: "Seller Instructed",
        properties: { lead_token: token, agent_id: quote.agent_id },
      }).catch((e) => console.error("[sell/pick] seller confirm failed", e));
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[sell/pick] unexpected", err);
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
