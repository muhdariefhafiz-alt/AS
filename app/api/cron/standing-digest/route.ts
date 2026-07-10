import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { sendBatchEmails } from "../../../lib/email";
import { emailShell, p, muted } from "../../../lib/email-layout";

/**
 * Monthly "Your standing" digest.
 *
 * The return-visit loop for claimed agents: each month, after the CEA data
 * refresh + score recompute + snapshot, this emails every opted-in claimed agent
 * their standing in their primary area and their honest month-over-month movement
 * (computed from sg_agent_standing_snapshots, never fabricated).
 *
 * Basis: at claim, agents are told they receive activity reports and can
 * unsubscribe. Gated on claimed + email + not opted out. Runs monthly via cron.
 */
const BASE = "https://fair-comparisons.com";

const MONTHS = ["", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];
const monthName = (d: string) => MONTHS[Number((d || "").slice(5, 7))] || "";
const tc = (s: string) =>
  (s || "").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bHdb\b/g, "HDB").replace(/\bMrt\b/g, "MRT");
const band = (pct: number) =>
  pct >= 90 ? "the top 10%" : pct >= 75 ? "the top 25%" : pct >= 50 ? "the top half" : "the active pool";

type Snap = {
  cea_registration: string;
  snapshot_month: string;
  area_type: string;
  area_name: string;
  agent_rank: number;
  agent_total: number;
  agent_pct: number;
};

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ?dry=1 builds the emails and reports what WOULD send, without sending.
  const dryRun = new URL(req.url).searchParams.get("dry") === "1";
  const sb = supabaseAdmin();

  const { data: agents } = await sb
    .from("sg_agents")
    .select("id, name, slug, claimed_email, cea_registration")
    .eq("claimed", true)
    .is("email_opt_out_at", null)
    .not("claimed_email", "is", null)
    .not("cea_registration", "is", null);

  if (!agents || agents.length === 0) {
    return NextResponse.json({ sent: 0, reason: "no eligible agents" });
  }

  const regs = agents.map((a) => a.cea_registration as string);
  const { data: snapRows } = await sb
    .from("sg_agent_standing_snapshots")
    .select("cea_registration, snapshot_month, area_type, area_name, agent_rank, agent_total, agent_pct")
    .in("cea_registration", regs)
    .order("snapshot_month", { ascending: false });

  // Latest two snapshots per agent (newest first).
  const byReg = new Map<string, Snap[]>();
  for (const s of (snapRows ?? []) as Snap[]) {
    const arr = byReg.get(s.cea_registration) ?? [];
    if (arr.length < 2) arr.push(s);
    byReg.set(s.cea_registration, arr);
  }

  const emails = agents.flatMap((agent) => {
    const snaps = byReg.get(agent.cea_registration as string) ?? [];
    const cur = snaps[0];
    if (!cur) return []; // unranked this month, nothing honest to report
    const prev =
      snaps[1] && snaps[1].area_name === cur.area_name && snaps[1].area_type === cur.area_type
        ? snaps[1]
        : null;
    const delta = prev ? prev.agent_rank - cur.agent_rank : null; // + = moved up

    const areaBase = tc(cur.area_name);
    const areaFull = areaBase + (cur.area_type === "town" ? " HDB" : "");
    const dashboardUrl = `${BASE}/dashboard?utm_source=standing_digest&utm_medium=email`;
    const profileUrl = `${BASE}/property-agents/agent/${agent.slug}?utm_source=standing_digest&utm_medium=email`;

    const movementLine =
      delta == null
        ? `You are on the board in ${areaBase}. We will track your movement from here each month.`
        : delta > 0
        ? `You moved up ${delta} ${delta === 1 ? "place" : "places"} since ${monthName(prev!.snapshot_month)}.`
        : delta < 0
        ? `You moved ${Math.abs(delta)} ${Math.abs(delta) === 1 ? "place" : "places"} since ${monthName(prev!.snapshot_month)}.`
        : `You held your position since ${monthName(prev!.snapshot_month)}.`;

    const subject =
      delta && delta > 0
        ? `You moved up ${delta} in ${areaBase} this month`
        : `Your standing in ${areaBase}: ${band(cur.agent_pct)}`;

    const html = emailShell({
      preheader: `Where you stand this month, and what moves it.`,
      heading: `You are in ${band(cur.agent_pct)} in ${areaBase}`,
      bodyHtml:
        p(
          `On the CEA record for ${areaBase}, you are in <strong>${band(cur.agent_pct)}</strong> of active agents this month.`
        ) +
        p(movementLine) +
        muted(
          `Ranked #${cur.agent_rank.toLocaleString("en-SG")} of ${cur.agent_total.toLocaleString("en-SG")} scored agents active in ${areaFull}, on AgentScore.`
        ) +
        p(
          `What lifts standing: recent seller-side sales in your area, and responding fast to the leads you receive. Both are things you already do. We just make them visible to sellers.`
        ) +
        muted(
          `<a href="${profileUrl}" style="color:#6b7280;text-decoration:underline">See your public page</a>`
        ),
      cta: { label: "See your standing", href: dashboardUrl },
      footerNote: `Sent to ${agent.claimed_email} because you claimed your profile on FairComparisons.`,
      unsubscribeEmail: agent.claimed_email as string,
    });

    return [{
      to: agent.claimed_email as string,
      subject,
      html,
      metric: "Standing Digest",
      properties: { agent_slug: agent.slug, area: cur.area_name, pct: cur.agent_pct, delta },
    }];
  });

  if (dryRun) {
    return NextResponse.json({
      dry_run: true,
      eligible: agents.length,
      would_send: emails.length,
      sample: emails.slice(0, 3).map((e) => ({ to: e.to, subject: e.subject, properties: e.properties })),
    });
  }

  let sent = 0;
  for (let i = 0; i < emails.length; i += 50) {
    try {
      await sendBatchEmails(emails.slice(i, i + 50));
      sent += Math.min(50, emails.length - i);
    } catch (err) {
      console.error(`[standing-digest] batch ${i} failed`, err);
    }
  }

  await sb.from("sg_funnel_events").insert({
    event: "standing_digest_sent",
    metadata: { sent, eligible: agents.length, with_standing: emails.length },
  });

  return NextResponse.json({ sent, eligible: agents.length, with_standing: emails.length });
}
