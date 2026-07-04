import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { sendBatchEmails } from "../../../lib/email";

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
  pct >= 90 ? "the top 10%" : pct >= 75 ? "the top 25%" : pct >= 50 ? "the top half" : "your area";

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

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f5f6f8"><tr><td align="center" style="padding:24px 16px">
<table cellpadding="0" cellspacing="0" border="0" width="520" style="background:#fff;border-radius:12px;overflow:hidden">
  <tr><td style="background:#0a1733;padding:24px 32px">
    <p style="margin:0;font-size:18px;font-weight:700;color:#fff">FairComparisons</p>
  </td></tr>
  <tr><td style="padding:32px">
    <p style="margin:0 0 6px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#6b7280">Your standing in ${areaBase}</p>
    <p style="margin:0 0 8px;font-size:24px;font-weight:800;color:#1f44ff">You are in ${band(cur.agent_pct)} in ${areaBase}</p>
    <p style="margin:0 0 4px;font-size:15px;font-weight:600;color:#111827">${movementLine}</p>
    <p style="margin:0 0 24px;font-size:13px;color:#6b7280">Ranked #${cur.agent_rank.toLocaleString("en-SG")} of ${cur.agent_total.toLocaleString("en-SG")} scored agents active in ${areaFull}, on AgentScore.</p>
    <table cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="padding-right:8px">
        <a href="${dashboardUrl}" style="display:inline-block;background:#1f44ff;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">View your dashboard</a>
      </td>
      <td>
        <a href="${profileUrl}" style="display:inline-block;border:1px solid #d1d5db;color:#374151;padding:11px 20px;border-radius:8px;text-decoration:none;font-weight:500;font-size:14px">Public page</a>
      </td>
    </tr></table>
    <p style="margin:24px 0 0;font-size:12px;color:#9ca3af">Computed from official CEA transaction records. Movement is measured month over month.</p>
  </td></tr>
  <tr><td style="padding:20px 32px;background:#f9fafb;border-top:1px solid #e5e7eb">
    <p style="margin:0;font-size:11px;color:#9ca3af">
      Sent to ${agent.claimed_email} because you claimed your profile on FairComparisons.
      <a href="${BASE}/unsubscribe?email=${encodeURIComponent(agent.claimed_email as string)}" style="color:#9ca3af">Unsubscribe</a>
    </p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

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
