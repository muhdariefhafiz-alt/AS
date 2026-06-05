import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { sendEmail } from "../../../lib/email";
import { sendWaAsync } from "../../../lib/whatsapp";

// Agent submits a quote on a lead they were invited to.
// Authenticated by (cea_registration + email) match on sg_agents — same loose
// pattern the existing dashboard lookup uses. Replace with proper auth in a
// follow-up if needed.

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      token,
      cea_registration,
      agent_email,
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
    if (!cea_registration || !agent_email) {
      return NextResponse.json(
        { error: "CEA reg + email required." },
        { status: 400 }
      );
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
      .select("id, name, email, claimed_email")
      .eq("cea_registration", String(cea_registration).trim())
      .single();
    if (agentErr || !agent) {
      return NextResponse.json({ error: "Agent not found." }, { status: 404 });
    }
    const emailLc = String(agent_email).toLowerCase().trim();
    // Once an agent has claimed (verified email ownership), ONLY their
    // claimed_email authenticates; the scraped public email no longer works,
    // which closes impersonation of claimed agents. Unclaimed agents may still
    // use their on-file email to participate in quoting.
    const matches = agent.claimed_email
      ? String(agent.claimed_email).toLowerCase() === emailLc
      : !!agent.email && String(agent.email).toLowerCase() === emailLc;
    if (!matches) {
      return NextResponse.json(
        { error: "Email does not match this CEA registration." },
        { status: 403 }
      );
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

    // Notify the homeowner — WhatsApp + email in parallel.
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
      sendEmail({
        to: lead.email,
        subject: `${agent.name} sent you a quote`,
        html: quoteReadyHtml({
          name: lead.full_name ?? "",
          agentName: agent.name ?? "",
          link,
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

function quoteReadyHtml({
  name,
  agentName,
  link,
}: {
  name: string;
  agentName: string;
  link: string;
}): string {
  const first = name.split(" ")[0] || "";
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
    <p style="margin:0 0 16px;font-size:20px;font-weight:700;color:#111827">${first}, ${agentName} sent you a quote.</p>
    <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6">
      View commission, timeline and marketing approach. You can pick a winning agent any time.
    </p>
    <p style="margin:0 0 16px">
      <a href="${link}" style="display:inline-block;background:#1f44ff;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
        See the quote
      </a>
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}
