import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { sendEmail } from "../../../lib/email";
import { sendWaAsync } from "../../../lib/whatsapp";

// Agent withdraws a submitted quote (before the seller picks).
// Auth = cea_registration + email match (same as /api/sell/quote).

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token, cea_registration, agent_email } = body ?? {};

    if (typeof token !== "string" || token.length < 8 || token.length > 64) {
      return NextResponse.json({ error: "Invalid token." }, { status: 400 });
    }
    if (!cea_registration || !agent_email) {
      return NextResponse.json(
        { error: "CEA reg + email required." },
        { status: 400 }
      );
    }

    const sb = supabaseAdmin();
    const { data: agent } = await sb
      .from("sg_agents")
      .select("id, name, email, claimed_email")
      .eq("cea_registration", String(cea_registration).trim())
      .single();
    if (!agent) {
      return NextResponse.json({ error: "Agent not found." }, { status: 404 });
    }
    const emailLc = String(agent_email).toLowerCase().trim();
    // Once an agent has claimed (verified email ownership), ONLY their
    // claimed_email authenticates; the scraped public email no longer works,
    // which closes impersonation of claimed agents. Unclaimed agents may still
    // use their on-file email.
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
      .select("id, token, status, full_name, email, whatsapp, marketing_consent, town, district_code")
      .eq("token", token)
      .single();
    if (!lead) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }
    // Can't withdraw after the seller has instructed someone.
    if (lead.status === "instructed" || lead.status === "completed") {
      return NextResponse.json(
        { error: "This sale has already been instructed." },
        { status: 409 }
      );
    }

    const { data: quote } = await sb
      .from("sg_lead_quotes")
      .select("id, status")
      .eq("lead_id", lead.id)
      .eq("agent_id", agent.id)
      .single();
    if (!quote || quote.status !== "submitted") {
      return NextResponse.json(
        { error: "No active quote to withdraw." },
        { status: 409 }
      );
    }

    const nowIso = new Date().toISOString();
    await sb
      .from("sg_lead_quotes")
      .update({ status: "withdrawn", decided_at: nowIso })
      .eq("id", quote.id);
    await sb
      .from("sg_lead_shortlist")
      .update({ status: "declined", declined_at: nowIso })
      .eq("lead_id", lead.id)
      .eq("agent_id", agent.id);
    await sb.from("sg_lead_events").insert({
      lead_id: lead.id,
      agent_id: agent.id,
      event_type: "agent_withdraw_quote",
      meta: {},
    });

    // Tell the seller.
    const site =
      process.env.NEXT_PUBLIC_SITE_URL ?? "https://fair-comparisons.com";
    const link = `${site}/sell/quotes/${lead.token}`;
    if (lead.whatsapp && lead.marketing_consent) {
      sendWaAsync({
        to: String(lead.whatsapp),
        template: "seller_quote_ready",
        variables: {
          seller_first_name: (lead.full_name ?? "").split(" ")[0] || "Hi",
          agent_name: `${agent.name} (withdrew)`,
          link,
        },
        metric: "Seller Quote Ready",
        properties: { lead_token: lead.token, kind: "withdraw" },
      });
    }
    if (lead.email) {
      sendEmail({
        to: lead.email,
        subject: `${agent.name} withdrew their quote`,
        html: withdrawHtml({
          name: lead.full_name ?? "",
          agentName: agent.name ?? "",
          link,
        }),
        metric: "Seller Quote Ready",
        properties: { lead_token: lead.token, kind: "withdraw" },
      }).catch((e) => console.error("[sell/withdraw] email failed", e));
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[sell/withdraw] unexpected", err);
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
}

function withdrawHtml({
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
    <p style="margin:0 0 16px;font-size:18px;font-weight:700;color:#111827">${first}, ${agentName} withdrew their quote.</p>
    <p style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.6">
      No problem. You still have other quotes to compare, or you can ask us to suggest more agents.
    </p>
    <p style="margin:0 0 16px">
      <a href="${link}" style="display:inline-block;background:#1f44ff;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
        View your quotes
      </a>
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}
