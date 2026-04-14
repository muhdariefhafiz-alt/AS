import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendBatchEmails } from "../../../lib/email";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Weekly digest cron job.
 * Sends personalized emails to subscribers with top agents in their district.
 * Called by Vercel Cron every Monday at 9am SGT (1am UTC).
 * Protected by CRON_SECRET.
 */
export async function GET(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get active subscribers
  const { data: subscribers } = await supabase
    .from("sg_email_subscribers")
    .select("email, source, district_tag")
    .eq("unsubscribed", false);

  if (!subscribers || subscribers.length === 0) {
    return NextResponse.json({ sent: 0, message: "No active subscribers" });
  }

  // Get top 5 agents nationwide for the digest
  const { data: topAgents } = await supabase
    .from("sg_agents")
    .select("name, slug, agency_name, score, transaction_count")
    .not("score", "is", null)
    .order("score", { ascending: false })
    .limit(5);

  // Get recent funnel stats for the "platform growth" section
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count: weeklyViews } = await supabase
    .from("sg_funnel_events")
    .select("id", { count: "exact", head: true })
    .eq("event", "profile_view")
    .gte("created_at", sevenDaysAgo);

  // Get distinct districts with subscribers for district-specific content
  const districtTags = [...new Set(subscribers.map((s) => s.district_tag).filter(Boolean))];

  // Get top agent per district for personalization
  const districtLeaders: Record<string, { name: string; slug: string; score: number }> = {};
  if (districtTags.length > 0) {
    const { data: leaders } = await supabase
      .from("sg_area_top_agents")
      .select("area_name, agent_name, agent_slug, score")
      .eq("area_type", "district")
      .eq("rank", 1);

    for (const l of leaders ?? []) {
      districtLeaders[l.area_name] = { name: l.agent_name, slug: l.agent_slug, score: Number(l.score) };
    }
  }

  // Build emails
  const emails = subscribers.map((sub) => {
    const districtSection = sub.district_tag && districtLeaders[sub.district_tag]
      ? `
        <tr><td style="padding:20px 0 0">
          <p style="margin:0 0 8px;font-size:13px;color:#6b7280">TOP AGENT IN YOUR AREA</p>
          <p style="margin:0;font-size:15px">
            <a href="https://fair-comparisons.com/property-agents/agent/${districtLeaders[sub.district_tag].slug}?utm_source=digest&utm_medium=email" style="color:#0d9488;text-decoration:none;font-weight:600">${districtLeaders[sub.district_tag].name}</a>
            <span style="color:#9ca3af"> - Score: ${Math.round(districtLeaders[sub.district_tag].score)}</span>
          </p>
        </td></tr>`
      : "";

    const agentRows = (topAgents ?? [])
      .map(
        (a, i) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #f3f4f6">
            <table cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
              <td width="30" style="font-size:14px;font-weight:700;color:${i < 3 ? "#0d9488" : "#9ca3af"}">${i + 1}</td>
              <td>
                <a href="https://fair-comparisons.com/property-agents/agent/${a.slug}?utm_source=digest&utm_medium=email" style="color:#111827;text-decoration:none;font-weight:600;font-size:14px">${a.name}</a>
                <br><span style="font-size:12px;color:#6b7280">${a.agency_name} - ${a.transaction_count} transactions</span>
              </td>
              <td width="50" align="right" style="font-size:18px;font-weight:800;color:#0d9488">${Math.round(Number(a.score))}</td>
            </tr></table>
          </td>
        </tr>`
      )
      .join("");

    const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f9fafb">
<tr><td align="center" style="padding:24px 16px">
<table cellpadding="0" cellspacing="0" border="0" width="560" style="background:#ffffff;border-radius:12px;overflow:hidden">

  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#0f766e,#0d9488);padding:24px 32px">
    <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff">FairComparisons</p>
    <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.7)">Weekly Agent Rankings Digest</p>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:24px 32px">
    <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6">
      Here are this week's top-performing property agents in Singapore, ranked by AgentScore based on CEA transaction records.
    </p>

    ${weeklyViews ? `<p style="margin:0 0 20px;font-size:13px;color:#6b7280;background:#f0fdfa;padding:10px 14px;border-radius:8px">
      ${weeklyViews.toLocaleString()} agent profiles viewed this week on FairComparisons.
    </p>` : ""}

    <!-- Top 5 -->
    <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em">TOP 5 AGENTS THIS WEEK</p>
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      ${agentRows}
    </table>

    ${districtSection}

    <!-- CTA -->
    <tr><td style="padding:24px 0">
      <a href="https://fair-comparisons.com/insights/top-agents-2026?utm_source=digest&utm_medium=email" style="display:inline-block;background:#0d9488;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
        View full 2026 rankings
      </a>
    </td></tr>

    <!-- Agent CTA -->
    <tr><td style="padding:16px 0 0;border-top:1px solid #f3f4f6">
      <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:#111827">Are you a property agent?</p>
      <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.5">
        Your profile and score are already live. <a href="https://fair-comparisons.com/for-agents?utm_source=digest&utm_medium=email" style="color:#0d9488;text-decoration:none;font-weight:500">Claim your profile for free</a> to add your photo, bio, and WhatsApp number.
      </p>
    </td></tr>

  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:20px 32px;background:#f9fafb;border-top:1px solid #e5e7eb">
    <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.5">
      You received this because you subscribed on fair-comparisons.com.
      <a href="https://fair-comparisons.com/unsubscribe?email=${encodeURIComponent(sub.email)}" style="color:#9ca3af">Unsubscribe</a>
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>`;

    return {
      to: sub.email,
      subject: `Top Property Agents This Week - Singapore Rankings`,
      html,
    };
  });

  // Send in batches of 50
  let sent = 0;
  for (let i = 0; i < emails.length; i += 50) {
    const batch = emails.slice(i, i + 50);
    try {
      await sendBatchEmails(batch);
      sent += batch.length;
    } catch (err) {
      console.error(`[weekly-digest] Batch ${i} failed:`, err);
    }
  }

  // Log to funnel events
  await supabase.from("sg_funnel_events").insert({
    event: "weekly_digest_sent",
    metadata: { sent, total_subscribers: subscribers.length },
  });

  return NextResponse.json({ sent, total: subscribers.length });
}
