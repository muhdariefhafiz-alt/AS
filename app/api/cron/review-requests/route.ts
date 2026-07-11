import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { sendEmail } from "../../../lib/email";
import { emailShell, p } from "../../../lib/email-layout";
import { sendWaAsync } from "../../../lib/whatsapp";

// Daily cron: find sg_lead_completions whose OTP was signed 7 days ago and
// for which no review exists yet. Fire a review-request email + WhatsApp.

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const sb = supabaseAdmin();
  const nowMs = Date.now();
  const lower = new Date(nowMs - 8 * 86_400_000).toISOString();
  const upper = new Date(nowMs - 7 * 86_400_000).toISOString();

  const { data: completions } = await sb
    .from("sg_lead_completions")
    .select("id, lead_id, agent_id, otp_signed_at")
    .gte("otp_signed_at", lower)
    .lt("otp_signed_at", upper)
    .limit(500);

  if (!completions || completions.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  let sent = 0;
  for (const c of completions) {
    try {
      // Skip if already reviewed.
      const { data: existing } = await sb
        .from("sg_agent_reviews")
        .select("id")
        .eq("completion_id", c.id)
        .maybeSingle();
      if (existing) continue;

      const { data: lead } = await sb
        .from("sg_leads")
        .select(
          "token, full_name, email, email_opt_out_at, whatsapp, marketing_consent, property_type, town, district_code"
        )
        .eq("id", c.lead_id)
        .single();
      if (!lead || !lead.email) continue;
      // Unsubscribed sellers are never mailed again.
      if (lead.email_opt_out_at) continue;

      const { data: agent } = await sb
        .from("sg_agents")
        .select("name")
        .eq("id", c.agent_id)
        .single();
      const agentName = agent?.name ?? "your agent";
      const firstName = (lead.full_name ?? "").split(" ")[0] || "Hi";
      const propertyType = lead.property_type || "property";
      const area = lead.town || lead.district_code || "your area";

      const site =
        process.env.NEXT_PUBLIC_SITE_URL ?? "https://fair-comparisons.com";
      const link = `${site}/sell/review/${lead.token}?utm_source=review_cron`;

      if (lead.whatsapp && lead.marketing_consent) {
        sendWaAsync({
          to: String(lead.whatsapp),
          template: "seller_completion_review",
          variables: {
            seller_first_name: firstName,
            agent_name: agentName,
            link,
          },
          metric: "Seller Review Request",
          properties: { lead_token: lead.token, channel: "wa" },
        });
      }

      await sendEmail({
        to: String(lead.email),
        subject: `Congratulations on selling your ${propertyType}`,
        html: emailShell({
          preheader: `One quick thing that helps the next seller in ${area}.`,
          heading: `Congratulations on selling your ${propertyType}`,
          bodyHtml: [
            p(
              `Congratulations on completing the sale of your ${propertyType} in ${area}.`
            ),
            p(
              `Would you take 60 seconds to review ${agentName}? Verified reviews from real sellers are the single most useful thing for the next person choosing an agent here, and yours is verified because we saw the transaction.`
            ),
          ].join(""),
          cta: { label: "Leave a verified review", href: link },
          unsubscribeEmail: String(lead.email),
        }),
        metric: "Seller Review Request",
        properties: { lead_token: lead.token },
      });
      sent += 1;
    } catch (e) {
      console.error("[cron/review-requests] failed for completion", c.id, e);
    }
  }

  return NextResponse.json({
    ok: true,
    sent,
    scanned: completions.length,
  });
}
