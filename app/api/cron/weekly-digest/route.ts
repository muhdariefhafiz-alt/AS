import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendBatchEmails } from "../../../lib/email";
import { emailShell, p, muted, rows } from "../../../lib/email-layout";

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
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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

  // Build emails. All-zero suppression (doc B2): if every metric line for a
  // recipient is zero or absent, skip that recipient entirely. Never email "0 views".
  const emails = subscribers.flatMap((sub) => {
    const leader = sub.district_tag ? districtLeaders[sub.district_tag] : undefined;
    const hasTopAgents = (topAgents ?? []).length > 0;
    const hasViews = !!weeklyViews && weeklyViews > 0;
    if (!hasTopAgents && !hasViews && !leader) return [];

    const agentItems = (topAgents ?? []).map((a) => {
      const detail = [
        a.agency_name ? String(a.agency_name) : "",
        a.transaction_count ? `${a.transaction_count} transactions` : "",
      ]
        .filter(Boolean)
        .join(", ");
      return `<a href="https://fair-comparisons.com/property-agents/agent/${a.slug}?utm_source=digest&utm_medium=email" style="color:#111827;text-decoration:none;font-weight:600">${a.name}</a><span style="float:right;font-size:16px;font-weight:800;color:#1f44ff">${Math.round(Number(a.score))}</span>${detail ? `<br><span style="font-size:12px;color:#6b7280;font-weight:400">${detail}</span>` : ""}`;
    });

    const bodyHtml = [
      p(
        "This week's highest-scoring property agents in Singapore, ranked on CEA transaction data. No paid placements."
      ),
      weeklyViews
        ? p(
            `<strong>${weeklyViews.toLocaleString()}</strong> agent profiles researched this week by Singapore buyers.`
          )
        : "",
      hasTopAgents ? rows(agentItems, true) : "",
      leader
        ? p(
            `Top agent in your area: <a href="https://fair-comparisons.com/property-agents/agent/${leader.slug}?utm_source=digest&utm_medium=email" style="color:#1f44ff;text-decoration:none;font-weight:600">${leader.name}</a>, score ${Math.round(leader.score)}.`
          )
        : "",
      muted(
        `Are you a property agent? Your profile is already public. <a href="https://fair-comparisons.com/for-agents?utm_source=digest&utm_medium=email" style="color:#1f44ff;text-decoration:none;font-weight:500">Claim it</a> to add your photo, WhatsApp, and bio. Free.`
      ),
    ].join("");

    const html = emailShell({
      preheader: "Singapore's highest-scoring agents this week, ranked on real CEA data.",
      heading: "This week's top agents",
      bodyHtml,
      cta: {
        label: "See full rankings",
        href: "https://fair-comparisons.com/insights/top-agents-2026?utm_source=digest&utm_medium=email",
      },
      footerNote: "You subscribed on fair-comparisons.com.",
      unsubscribeEmail: sub.email,
    });

    return [
      {
        to: sub.email,
        subject: `Singapore's top 5 agents this week (CEA data)`,
        html,
        metric: "Weekly Digest",
      },
    ];
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
