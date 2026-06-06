import { createClient } from "@supabase/supabase-js";
import { SectionHeading, StatCard, EmptyState, Pill, MS_DAY } from "../shared";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * Liquidity (Reforge Growth Series > Marketplace Liquidity).
 * Market = primary_area (district). Supply = agents. Demand = profile_view events 30d.
 */

const MIN_SUPPLY = 5; // min agents per district for viable supply
const MIN_DEMAND = 5; // min profile_views per district for viable demand

export async function LiquidityTab() {
  const cutoff30 = new Date(Date.now() - 30 * MS_DAY).toISOString();

  const [agentsRes, viewsRes, waRes, leadsRes] = await Promise.all([
    supabase.from("sg_agents").select("id, primary_area, claimed, subscription_tier"),
    supabase
      .from("sg_funnel_events")
      .select("agent_id, metadata")
      .eq("event", "profile_view")
      .gte("created_at", cutoff30)
      .limit(50000),
    supabase
      .from("sg_funnel_events")
      .select("agent_id")
      .eq("event", "whatsapp_click")
      .gte("created_at", cutoff30)
      .limit(50000),
    supabase
      .from("sg_leads")
      .select("town, district_code, property_type")
      .gte("created_at", cutoff30)
      .limit(50000),
  ]);

  // Seller demand per area (last 30d).
  const leadRows = (leadsRes.data ?? []) as Array<{
    town: string | null;
    district_code: string | null;
    property_type: string;
  }>;
  const sellerDemand = new Map<string, number>();
  for (const l of leadRows) {
    const area = l.town ?? l.district_code ?? "Unknown";
    sellerDemand.set(area, (sellerDemand.get(area) ?? 0) + 1);
  }
  const topSellerAreas = [...sellerDemand.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  const totalSellerLeads = leadRows.length;

  const agents = (agentsRes.data ?? []) as Array<{
    id: number;
    primary_area: string | null;
    claimed: boolean;
    subscription_tier: string | null;
  }>;

  // Supply per district
  const districtSupply = new Map<string, { total: number; claimed: number; paid: number }>();
  for (const a of agents) {
    const area = a.primary_area || "Unknown";
    const prev = districtSupply.get(area) || { total: 0, claimed: 0, paid: 0 };
    prev.total++;
    if (a.claimed) prev.claimed++;
    if (a.subscription_tier && a.subscription_tier !== "free") prev.paid++;
    districtSupply.set(area, prev);
  }

  // Agent id → district lookup
  const agentDistrict = new Map<number, string>();
  for (const a of agents) agentDistrict.set(a.id, a.primary_area || "Unknown");

  // Demand per district (views)
  const cityDemand = new Map<string, number>();
  for (const v of viewsRes.data ?? []) {
    const agentId = (v as { agent_id: number | null }).agent_id;
    if (!agentId) continue;
    const d = agentDistrict.get(agentId);
    if (!d) continue;
    cityDemand.set(d, (cityDemand.get(d) || 0) + 1);
  }

  // WhatsApp clicks per district (tipping point)
  const cityClicks = new Map<string, number>();
  for (const w of waRes.data ?? []) {
    const agentId = (w as { agent_id: number | null }).agent_id;
    if (!agentId) continue;
    const d = agentDistrict.get(agentId);
    if (!d) continue;
    cityClicks.set(d, (cityClicks.get(d) || 0) + 1);
  }

  type Row = { name: string; total: number; claimed: number; paid: number; views: number; clicks: number };
  const rows: Row[] = Array.from(districtSupply.entries())
    .filter(([name]) => name !== "Unknown")
    .map(([name, s]) => ({
      name,
      total: s.total,
      claimed: s.claimed,
      paid: s.paid,
      views: cityDemand.get(name) || 0,
      clicks: cityClicks.get(name) || 0,
    }));

  const totalDistricts = rows.length;
  const viable = rows.filter((r) => r.total >= MIN_SUPPLY && r.views >= MIN_DEMAND).length;
  const supplyOnly = rows.filter((r) => r.total >= MIN_SUPPLY && r.views < MIN_DEMAND).length;
  const demandOnly = rows.filter((r) => r.total < MIN_SUPPLY && r.views >= MIN_DEMAND).length;
  const liquidityPct = totalDistricts ? Math.round((viable / totalDistricts) * 100) : 0;

  const opportunities = rows
    .filter((r) => r.views >= MIN_DEMAND && r.claimed === 0)
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  const deadSupply = rows
    .filter((r) => r.total >= 20 && r.views === 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const balanced = rows
    .filter((r) => r.total >= MIN_SUPPLY && r.views >= MIN_DEMAND)
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  return (
    <div className="space-y-8">
      <div>
        <SectionHeading
          title="Seller demand by area (30d)"
          hint={`${totalSellerLeads} seller leads via /sell, MOP + AVM tools. Where demand concentrates tells you where to deepen agent supply.`}
        />
        {topSellerAreas.length === 0 ? (
          <EmptyState
            title="No seller leads yet"
            hint="Populates as /sell, MOP, and AVM leads come in."
          />
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-5">
            {topSellerAreas.map(([area, count]) => (
              <div
                key={area}
                className="rounded-md border border-gray-200 bg-white p-3"
              >
                <div className="text-[10px] font-bold uppercase tracking-wide text-gray-500">
                  {area}
                </div>
                <div className="mt-1 text-xl font-bold text-teal-700">
                  {count}
                </div>
                <div className="text-[10px] text-gray-400">leads</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <SectionHeading
          title="Liquidity per district"
          hint={`Marketplace werkt pas als ${MIN_SUPPLY}+ agents EN ${MIN_DEMAND}+ views per 30 dagen in hetzelfde district zitten.`}
        />
        <div className="grid gap-3 md:grid-cols-4">
          <StatCard title="Viable districts" value={`${viable} / ${totalDistricts}`} sub={`${liquidityPct}% liquidity ratio`} color="#059669" />
          <StatCard title="Supply-only" value={supplyOnly} sub="agents but no views" color="#d97706" />
          <StatCard title="Demand-only" value={demandOnly} sub="views but not enough agents" color="#dc2626" />
          <StatCard title="Total districts" value={totalDistricts} sub="with at least 1 agent" />
        </div>
      </div>

      <div>
        <SectionHeading
          title="Top 10 opportunity districts"
          hint={`${MIN_DEMAND}+ views 30d but 0 claimed agents. Cold outreach priority.`}
        />
        {opportunities.length === 0 ? (
          <EmptyState title="Nog geen opportunity districts" hint="Wordt zichtbaar zodra demand per district groeit." />
        ) : (
          <OpportunityTable rows={opportunities} />
        )}
      </div>

      <div>
        <SectionHeading
          title="Top 10 balanced districts"
          hint="Supply + demand beide voldoende. Hier moet de upgrade-funnel werken."
        />
        {balanced.length === 0 ? <EmptyState title="Nog geen balanced districts" /> : <OpportunityTable rows={balanced} />}
      </div>

      {deadSupply.length > 0 && (
        <div>
          <SectionHeading
            title="Dead supply (20+ agents, 0 views)"
            hint="Acquisition moet naar deze districts: SEO, content, internal linking."
          />
          <OpportunityTable rows={deadSupply} />
        </div>
      )}
    </div>
  );
}

function OpportunityTable({ rows }: { rows: { name: string; total: number; claimed: number; views: number; clicks: number }[] }) {
  return (
    <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-[10px] font-bold uppercase tracking-widest text-gray-500">
          <tr>
            <th className="px-3 py-2">District</th>
            <th className="px-3 py-2 text-right">Agents</th>
            <th className="px-3 py-2 text-right">Claimed</th>
            <th className="px-3 py-2 text-right">Views 30d</th>
            <th className="px-3 py-2 text-right">WA clicks</th>
            <th className="px-3 py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="border-t border-gray-100">
              <td className="px-3 py-2 font-medium">{r.name}</td>
              <td className="px-3 py-2 text-right">{r.total}</td>
              <td className="px-3 py-2 text-right">{r.claimed}</td>
              <td className="px-3 py-2 text-right">{r.views}</td>
              <td className="px-3 py-2 text-right">{r.clicks}</td>
              <td className="px-3 py-2">
                {r.claimed === 0 && r.views >= 5 ? (
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
