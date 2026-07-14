import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { sendEmail } from "../../../lib/email";
import { emailShell, p, muted, rows, statCard } from "../../../lib/email-layout";
import { TIER_PRICE } from "../../../lib/tiers";

/**
 * Weekly operator ops digest ("know the machine's state without logging in").
 *
 * Every Monday morning this emails hello@fair-comparisons.com one honest health
 * snapshot: acquisition + demand (claims and leads, this week vs last), the
 * North Star (timely first replies), lead liquidity, email deliverability, and
 * revenue. It also derives a short list of human-readable REGRESSION FLAGS so a
 * bad week is legible at a glance. Flags are only raised when the condition is
 * real; a flat or healthy week says so plainly rather than manufacturing alarm.
 *
 * This is an INTERNAL operator email, so it never carries an unsubscribe link
 * (that is only for marketing/lifecycle sends). Auth + ?dry=1 mirror the other
 * cron routes (see app/api/cron/standing-digest/route.ts).
 */
const OPERATOR_EMAIL = "hello@fair-comparisons.com";
const ADMIN_URL = "https://fair-comparisons.com/admin";
const DAY = 24 * 60 * 60 * 1000;
const WEEK = 7 * DAY;
const SLA_HOURS = 24;
// A week over week drop is only worth flagging once it clears the noise floor.
const WOW_DROP_FLAG_PCT = 25;

type NsmRow = {
  week: string;
  leads_with_reply: number;
  timely_leads: number;
  median_reply_hours: number | null;
};

type LiqRow = {
  leads: number;
  shortlisted: number;
  invited: number;
  quoted: number;
  picked: number;
  median_ttfq_hours: number | null;
};

const n = (v: number | null | undefined): number => v ?? 0;

/** Percent change of `cur` vs `prev`. Null when there is no prior baseline. */
function wowPct(cur: number, prev: number): number | null {
  if (prev <= 0) return null;
  return Math.round(((cur - prev) / prev) * 100);
}

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ?dry=1 computes the whole snapshot and returns it WITHOUT sending.
  const dryRun = new URL(req.url).searchParams.get("dry") === "1";
  const sb = supabaseAdmin();

  const now = Date.now();
  const thisWeekStart = new Date(now - WEEK).toISOString();
  const lastWeekStart = new Date(now - 2 * WEEK).toISOString();

  // All counts are head-only exact counts so nothing is truncated by the
  // 1000-row PostgREST cap, and revenue is derived from three tier counts
  // rather than pulling every paying-agent row.
  const [
    claimsThisRes,
    claimsLastRes,
    leadsThisRes,
    leadsLastRes,
    nsmRes,
    liqRes,
    bouncedRes,
    noMxRes,
    outreachFailedRes,
    verifiedRes,
    professionalRes,
    eliteRes,
  ] = await Promise.all([
    sb
      .from("sg_claim_requests")
      .select("id", { count: "exact", head: true })
      .in("status", ["verified", "approved"])
      .gte("created_at", thisWeekStart),
    sb
      .from("sg_claim_requests")
      .select("id", { count: "exact", head: true })
      .in("status", ["verified", "approved"])
      .gte("created_at", lastWeekStart)
      .lt("created_at", thisWeekStart),
    sb
      .from("sg_leads")
      .select("id", { count: "exact", head: true })
      .gte("created_at", thisWeekStart),
    sb
      .from("sg_leads")
      .select("id", { count: "exact", head: true })
      .gte("created_at", lastWeekStart)
      .lt("created_at", thisWeekStart),
    sb.rpc("sg_nsm_weekly", { p_weeks: 8, p_sla_hours: SLA_HOURS }),
    sb.rpc("sg_lead_liquidity", { p_days: 30 }),
    sb
      .from("sg_agents")
      .select("id", { count: "exact", head: true })
      .eq("email_status", "bounced"),
    sb
      .from("sg_agents")
      .select("id", { count: "exact", head: true })
      .eq("email_status", "no_mx"),
    sb
      .from("sg_outreach")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed")
      .gte("created_at", thisWeekStart),
    sb
      .from("sg_agents")
      .select("id", { count: "exact", head: true })
      .eq("subscription_tier", "verified"),
    sb
      .from("sg_agents")
      .select("id", { count: "exact", head: true })
      .eq("subscription_tier", "professional"),
    sb
      .from("sg_agents")
      .select("id", { count: "exact", head: true })
      .eq("subscription_tier", "elite"),
  ]);

  const claimsThis = n(claimsThisRes.count);
  const claimsLast = n(claimsLastRes.count);
  const leadsThis = n(leadsThisRes.count);
  const leadsLast = n(leadsLastRes.count);

  // North Star: timely first reply is the promise the marketplace makes to
  // sellers. Take the most recent tracked week from the aggregate RPC.
  const nsm = (nsmRes.data ?? []) as NsmRow[];
  const nsmLatest = nsm[nsm.length - 1];
  const nsmWeek = nsmLatest?.week ?? null;
  const nsmTimely = n(nsmLatest?.timely_leads);
  const nsmMedian = nsmLatest?.median_reply_hours ?? null;

  // Liquidity: whether leads actually flow through to a reachable invite and a
  // quote. Single-row aggregate over the trailing 30 days.
  const liq = ((liqRes.data ?? [])[0] ?? {
    leads: 0,
    shortlisted: 0,
    invited: 0,
    quoted: 0,
    picked: 0,
    median_ttfq_hours: null,
  }) as LiqRow;
  const matchRate = liq.leads ? Math.round((liq.invited / liq.leads) * 100) : 0;
  const quoteFill = liq.leads ? Math.round((liq.quoted / liq.leads) * 100) : 0;

  const bounced = n(bouncedRes.count);
  const noMx = n(noMxRes.count);
  const outreachFailed7d = n(outreachFailedRes.count);

  const tierCounts = {
    verified: n(verifiedRes.count),
    professional: n(professionalRes.count),
    elite: n(eliteRes.count),
  };
  const payingTotal = tierCounts.verified + tierCounts.professional + tierCounts.elite;
  const mrr =
    tierCounts.verified * TIER_PRICE.verified +
    tierCounts.professional * TIER_PRICE.professional +
    tierCounts.elite * TIER_PRICE.elite;

  // REGRESSION FLAGS. Only raised when the condition is genuinely true; an
  // otherwise flat/zero week gets a single "all healthy" line instead of noise.
  const flags: string[] = [];

  const leadsWow = wowPct(leadsThis, leadsLast);
  if (leadsLast > 0 && leadsThis === 0) {
    flags.push(`0 new leads this week (was ${leadsLast} last week)`);
  } else if (leadsWow != null && leadsWow <= -WOW_DROP_FLAG_PCT) {
    flags.push(`Leads down ${Math.abs(leadsWow)}% week over week (${leadsLast} -> ${leadsThis})`);
  }

  const claimsWow = wowPct(claimsThis, claimsLast);
  if (claimsLast > 0 && claimsThis === 0) {
    flags.push(`0 new claims this week (was ${claimsLast} last week)`);
  } else if (claimsWow != null && claimsWow <= -WOW_DROP_FLAG_PCT) {
    flags.push(`Claims down ${Math.abs(claimsWow)}% week over week (${claimsLast} -> ${claimsThis})`);
  }

  if (nsmLatest && nsmTimely === 0) {
    flags.push("0 timely first replies in the latest tracked week");
  }
  if (nsmMedian != null && nsmMedian > SLA_HOURS) {
    flags.push(`Median first reply ${nsmMedian}h, over the ${SLA_HOURS}h SLA`);
  }

  if (liq.leads > 0 && liq.quoted === 0) {
    flags.push(`0 of ${liq.leads} leads (30d) received a quote`);
  } else if (liq.leads > 0 && matchRate < 50) {
    flags.push(`Match rate ${matchRate}%: under half of leads (30d) got a reachable invite`);
  }

  // Email deliverability: bounced / no-MX are STANDING backlogs (a cumulative
  // count of dead addresses), not week-over-week regressions, so they live in
  // the informational metric line, not the flags. Only a windowed, recent event
  // (outreach sends that failed in the last 7 days) is worth an alert here,
  // otherwise the digest would cry "flag" every week over a static number and
  // train the operator to ignore it.
  if (outreachFailed7d > 0) {
    flags.push(`${outreachFailed7d} outreach send${outreachFailed7d === 1 ? "" : "s"} failed in the last 7 days`);
  }

  const healthy = flags.length === 0;
  const flagLines = healthy
    ? ["All monitored signals are flat or healthy this week. No regressions detected."]
    : flags;

  const snapshot = {
    generated_at: new Date(now).toISOString(),
    window: { this_week_start: thisWeekStart, last_week_start: lastWeekStart },
    claims: { this_week: claimsThis, last_week: claimsLast, wow_pct: claimsWow },
    leads: { this_week: leadsThis, last_week: leadsLast, wow_pct: leadsWow },
    north_star: {
      week: nsmWeek,
      timely_leads: nsmTimely,
      median_reply_hours: nsmMedian,
      sla_hours: SLA_HOURS,
    },
    liquidity: {
      leads: liq.leads,
      invited: liq.invited,
      quoted: liq.quoted,
      match_rate_pct: matchRate,
      quote_fill_pct: quoteFill,
      median_ttfq_hours: liq.median_ttfq_hours,
    },
    email_health: { bounced, no_mx: noMx, outreach_failed_7d: outreachFailed7d },
    revenue: { paying_total: payingTotal, mrr, by_tier: tierCounts },
    flags,
    healthy,
  };

  if (dryRun) {
    return NextResponse.json({ dry_run: true, sent: false, snapshot });
  }

  const wow = (cur: number, prev: number): string => {
    const pct = wowPct(cur, prev);
    if (pct == null) return `${cur} this week (${prev} last week)`;
    const arrow = pct > 0 ? "up" : pct < 0 ? "down" : "flat";
    return `${cur} this week (${prev} last week, ${arrow} ${Math.abs(pct)}%)`;
  };

  const metricLines = [
    `New claims: ${wow(claimsThis, claimsLast)}`,
    `New leads: ${wow(leadsThis, leadsLast)}`,
    `Timely first replies (latest week): ${nsmTimely}${nsmMedian != null ? `, median ${nsmMedian}h reply` : ""}`,
    `Match rate (30d): ${matchRate}% (${liq.invited}/${liq.leads} leads got a reachable invite)`,
    `Quote-fill (30d): ${quoteFill}% (${liq.quoted}/${liq.leads} leads received a quote)`,
    `Email health: ${bounced} bouncing, ${noMx} no-MX, ${outreachFailed7d} failed sends (7d)`,
  ];

  const heading = healthy
    ? "FairComparisons ops digest: healthy week"
    : `FairComparisons ops digest: ${flags.length} flag${flags.length === 1 ? "" : "s"}`;

  const html = emailShell({
    preheader: healthy
      ? `Flat or healthy week. S$${mrr.toLocaleString("en-SG")} MRR, ${payingTotal} paying.`
      : `${flags.length} regression flag${flags.length === 1 ? "" : "s"} this week. Open to review.`,
    heading,
    bodyHtml:
      p(
        `The machine's state this week, so you do not have to log in to see it. ${
          healthy
            ? "Nothing needs your attention today."
            : "The flags below are worth a look."
        }`
      ) +
      statCard(`S$${mrr.toLocaleString("en-SG")}`, `Monthly recurring revenue (${payingTotal} paying)`) +
      muted("Activity and marketplace health") +
      rows(metricLines) +
      muted(healthy ? "Regression check" : "Regression flags") +
      rows(flagLines, !healthy),
    cta: { label: "Open the ops dashboard", href: ADMIN_URL },
    footerNote: "Internal operator digest. Sent every Monday from the ops-digest cron.",
  });

  let sent = false;
  try {
    await sendEmail({
      to: OPERATOR_EMAIL,
      subject: heading,
      html,
      metric: "Ops Digest",
      properties: {
        healthy,
        flags: flags.length,
        leads_this_week: leadsThis,
        claims_this_week: claimsThis,
        mrr,
        paying_total: payingTotal,
      },
    });
    sent = true;
  } catch (err) {
    console.error("[ops-digest] send failed", err);
  }

  return NextResponse.json({ sent, snapshot });
}
