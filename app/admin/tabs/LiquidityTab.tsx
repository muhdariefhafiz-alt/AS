import { createClient } from "@supabase/supabase-js";
import { SectionHeading, StatCard, EmptyState, Pill } from "../shared";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Liquidity (Reforge Growth Series > Marketplace Liquidity).
 * Market = primary_area (district). Supply = agents. "Demand" here is agent
 * profile-view popularity (a supply-side signal), plus real seller-lead demand
 * from /sell. Aggregation is done server-side via RPCs: pulling agent + event
 * rows into JS silently truncated at PostgREST's 1000-row cap (supply and
 * demand were ~5x undercounted and nondeterministic).
 */

const MIN_SUPPLY = 5; // min agents per district for viable supply
const MIN_DEMAND = 5; // min profile_views per district for viable demand

type LiqRow = { area: string; agents_total: number; agents_claimed: number; agents_paid: number; views_30d: number; wa_clicks_30d: number };
type Row = { name: string; total: number; claimed: number; paid: number; views: number; clicks: number; leads: number };

export async function LiquidityTab() {
  const [liqRes, demandRes] = await Promise.all([
    supabase.rpc("sg_liquidity_by_district"),
    supabase.rpc("sg_seller_demand_by_area"),
  ]);

  const liq = ((liqRes.data ?? []) as LiqRow[]).filter((r) => r.area !== "Unknown");
  const demand = (demandRes.data ?? []) as { area: string; leads_30d: number }[];

  const sellerDemand = new Map(demand.map((d) => [d.area, d.leads_30d]));
  const topSellerAreas = [...sellerDemand.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  const totalSellerLeads = demand.reduce((s, d) => s + d.leads_30d, 0);

  const rows: Row[] = liq.map((r) => ({
    name: r.area,
    total: r.agents_total,
    claimed: r.agents_claimed,
    paid: r.agents_paid,
    views: r.views_30d,
    clicks: r.wa_clicks_30d,
    leads: sellerDemand.get(r.area) ?? 0,
  }));

  const totalDistricts = rows.length;
  const viable = rows.filter((r) => r.total >= MIN_SUPPLY && r.views >= MIN_DEMAND).length;
  const supplyOnly = rows.filter((r) => r.total >= MIN_SUPPLY && r.views < MIN_DEMAND).length;
  const demandOnly = rows.filter((r) => r.total < MIN_SUPPLY && r.views >= MIN_DEMAND).length;
  const liquidityPct = totalDistricts ? Math.round((viable / totalDistricts) * 100) : 0;

  // Opportunity = real seller demand (or strong view demand) with thin claimed
  // supply. Rank leads first (real demand) then views; the old claimed==0 boolean
  // gave no signal because only ~1 agent is claimed platform-wide.
  const opportunities = rows
    .filter((r) => (r.leads > 0 || r.views >= MIN_DEMAND) && r.claimed < Math.max(1, Math.ceil(r.total * 0.05)))
    .sort((a, b) => b.leads - a.leads || b.views - a.views)
    .slice(0, 10);

  const deadSupply = rows.filter((r) => r.total >= 20 && r.views === 0).sort((a, b) => b.total - a.total).slice(0, 10);
  const balanced = rows.filter((r) => r.total >= MIN_SUPPLY && r.views >= MIN_DEMAND).sort((a, b) => b.views - a.views).slice(0, 10);

  return (
    <div className="space-y-8">
      <div>
        <SectionHeading
          title="Seller demand by area (30d)"
          hint={`${totalSellerLeads} seller leads via /sell, MOP + AVM tools. Where demand concentrates tells you where to deepen agent supply.`}
        />
        {topSellerAreas.length === 0 ? (
          <EmptyState title="No seller leads yet" hint="Populates as /sell, MOP, and AVM leads come in." />
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-5">
            {topSellerAreas.map(([area, count]) => (
              <div key={area} className="rounded-md border border-gray-200 bg-white p-3">
                <div className="text-[10px] font-bold uppercase tracking-wide text-gray-500">{area}</div>
                <div className="mt-1 text-xl font-bold text-teal-700">{count}</div>
                <div className="text-[10px] text-gray-400">leads</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <SectionHeading
          title="Liquidity per district"
          hint={`Viable = ${MIN_SUPPLY}+ agents AND ${MIN_DEMAND}+ profile views (supply-side popularity) in the same district over 30 days.`}
        />
        <div className="grid gap-3 md:grid-cols-4">
          <StatCard title="Viable districts" value={`${viable} / ${totalDistricts}`} sub={`${liquidityPct}% liquidity ratio`} color="#059669" />
          <StatCard title="Supply-only" value={supplyOnly} sub="agents but few views" color="#d97706" />
          <StatCard title="Demand-only" value={demandOnly} sub="views but too few agents" color="#dc2626" />
          <StatCard title="Total districts" value={totalDistricts} sub="with at least 1 agent" />
        </div>
      </div>

      <div>
        <SectionHeading title="Top 10 opportunity districts" hint="Seller/view demand with thin claimed supply. Cold-outreach priority." />
        {opportunities.length === 0 ? (
          <EmptyState title="No opportunity districts yet" hint="Appears as per-district demand grows." />
        ) : (
          <OpportunityTable rows={opportunities} />
        )}
      </div>

      <div>
        <SectionHeading title="Top 10 balanced districts" hint="Supply + demand both sufficient. This is where the upgrade funnel should work." />
        {balanced.length === 0 ? <EmptyState title="No balanced districts yet" /> : <OpportunityTable rows={balanced} />}
      </div>

      {deadSupply.length > 0 && (
        <div>
          <SectionHeading title="Dead supply (20+ agents, 0 views)" hint="Acquisition should target these: SEO, content, internal linking." />
          <OpportunityTable rows={deadSupply} />
        </div>
      )}
    </div>
  );
}

function OpportunityTable({ rows }: { rows: Row[] }) {
  return (
    <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-[10px] font-bold uppercase tracking-widest text-gray-500">
          <tr>
            <th className="px-3 py-2">District</th>
            <th className="px-3 py-2 text-right">Agents</th>
            <th className="px-3 py-2 text-right">Claimed</th>
            <th className="px-3 py-2 text-right">Leads 30d</th>
            <th className="px-3 py-2 text-right">Views 30d</th>
            <th className="px-3 py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="border-t border-gray-100">
              <td className="px-3 py-2 font-medium">{r.name}</td>
              <td className="px-3 py-2 text-right">{r.total}</td>
              <td className="px-3 py-2 text-right">{r.claimed}</td>
              <td className="px-3 py-2 text-right">{r.leads}</td>
              <td className="px-3 py-2 text-right">{r.views}</td>
              <td className="px-3 py-2">
                {r.claimed === 0 && (r.leads > 0 || r.views >= 5) ? (
                  <Pill color="amber">Opportunity</Pill>
                ) : r.total >= 5 && r.views >= 5 ? (
                  <Pill color="emerald">Balanced</Pill>
                ) : r.views === 0 ? (
                  <Pill color="gray">Dead</Pill>
                ) : (
                  <Pill color="blue">Building</Pill>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
