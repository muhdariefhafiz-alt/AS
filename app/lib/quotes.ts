import { supabaseAdmin } from "./supabase";
import { sendEmail } from "./email";
import { sendWaAsync } from "./whatsapp";
import { emailShell, p } from "./email-layout";

// Shared quote-submission core, used by both quote entry points:
//   - /api/sell/quote (claimed agents, session cookie)
//   - /api/invite/quote (magic-invite link, token proves the agent)
// One implementation so validation, status flips and seller notifications
// can never drift between the two.

export type QuoteFields = {
  commission_pct: unknown;
  est_timeline_weeks?: unknown;
  est_value_low?: unknown;
  est_value_high?: unknown;
  marketing_plan: unknown;
  note?: unknown;
};

export function validateQuoteFields(
  f: QuoteFields
): { ok: true; pct: number; plan: string } | { ok: false; error: string } {
  const pct = Number(f.commission_pct);
  if (!Number.isFinite(pct) || pct <= 0 || pct > 10) {
    return { ok: false, error: "Commission must be between 0 and 10 percent." };
  }
  const plan = typeof f.marketing_plan === "string" ? f.marketing_plan : "";
  if (plan.trim().length < 20) {
    return { ok: false, error: "Marketing plan must be at least 20 characters." };
  }
  if (plan.length > 2000) {
    return { ok: false, error: "Marketing plan is too long (max 2000 chars)." };
  }
  return { ok: true, pct, plan };
}

// Upserts the quote, flips shortlist + lead to 'quoted', logs the event and
// notifies the seller. Caller must have ALREADY authenticated the agent and
// verified the (lead, agent) shortlist invitation.
export async function submitQuoteCore(args: {
  lead: {
    id: number;
    token: string;
    email: string | null;
    whatsapp: string | null;
    marketing_consent: boolean | null;
    full_name: string | null;
    property_type: string | null;
    town: string | null;
  };
  agent: { id: number; name: string | null };
  shortlistId: number;
  pct: number;
  plan: string;
  fields: QuoteFields;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { lead, agent, shortlistId, pct, plan, fields } = args;
  const sb = supabaseAdmin();
  const nowIso = new Date().toISOString();

  const { data: quote, error: quoteErr } = await sb
    .from("sg_lead_quotes")
    .upsert(
      {
        lead_id: lead.id,
        agent_id: agent.id,
        shortlist_id: shortlistId,
        commission_pct: pct,
        est_timeline_weeks: fields.est_timeline_weeks ?? null,
        est_value_low: fields.est_value_low ?? null,
        est_value_high: fields.est_value_high ?? null,
        marketing_plan: plan.trim(),
        note: fields.note ? String(fields.note).slice(0, 500) : null,
        status: "submitted",
        submitted_at: nowIso,
      },
      { onConflict: "lead_id,agent_id" }
    )
    .select("id")
    .single();
  if (quoteErr || !quote) {
    console.error("[quotes] upsert failed", quoteErr);
    return { ok: false, error: "Could not save quote." };
  }

  await sb
    .from("sg_lead_shortlist")
    .update({ status: "quoted", quoted_at: nowIso })
    .eq("id", shortlistId);
  await sb.from("sg_leads").update({ status: "quoted" }).eq("id", lead.id);
  await sb.from("sg_lead_events").insert({
    lead_id: lead.id,
    agent_id: agent.id,
    event_type: "agent_submit_quote",
    meta: {
      commission_pct: pct,
      est_timeline_weeks: fields.est_timeline_weeks ?? null,
    },
  });

  // Notify the homeowner, WhatsApp + email in parallel.
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fair-comparisons.com";
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
        `${agentName} has sent a fee quote for your ${propertyType || "home"}${area ? ` in ${area}` : ""}.`
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
    }).catch((e) => console.error("[quotes] seller email failed", e));
  }

  return { ok: true };
}
