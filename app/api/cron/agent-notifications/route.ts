import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendBatchEmails } from "../../../lib/email";
import { emailShell, p, statCard } from "../../../lib/email-layout";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Weekly agent notification cron.
 * Sends "Your profile was viewed X times" emails to claimed agents.
 * Called by Vercel Cron every Monday at 10am SGT (2am UTC).
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get claimed agents with email
  const { data: claimedAgents } = await supabase
    .from("sg_agents")
    .select("id, name, slug, claimed_email, score, agency_name")
    .eq("claimed", true)
    .not("claimed_email", "is", null);

  if (!claimedAgents || claimedAgents.length === 0) {
    return NextResponse.json({ sent: 0, message: "No claimed agents" });
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Get view counts per agent for the last 7 days
  const { data: viewEvents } = await supabase
    .from("sg_funnel_events")
    .select("agent_id")
    .eq("event", "profile_view")
    .gte("created_at", sevenDaysAgo);

  // Aggregate views per agent
  const viewCounts: Record<number, number> = {};
  for (const ev of viewEvents ?? []) {
    if (ev.agent_id) {
      viewCounts[ev.agent_id] = (viewCounts[ev.agent_id] || 0) + 1;
    }
  }

  // Build emails only for agents who had views
  const emails = claimedAgents
    .filter((a) => viewCounts[a.id] && viewCounts[a.id] > 0)
    .map((agent) => {
      const views = viewCounts[agent.id];
      const profileUrl = `https://fair-comparisons.com/property-agents/agent/${agent.slug}?utm_source=notification&utm_medium=email`;
      const dashboardUrl = `https://fair-comparisons.com/dashboard?utm_source=notification&utm_medium=email`;

      const bodyHtml = [
        p(
          `This week on your FairComparisons profile: <strong>${views}</strong> buyer${views === 1 ? "" : "s"} viewed it.`
        ),
        agent.score ? statCard(String(Math.round(Number(agent.score))), "Your AgentScore") : "",
        p(
          `These are real buyers researching agents in your area. Profiles with a photo, bio, and WhatsApp number get contacted. Incomplete profiles get skipped.`
        ),
        p(
          `<a href="${profileUrl}" style="color:#1f44ff;text-decoration:none;font-weight:500">View your public page</a>`
        ),
      ].join("");

      const html = emailShell({
        preheader: `This week's top agents on the CEA record.`,
        heading: `${views} buyer${views === 1 ? "" : "s"} viewed your profile this week`,
        bodyHtml,
        cta: {
          label: "Edit your profile",
          href: dashboardUrl,
        },
        footerNote: `Sent to ${agent.claimed_email} because you claimed your profile on FairComparisons.`,
        unsubscribeEmail: agent.claimed_email,
      });

      return {
        to: agent.claimed_email,
        subject: `${views} buyer${views === 1 ? "" : "s"} viewed your profile this week`,
        html,
        metric: "Agent Notification",
        properties: { views, agent_slug: agent.slug },
      };
    });

  // Send
  let sent = 0;
  for (let i = 0; i < emails.length; i += 50) {
    const batch = emails.slice(i, i + 50);
    try {
      await sendBatchEmails(batch);
      sent += batch.length;
    } catch (err) {
      console.error(`[agent-notify] Batch ${i} failed:`, err);
    }
  }

  await supabase.from("sg_funnel_events").insert({
    event: "agent_notification_sent",
    metadata: { sent, total_claimed: claimedAgents.length },
  });

  return NextResponse.json({ sent, total_claimed: claimedAgents.length });
}
