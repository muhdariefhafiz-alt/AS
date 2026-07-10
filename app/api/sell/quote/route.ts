import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { sendEmail } from "../../../lib/email";
import { sendWaAsync } from "../../../lib/whatsapp";
import { getAgentSession } from "../../../lib/agent-auth";
import { emailShell, p } from "../../../lib/email-layout";

// Agent submits a quote on a lead they were invited to. Authenticated by the
// signed agent session cookie; identity is never taken from the request body.

export async function POST(req: Request) {
  try {
    const session = await getAgentSession();
    if (!session) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }
    if (session.impersonatedBy) {
      return NextResponse.json(
        { error: "This action is disabled during admin impersonation." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      token,
      commission_pct,
      est_timeline_weeks,
      est_value_low,
      est_value_high,
      marketing_plan,
      note,
    } = body ?? {};

    if (typeof token !== "string" || token.length < 8 || token.length > 64) {
      return NextResponse.json({ error: "Invalid token." }, { status: 400 });
    }
    const pct = Number(commission_pct);
    if (!Number.isFinite(pct) || pct <= 0 || pct > 10) {
      return NextResponse.json(
        { error: "Commission must be between 0 and 10 percent." },
        { status: 400 }
      );
    }
    if (typeof marketing_plan !== "string" || marketing_plan.trim().length < 20) {
      return NextResponse.json(
        { error: "Marketing plan must be at least 20 characters." },
        { status: 400 }
      );
    }
    if (marketing_plan.length > 2000) {
      return NextResponse.json(
        { error: "Marketing plan is too long (max 2000 chars)." },
        { status: 400 }
      );
    }

    const sb = supabaseAdmin();

    const { data: agent, error: agentErr } = await sb
      .from("sg_agents")
      .select("id, name")
      .eq("id", session.agentId)
      .single();
    if (agentErr || !agent) {
      return NextResponse.json({ error: "Agent not found." }, { status: 404 });
    }

    const { data: lead } = await sb
      .from("sg_leads")
      .select(
        "id, token, status, email, whatsapp, marketing_consent, full_name, property_type, town, district_code"
      )
      .eq("token", token)
      .single();
    if (!lead) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    const { data: shortlist } = await sb
      .from("sg_lead_shortlist")
      .select("id, status")
      .eq("lead_id", lead.id)
      .eq("agent_id", agent.id)
      .single();
    if (!shortlist || shortlist.status !== "invited") {
      return NextResponse.json(
        { error: "You were not invited to quote on this lead." },
        { status: 403 }
      );
    }

    const nowIso = new Date().toISOString();
    const { data: quote, error: quoteErr } = await sb
      .from("sg_lead_quotes")
      .upsert(
        {
          lead_id: lead.id,
          agent_id: agent.id,
          shortlist_id: shortlist.id,
          commission_pct: pct,
          est_timeline_weeks: est_timeline_weeks ?? null,
          est_value_low: est_value_low ?? null,
          est_value_high: est_value_high ?? null,
          marketing_plan: marketing_plan.trim(),
          note: note ? String(note).slice(0, 500) : null,
          status: "submitted",
          submitted_at: nowIso,
        },
        { onConflict: "lead_id,agent_id" }
      )
      .select("id")
      .single();
    if (quoteErr || !quote) {
      console.error("[sell/quote] upsert failed", quoteErr);
      return NextResponse.json(
        { error: "Could not save quote." },
        { status: 500 }
      );
    }

    await sb
      .from("sg_lead_shortlist")
      .update({ status: "quoted", quoted_at: nowIso })
      .eq("id", shortlist.id);
    await sb.from("sg_leads").update({ status: "quoted" }).eq("id", lead.id);
    await sb.from("sg_lead_events").insert({
      lead_id: lead.id,
      agent_id: agent.id,
      event_type: "agent_submit_quote",
      meta: { commission_pct: pct, est_timeline_weeks: est_timeline_weeks ?? null },
    });

    // Notify the homeowner, WhatsApp + email in parallel.
    const site =
      process.env.NEXT_PUBLIC_SITE_URL ?? "https://fair-comparisons.com";
    const link = `${site}/sell/quotes/${lead.token}?utm_source=notify`;
    if (lead.whatsapp && lead.marketing_consent) {
      sendWaAsync({
        to: String(lead.whatsapp),
        template: "seller_quote_ready",
        variables: {
          seller_first_name: (lead.full_name ?? "").split(" ")[0] || "Hi",
          agent_name: agent.name ?? "",
          link,
        },
        metric: "Seller Quote Ready",
        properties: { lead_token: lead.token, agent_id: agent.id, channel: "wa" },
      });
    }
    if (lead.email) {
      const agentName = agent.name ?? "";
      const propertyType = lead.property_type ?? "";
      const area = lead.town ?? "";
      const bodyHtml = [
        p(
          `${agentName} has sent a fee quote for your ${propertyType ?? "home"}${area ? ` in ${area}` : ""}.`
        ),
        p(
          "Compare them on fee, marketing plan and, most importantly, each agent's real sales record in your area."
        ),
      ].join("");
      sendEmail({
        to: lead.email,
        subject: `${agentName} sent you a quote`,
        html: emailShell({
          preheader: "Compare fees, plans and records side by side.",
          heading: `${agentName} sent you a quote`,
          bodyHtml,
          cta: { label: "Compare your quotes", href: link },
          unsubscribeEmail: lead.email,
        }),
        metric: "Seller Quote Ready",
        properties: { lead_token: lead.token, agent_id: agent.id },
      }).catch((e) => console.error("[sell/quote] seller email failed", e));
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[sell/quote] unexpected", err);
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}
