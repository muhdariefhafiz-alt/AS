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
    .select("id, name, slug, claimed_email, score, agency_name, cea_registration")
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

  // Deal Radar prospects for agents who set farm areas: the weekly digest hook.
  // Only queries agents who actually have farm areas, so this stays cheap.
  const escapeHtml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const { data: farmRows } = await supabase.from("sg_agent_farm_areas").select("agent_cea_no");
  const farmCeas = new Set((farmRows ?? []).map((r) => r.agent_cea_no as string));
  const prospectsByCea: Record<string, { title: string; note: string }[]> = {};
  await Promise.all(
    claimedAgents
      .filter((a) => a.cea_registration && farmCeas.has(a.cea_registration))
      .map(async (a) => {
        const { data } = await supabase.rpc("deal_radar", { p_cea: a.cea_registration, p_window_days: 21, p_limit: 6 });
        const rows = (data as { title: string; note: string }[] | null) ?? [];
        if (rows.length) prospectsByCea[a.cea_registration as string] = rows.slice(0, 4);
      })
  );

  const dashboardUrl = `https://fair-comparisons.com/dashboard?utm_source=notification&utm_medium=email`;

  // Build emails for agents who had profile views OR have farm-area prospects.
  const emails = claimedAgents
    .map((agent) => {
      const views = viewCounts[agent.id] || 0;
      const prospects: { title: string; note: string }[] =
        (agent.cea_registration ? prospectsByCea[agent.cea_registration] : undefined) ?? [];
      if (views === 0 && prospects.length === 0) return null;

      const profileUrl = `https://fair-comparisons.com/property-agents/agent/${agent.slug}?utm_source=notification&utm_medium=email`;

      const viewsHtml =
        views > 0
          ? [
              p(`This week on your FairComparisons profile: <strong>${views}</strong> buyer${views === 1 ? "" : "s"} viewed it.`),
              agent.score ? statCard(String(Math.round(Number(agent.score))), "Your AgentScore") : "",
            ].join("")
          : "";

      const prospectsHtml = prospects.length
        ? p(`<strong>Fresh prospects in your farm area:</strong>`) +
          `<ul style="margin:6px 0 0;padding-left:18px;color:#334155;font-size:14px;line-height:1.65">` +
          prospects.map((pr) => `<li>${escapeHtml(pr.title)} &mdash; ${escapeHtml(pr.note)}</li>`).join("") +
          `</ul>` +
          p(`<a href="${dashboardUrl}" style="color:#1f44ff;text-decoration:none;font-weight:500">Open Deal Radar &rarr;</a>`)
        : "";

      const closer = p(
        views > 0
          ? `These are real buyers researching agents in your area. Complete profiles get contacted; incomplete ones get skipped. <a href="${profileUrl}" style="color:#1f44ff;text-decoration:none">View your public page</a>.`
          : `Owners reaching their MOP and recent sales near your farm area, built from real CEA, URA and HDB records.`
      );

      const heading =
        views > 0
          ? `${views} buyer${views === 1 ? "" : "s"} viewed your profile this week`
          : `${prospects.length} fresh prospect${prospects.length === 1 ? "" : "s"} in your farm area`;

      const html = emailShell({
        preheader: `Your weekly FairComparisons summary.`,
        heading,
        bodyHtml: viewsHtml + prospectsHtml + closer,
        cta: { label: "Open your dashboard", href: dashboardUrl },
        footerNote: `Sent to ${agent.claimed_email} because you claimed your profile on FairComparisons.`,
        unsubscribeEmail: agent.claimed_email,
      });

      return {
        to: agent.claimed_email as string,
        subject: heading,
        html,
        metric: "Agent Notification",
        properties: { views, prospects: prospects.length, agent_slug: agent.slug },
      };
    })
    .filter((e): e is NonNullable<typeof e> => e !== null);

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
