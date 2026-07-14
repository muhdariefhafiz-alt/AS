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

  const [claims8wk, payingAgents, activeEvents, pendingClaims, recentFeedback, totalClaimedCount] = await Promise.all([
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
    supabase
      .from("dashboard_feedback")
      .select("id, office_name, category, body, created_at")
      .eq("status", "new")
      .order("created_at", { ascending: false })
      .limit(3),
    supabase.from("sg_agents").select("id", { count: "exact", head: true }).eq("claimed", true),
  ]);

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

      {(recentFeedback.data ?? []).length > 0 && (
        <div>
          <SectionHeading title="Fresh feedback" hint="Last 3 agent feedback items marked 'new'." />
          <div className="space-y-2">
            {(recentFeedback.data ?? []).map((f) => (
              <div key={f.id} className="rounded-md border border-purple-200 bg-purple-50/40 p-3 text-sm">
                <div className="flex items-baseline justify-between gap-2">
                  <span>
                    <strong>{f.office_name || "Unknown"}</strong>{" "}
                    <span className="rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-[10px] font-bold uppercase text-purple-700">
                      {f.category}
                    </span>
                  </span>
                  <span className="text-[11px] text-gray-500">{new Date(f.created_at).toLocaleString("en-SG")}</span>
                </div>
                <p className="mt-1 text-gray-600">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
