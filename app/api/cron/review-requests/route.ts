import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { sendEmail } from "../../../lib/email";
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
        .select("token, full_name, email, whatsapp, marketing_consent")
        .eq("id", c.lead_id)
        .single();
      if (!lead || !lead.email) continue;

      const { data: agent } = await sb
        .from("sg_agents")
        .select("name")
        .eq("id", c.agent_id)
        .single();
      const agentName = agent?.name ?? "your agent";
      const firstName = (lead.full_name ?? "").split(" ")[0] || "Hi";

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
        subject: `How did ${agentName} do? 2 minutes to leave a review`,
        html: reviewRequestHtml({
          name: firstName,
          agentName,
          link,
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

function reviewRequestHtml({
  name,
  agentName,
  link,
}: {
  name: string;
  agentName: string;
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
    <p style="margin:0 0 16px;font-size:20px;font-weight:700;color:#111827">${name}, how did ${agentName} do?</p>
    <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6">
      Two minutes. Public reviews show initials only. Your review helps the
      next seller in your area pick well.
    </p>
    <p style="margin:0 0 16px">
      <a href="${link}" style="display:inline-block;background:#1f44ff;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
        Leave a review
      </a>
    </p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}
