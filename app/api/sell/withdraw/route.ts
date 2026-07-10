import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { sendEmail } from "../../../lib/email";
import { sendWaAsync } from "../../../lib/whatsapp";
import { getAgentSession } from "../../../lib/agent-auth";
import { emailShell, p } from "../../../lib/email-layout";

// Agent withdraws a submitted quote (before the seller picks). Authenticated by
// the signed agent session cookie; identity is never taken from the request body.

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
    const { token } = body ?? {};

    if (typeof token !== "string" || token.length < 8 || token.length > 64) {
      return NextResponse.json({ error: "Invalid token." }, { status: 400 });
    }

    const sb = supabaseAdmin();
    const { data: agent } = await sb
      .from("sg_agents")
      .select("id, name")
      .eq("id", session.agentId)
      .single();
    if (!agent) {
      return NextResponse.json({ error: "Agent not found." }, { status: 404 });
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
      const first = (lead.full_name ?? "").split(" ")[0] || "";
      const heading = first
        ? `${first}, ${agent.name} withdrew their quote.`
        : `${agent.name} withdrew their quote.`;
      sendEmail({
        to: lead.email,
        subject: `${agent.name} withdrew their quote`,
        html: emailShell({
          preheader: "No action needed. You still have other quotes to compare.",
          heading,
          bodyHtml: p(
            "No problem. You still have other quotes to compare, or you can ask us to suggest more agents."
          ),
          cta: { label: "View your quotes", href: link },
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
