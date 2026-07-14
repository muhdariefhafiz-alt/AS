import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { SectionHeading, StatCard, Pill, EmptyState, buildWeekly, MS_DAY } from "../shared";
import { TIER_LABEL, TIER_PRICE } from "../../lib/tiers";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function RevenueTab() {
  const cutoff90 = new Date(Date.now() - 90 * MS_DAY).toISOString();
  const cutoff30 = new Date(Date.now() - 30 * MS_DAY).toISOString();

  const [payingAgents, upgradeIntent, claimedCount, checkoutEvents, cancelEvents] = await Promise.all([
    supabase
      .from("sg_agents")
      .select(
        "id, name, slug, primary_area, subscription_tier, subscription_started_at, subscription_ends_at, claimed_at"
      )
      .in("subscription_tier", ["verified", "professional", "elite"])
      .not("subscription_started_at", "is", null)
      .order("subscription_started_at", { ascending: false }),
    supabase
      .from("sg_funnel_events")
      .select("event, created_at, agent_id")
      .in("event", ["checkout_started", "subscription_started"])
      .gte("created_at", cutoff90),
    supabase.from("sg_agents").select("id", { count: "exact", head: true }).eq("claimed", true),
    supabase
      .from("sg_funnel_events")
      .select("id", { count: "exact", head: true })
      .eq("event", "checkout_started")
      .gte("created_at", cutoff30),
    supabase
      .from("sg_funnel_events")
      .select("id", { count: "exact", head: true })
      .eq("event", "subscription_cancelled")
      .gte("created_at", cutoff30),
  ]);

  const paying = (payingAgents.data ?? []) as Array<{
    id: number;
    name: string;
    slug: string;
    primary_area: string | null;
    subscription_tier: string;
    subscription_started_at: string;
    subscription_ends_at: string | null;
    claimed_at: string | null;
  }>;
  const premiumCount = paying.length;
  const tierCount = (t: string) => paying.filter((p) => p.subscription_tier === t).length;
  // Real paid tiers + prices from the single source of truth (app/lib/tiers.ts).
  const paidTiers = Object.keys(TIER_PRICE) as Array<keyof typeof TIER_PRICE>;
  const tierBreakdown = paidTiers.map((t) => `${tierCount(t)} ${TIER_LABEL[t]}`).join(", ");
  const tierHint = paidTiers.map((t) => `${TIER_LABEL[t]} (S$${TIER_PRICE[t]})`).join(", ");

  const mrr = paying.reduce((s, p) => s + (TIER_PRICE[p.subscription_tier as keyof typeof TIER_PRICE] ?? 0), 0);
  const arr = mrr * 12;

  const intentRows = (upgradeIntent.data ?? []) as Array<{
    event: string;
    created_at: string;
    agent_id: number | null;
  }>;
  const intentWeekly = buildWeekly(intentRows, 8);
  // DISTINCT agents who started checkout in the last 30d. Counting unique
  // agent_id for checkout_started (not summing checkout_started +
  // subscription_started rows) avoids double-counting an agent who both
  // showed intent and converted.
  const intent30 = new Set(
    intentRows
      .filter((e) => e.event === "checkout_started" && e.created_at >= cutoff30 && e.agent_id != null)
      .map((e) => e.agent_id)
  ).size;

  const totalClaimed = claimedCount.count ?? 0;
  const conversionPct = totalClaimed ? ((premiumCount / totalClaimed) * 100).toFixed(1) : "0";

  // New paying per week (last 8)
  const newPayingWeekly = buildWeekly(
    paying.map((p) => ({ created_at: p.subscription_started_at })),
    8
  );

  const checkoutCount = checkoutEvents.count ?? 0;
  const cancelCount = cancelEvents.count ?? 0;

  return (
    <div className="space-y-8">
      <div>
        <SectionHeading title="Recurring revenue" hint={`${tierHint} subscriptions.`} />
        <div className="grid gap-3 md:grid-cols-4">
          <StatCard
            title="Paying agents"
            value={premiumCount}
            sub={`${conversionPct}% van ${totalClaimed} claimed`}
            color="#059669"
          />
          <StatCard
            title="MRR"
            value={`S$${mrr.toLocaleString()}`}
            sub={tierBreakdown}
            color="#059669"
            sparkline={newPayingWeekly}
          />
          <StatCard title="ARR run-rate" value={`S$${arr.toLocaleString()}`} sub="mrr × 12" color="#059669" />
          <StatCard
            title="ARPU"
            value={premiumCount ? `S$${Math.round(mrr / premiumCount)}` : "S$0"}
            sub="per paying agent"
          />
        </div>
      </div>

      <div>
        <SectionHeading title="Flow (last 30 days)" />
        <div className="grid gap-3 md:grid-cols-4">
          <StatCard title="Checkout started" value={checkoutCount} sub="upgrade intent" color="#2980b9" />
          <StatCard title="New paying" value={newPayingWeekly[newPayingWeekly.length - 1] || 0} sub="this week" color="#059669" />
          <StatCard title="Cancelled" value={cancelCount} sub="subscription cancelled" color="#dc2626" />
          <StatCard title="Checkout intent 30d" value={intent30} sub="distinct agents, checkout_started" />
        </div>
      </div>

      {paying.length > 0 ? (
        <div>
          <SectionHeading title="Paying agents" />
          <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-[10px] font-bold uppercase tracking-widest text-gray-500">
                <tr>
                  <th className="px-3 py-2">Agent</th>
                  <th className="px-3 py-2">Area</th>
                  <th className="px-3 py-2">Tier</th>
                  <th className="px-3 py-2">Since</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {paying.map((p) => {
                  // The cancel webhook sets subscription_ends_at (and drops the
                  // tier to free); it never writes subscription_canceled_at.
                  const canceled = !!p.subscription_ends_at;
                  return (
                    <tr key={p.id} className="border-t border-gray-100">
                      <td className="px-3 py-2">
                        <Link
                          href={`/property-agents/agent/${p.slug}`}
                          target="_blank"
                          className="hover:text-teal-700"
                        >
                          {p.name}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-gray-500">{p.primary_area || "-"}</td>
                      <td className="px-3 py-2 capitalize">
                        <Pill color={p.subscription_tier === "premium" ? "amber" : "emerald"}>
                          {p.subscription_tier}
                        </Pill>
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-500">
                        {p.subscription_started_at
                          ? new Date(p.subscription_started_at).toLocaleDateString("en-SG")
                          : "-"}
                      </td>
                      <td className="px-3 py-2">
                        {canceled ? (
                          <Pill color="red">Cancelled</Pill>
                        ) : (
                          <Pill color="emerald">Active</Pill>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState title="Nog 0 betalende agents" hint="Claim → upgrade funnel activeren via outreach + dashboard nudges." />
      )}

      {intentWeekly.some((n) => n > 0) && (
        <div>
          <SectionHeading title="Upgrade intent signal (last 8 weeks)" />
          <div className="rounded-md border border-gray-200 bg-white p-4">
            <div className="flex items-end gap-1">
              {intentWeekly.map((n, i) => {
                const max = Math.max(1, ...intentWeekly);
                const h = (n / max) * 60;
                return (
                  <div key={i} className="flex-1 text-center">
                    <div
                      className="mx-auto bg-teal-600"
                      style={{ height: `${h}px`, width: "60%", minHeight: n > 0 ? "3px" : "1px" }}
                    />
                    <div className="mt-1 text-[10px] text-gray-500">{n}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="rounded-md border border-gray-200 bg-white p-5 text-sm text-gray-700">
        <p className="leading-relaxed">
          <strong>Investment thesis check</strong> (per Reforge MGM &gt; CAC &amp; LTV): at <strong>S${mrr}</strong> MRR
          with <strong>{premiumCount}</strong> paying agent{premiumCount === 1 ? "" : "s"}, focus remains on proving the
          first growth loop before investing in CAC. Marginal claim cost is near zero (email outreach). LTV becomes
          meaningful at ~20 paying agents retained 3+ months.
        </p>
      </div>
    </div>
  );
}
