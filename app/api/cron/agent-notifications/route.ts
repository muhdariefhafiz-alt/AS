import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendBatchEmails } from "../../../lib/email";
import { unsubscribeUrl } from "../../../lib/unsubscribe";

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

      const html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f9fafb">
<tr><td align="center" style="padding:24px 16px">
<table cellpadding="0" cellspacing="0" border="0" width="520" style="background:#ffffff;border-radius:12px;overflow:hidden">

  <tr><td style="background:#0a1733;padding:24px 32px">
    <p style="margin:0;font-size:18px;font-weight:700;color:#fff">FairComparisons</p>
  </td></tr>

  <tr><td style="padding:32px">
    <p style="margin:0 0 24px;font-size:22px;font-weight:800;color:#111827">
      <span style="color:#1f44ff">${views}</span> buyer${views === 1 ? "" : "s"} viewed your profile this week
    </p>

    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#eef1ff;border-radius:8px">
    <tr>
      <td style="padding:16px" width="50%" align="center">
        <p style="margin:0;font-size:28px;font-weight:800;color:#1f44ff">${views}</p>
        <p style="margin:4px 0 0;font-size:11px;color:#6b7280">Profile views</p>
      </td>
      <td style="padding:16px" width="50%" align="center">
        <p style="margin:0;font-size:28px;font-weight:800;color:#111827">${agent.score ? Math.round(Number(agent.score)) : "-"}</p>
        <p style="margin:4px 0 0;font-size:11px;color:#6b7280">Your AgentScore</p>
      </td>
    </tr>
    </table>

    <p style="margin:24px 0 16px;font-size:14px;color:#374151;line-height:1.6">
      These are real buyers researching agents in your area. Profiles with a photo, bio, and WhatsApp number get contacted. Incomplete profiles get skipped.
    </p>

    <table cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="padding-right:8px">
        <a href="${dashboardUrl}" style="display:inline-block;background:#1f44ff;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
          Edit your profile
        </a>
      </td>
      <td>
        <a href="${profileUrl}" style="display:inline-block;border:1px solid #d1d5db;color:#374151;padding:11px 20px;border-radius:8px;text-decoration:none;font-weight:500;font-size:14px">
          View public page
        </a>
      </td>
    </tr></table>
  </td></tr>

  <tr><td style="padding:20px 32px;background:#f9fafb;border-top:1px solid #e5e7eb">
    <p style="margin:0;font-size:11px;color:#9ca3af">
      Sent to ${agent.claimed_email} because you claimed your profile on FairComparisons.
      <a href="${unsubscribeUrl(agent.claimed_email)}" style="color:#9ca3af">Unsubscribe</a>
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>`;

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
