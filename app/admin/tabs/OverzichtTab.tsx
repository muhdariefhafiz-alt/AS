import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { SectionHeading, StatCard, buildWeekly, deltaLabel, MS_WEEK } from "../shared";
import { TIER_PRICE, type Tier } from "../../lib/tiers";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function OverzichtTab() {
  const now = Date.now();
  const cutoff8wk = new Date(now - 8 * MS_WEEK).toISOString();

  const [claims8wk, payingAgents, activeEvents, pendingClaims, nsmRes, totalClaimedCount, liqRes] = await Promise.all([
    supabase.from("sg_claim_requests").select("created_at, status").gte("created_at", cutoff8wk),
    supabase
      .from("sg_agents")
      .select("id, subscription_tier, subscription_started_at")
      .in("subscription_tier", ["verified", "professional", "elite"])
      .not("subscription_started_at", "is", null),
    supabase
      .from("sg_funnel_events")
      .select("agent_id, created_at")
      .in("event", ["profile_edit", "dashboard_login"])
      .not("agent_id", "is", null)
      .gte("created_at", cutoff8wk),
    supabase
      .from("sg_claim_requests")
      .select("id, email, status, created_at, agent_id")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.rpc("sg_nsm_weekly", { p_weeks: 8, p_sla_hours: 24 }),
    supabase.from("sg_agents").select("id", { count: "exact", head: true }).eq("claimed", true),
    supabase.rpc("sg_lead_liquidity", { p_days: 30 }),
  ]);

  // North Star: timely first reply is the promise the marketplace makes to
  // sellers. Liquidity: whether leads actually flow to a quote. Both come from
  // aggregate RPCs so they are not truncated by the 1000-row PostgREST cap.
  type NsmRow = { week: string; leads_with_reply: number; timely_leads: number; median_reply_hours: number | null };
  const nsm = (nsmRes.data ?? []) as NsmRow[];
  const nsmLatest = nsm[nsm.length - 1];
  const nsmTimely = nsmLatest?.timely_leads ?? 0;
  const nsmMedian = nsmLatest?.median_reply_hours ?? null;
  const nsmSpark = nsm.map((r) => r.timely_leads ?? 0);
  type LiqRow = { leads: number; shortlisted: number; invited: number; quoted: number; picked: number; median_ttfq_hours: number | null };
  const liq = ((liqRes.data ?? [])[0] ?? { leads: 0, shortlisted: 0, invited: 0, quoted: 0, picked: 0, median_ttfq_hours: null }) as LiqRow;
  const matchRate = liq.leads ? Math.round((liq.invited / liq.leads) * 100) : 0;
  const quoteFill = liq.leads ? Math.round((liq.quoted / liq.leads) * 100) : 0;

  const claimsAll = claims8wk.data ?? [];
  const claimsWeekly = buildWeekly(
    claimsAll.filter((c) => c.status === "verified" || c.status === "approved"),
    8
  );
  const claimsThisWeek = claimsWeekly[claimsWeekly.length - 1] || 0;
  const claimsLastWeek = claimsWeekly[claimsWeekly.length - 2] || 0;

  // Retention numerator must be a subset of the claimed-count denominator, else
  // the percentage can exceed 100%. Intersect the active agents with the claimed
  // set. The lookup is bounded by the (small) active set, so no 1000-row cap risk.
  const activeRows = activeEvents.data ?? [];
  const activeAgentIds = Array.from(
    new Set(activeRows.map((e) => e.agent_id).filter((id): id is number => id != null))
  );
  const claimedActive = new Set<number>();
  if (activeAgentIds.length) {
    const { data: claimedRows } = await supabase
      .from("sg_agents")
      .select("id")
      .eq("claimed", true)
      .in("id", activeAgentIds);
    for (const a of claimedRows ?? []) claimedActive.add(a.id);
  }

  const activeByWeek = new Array(8).fill(null).map(() => new Set<number>());
  for (const e of activeRows) {
    if (!e.agent_id || !claimedActive.has(e.agent_id)) continue;
    const b = Math.floor((now - new Date(e.created_at).getTime()) / MS_WEEK);
    if (b >= 0 && b < 8) activeByWeek[b].add(e.agent_id);
  }
  const activeWeekly = activeByWeek.map((s) => s.size).reverse();
  const activeThisWeek = activeWeekly[activeWeekly.length - 1] || 0;
  const activeLastWeek = activeWeekly[activeWeekly.length - 2] || 0;
  const totalClaimed = totalClaimedCount.count ?? 0;
  const activePct = totalClaimed ? Math.round((activeThisWeek / totalClaimed) * 100) : 0;

  const paying = (payingAgents.data ?? []) as Array<{ subscription_tier: Exclude<Tier, "free">; subscription_started_at: string }>;
  const payingWeekly = buildWeekly(paying.map((p) => ({ created_at: p.subscription_started_at })), 8);
  const payingThisWeek = payingWeekly[payingWeekly.length - 1] || 0;
  const mrr = paying.reduce((s, p) => s + (TIER_PRICE[p.subscription_tier] ?? 0), 0);

  // Build agent name lookup for pending claims
  const agentIds = (pendingClaims.data ?? []).map((c) => c.agent_id).filter(Boolean);
  const agentMap: Record<number, { name: string; slug: string }> = {};
  if (agentIds.length) {
    const { data: as } = await supabase.from("sg_agents").select("id, name, slug").in("id", agentIds);
    for (const a of as ?? []) agentMap[a.id] = { name: a.name, slug: a.slug };
  }

  return (
    <div className="space-y-8">
      <div>
        <SectionHeading title="Marketplace health (North Star)" hint="Timely first reply is the promise; liquidity is whether leads reach a quote." />
        <div className="grid gap-3 md:grid-cols-4">
          <StatCard
            title="Timely first replies / wk"
            value={nsmTimely}
            sparkline={nsmSpark}
            color="#1f44ff"
            sub={nsmMedian != null ? `median first reply ${nsmMedian}h (SLA 24h)` : "awaiting reply data"}
          />
          <StatCard
            title="Match rate (30d)"
            value={`${matchRate}%`}
            color="#2980b9"
            sub={`${liq.invited}/${liq.leads} leads got a reachable invite`}
          />
          <StatCard
            title="Quote-fill (30d)"
            value={`${quoteFill}%`}
            color="#059669"
            sub={`${liq.quoted}/${liq.leads} leads received a quote`}
          />
          <StatCard
            title="Time to first quote"
            value={liq.median_ttfq_hours != null ? `${liq.median_ttfq_hours}h` : "n/a"}
            color="#e67e22"
            sub="median, matched leads"
          />
        </div>
      </div>

      <div>
        <SectionHeading title="Constellation" hint="3 North Star metrics in 1 oogopslag." />
        <div className="grid gap-3 md:grid-cols-3">
          <StatCard
            title="Acquisition (claims / week)"
            value={claimsThisWeek}
            delta={deltaLabel(claimsThisWeek, claimsLastWeek)}
            sparkline={claimsWeekly}
            color="#2980b9"
            sub="verified + approved claims deze week"
          />
          <StatCard
            title="Retention (active / week)"
            value={`${activeThisWeek} / ${totalClaimed} (${activePct}%)`}
            delta={deltaLabel(activeThisWeek, activeLastWeek)}
            sparkline={activeWeekly}
            color="#e67e22"
            sub="actieve claimed dashboards"
          />
          <StatCard
            title="Monetization (paying total)"
            value={paying.length}
            delta={
              payingThisWeek > 0
                ? { text: `+${payingThisWeek} nieuw deze week`, dir: "up" }
                : { text: "geen nieuwe", dir: "flat" }
            }
            sparkline={payingWeekly}
            color="#059669"
            sub={`S$${mrr.toLocaleString()} MRR`}
          />
        </div>
      </div>

      {(pendingClaims.data ?? []).length > 0 && (
        <div>
          <SectionHeading
            title="Pending verifications"
            hint={`${(pendingClaims.data ?? []).length} claim(s) awaiting email click.`}
          />
          <div className="space-y-2">
            {(pendingClaims.data ?? []).map((c) => {
              const a = c.agent_id ? agentMap[c.agent_id] : null;
              return (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-200 bg-amber-50/40 p-3 text-sm"
                >
                  <div>
                    <strong>{c.email}</strong>
                    {a && (
                      <>
                        {" for "}
                        <Link
                          href={`/property-agents/agent/${a.slug}`}
                          target="_blank"
                          className="text-teal-700 hover:underline"
                        >
                          {a.name}
                        </Link>
                      </>
                    )}
                    <span className="ml-2 text-[11px] text-gray-500">
                      {new Date(c.created_at).toLocaleDateString("en-SG")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
