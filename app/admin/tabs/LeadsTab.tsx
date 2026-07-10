import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { SectionHeading, StatCard, Pill, EmptyState, deltaLabel } from "../shared";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Kpis = {
  total_all: number; window_n: number; prior_n: number;
  matched_n: number; unmatched_n: number; avg_shortlist: number;
};
type AgentRow = {
  agent_id: number; name: string; slug: string; area: string | null;
  shortlisted: number; requested: number; top_ranked: number;
};
type SourceRow = { source: string; campaign: string; n: number };
type LeadRow = {
  id: number; created_at: string; town: string | null; district_code: string | null;
  property_type: string | null; timeline: string | null;
  est_value_low: number | null; est_value_high: number | null;
  status: string | null; source: string | null;
  full_name: string | null; email: string | null; phone: string | null; whatsapp: string | null;
  matched: number; requested_agent: string | null;
};

const num = (v: unknown) => Number(v ?? 0);
const tc = (s: string | null) =>
  !s ? "" : s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()).replace(/\bHdb\b/g, "HDB");
const fmtDate = (s: string) =>
  new Date(s).toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" });
const money = (n: number | null) =>
  n == null ? null : n >= 1_000_000 ? `S$${(n / 1_000_000).toFixed(1)}M` : `S$${Math.round(n / 1_000)}k`;
const valueRange = (lo: number | null, hi: number | null) => {
  const a = money(lo), b = money(hi);
  return a && b ? `${a} to ${b}` : a || b || "—";
};
const statusColor = (s: string | null): "blue" | "emerald" | "amber" | "gray" => {
  switch (s) {
    case "picked": case "completed": return "emerald";
    case "invited": case "quoted": return "amber";
    case "declined": case "expired": return "gray";
    default: return "blue"; // shortlisted / new
  }
};

export async function LeadsTab() {
  const [kpiRes, dailyRes, sourceRes, byAgentRes, recentRes] = await Promise.all([
    supabase.rpc("admin_lead_kpis", { p_days: 30 }),
    supabase.rpc("admin_leads_daily", { p_days: 14 }),
    supabase.rpc("admin_leads_by_source", { p_days: 30 }),
    supabase.rpc("admin_leads_by_agent", { p_days: 90, p_limit: 12 }),
    supabase.rpc("admin_recent_leads", { p_limit: 25 }),
  ]);

  const k = (Array.isArray(kpiRes.data) ? kpiRes.data[0] : null) as Kpis | null;
  const totalAll = num(k?.total_all);
  const windowN = num(k?.window_n);
  const priorN = num(k?.prior_n);
  const matched = num(k?.matched_n);
  const unmatched = num(k?.unmatched_n);
  const avgShortlist = num(k?.avg_shortlist);

  const sources = (sourceRes.data ?? []) as SourceRow[];
  const agents = (byAgentRes.data ?? []) as AgentRow[];
  const leads = (recentRes.data ?? []) as LeadRow[];

  // 14-day sparkline, zero-filled.
  const dailyMap = new Map<string, number>(
    ((dailyRes.data ?? []) as { d: string; n: number }[]).map((r) => [r.d, num(r.n)])
  );
  const daily: number[] = [];
  for (let i = 13; i >= 0; i--) {
    daily.push(dailyMap.get(new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10)) ?? 0);
  }

  if (totalAll === 0) {
    return (
      <div className="space-y-8">
        <p className="text-sm text-gray-500">
          First-party seller leads from <code>/sell</code>. This is the trustworthy count, unlike GA4&apos;s{" "}
          <code>generate_lead</code> which is inflated by bots and third-party measurement-ID spam.
        </p>
        <EmptyState title="No seller leads yet" hint="Lights up as sellers complete the /sell flow and get matched to agents." />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <p className="text-sm text-gray-500">
        First-party seller leads from <code>/sell</code>, every one recorded in <code>sg_leads</code> and matched to a
        ranked agent shortlist. This is the trustworthy count, unlike GA4&apos;s <code>generate_lead</code> (inflated by
        bots and third-party measurement-ID spam).
      </p>

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard title="Leads all time" value={totalAll.toLocaleString()} sub={`since the first on record`} color="#2980b9" />
        <StatCard
          title="Leads 30d"
          value={windowN.toLocaleString()}
          delta={deltaLabel(windowN, priorN)}
          sparkline={daily}
          color="#059669"
        />
        <StatCard
          title="Matched to agents"
          value={totalAll ? `${Math.round((matched / totalAll) * 100)}%` : "—"}
          sub={unmatched > 0 ? `${unmatched} had no agent (liquidity gap)` : "every lead reached a shortlist"}
          color="#8e44ad"
          danger={unmatched > 0}
        />
        <StatCard title="Agents per lead" value={avgShortlist} sub="avg shortlist size" color="#e67e22" />
      </div>

      {/* Who's generating leads for which agent */}
      <div>
        <SectionHeading
          title="Leads by agent (90d)"
          hint="Who we are generating leads for. Shortlisted = appeared on a seller's matched list; Requested = the seller asked for them by name; Top = ranked #1."
        />
        {agents.length === 0 ? (
          <EmptyState title="No agent matches in range" hint="Populates as leads get shortlisted." />
        ) : (
          <div className="mt-3 overflow-x-auto rounded-md border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-[10px] uppercase tracking-widest text-gray-500">
                  <th className="px-4 py-2.5 text-left">Agent</th>
                  <th className="px-4 py-2.5 text-left">Area</th>
                  <th className="px-4 py-2.5 text-right">Shortlisted</th>
                  <th className="px-4 py-2.5 text-right">Requested</th>
                  <th className="px-4 py-2.5 text-right">Top ranked</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((a) => (
                  <tr key={a.agent_id} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-2.5">
                      <Link href={`/property-agents/agent/${a.slug}`} className="font-medium text-gray-900 hover:text-teal-700">
                        {tc(a.name)}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">{tc(a.area) || "—"}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-gray-900">{num(a.shortlisted)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-gray-600">{num(a.requested) || "—"}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-gray-600">{num(a.top_ranked) || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Source attribution */}
      <div>
        <SectionHeading title="Where leads come from (30d)" hint="Source and campaign tag captured at submit. Fills out as paid + referral channels get tagged." />
        <div className="mt-3 flex flex-wrap gap-2">
          {sources.length === 0 ? (
            <span className="text-sm text-gray-500">No leads in the last 30 days.</span>
          ) : (
            sources.map((s) => (
              <span key={`${s.source}-${s.campaign}`} className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700">
                <span className="font-medium text-gray-900">{s.source}</span>
                {s.campaign !== "(none)" && <span className="text-gray-500"> / {s.campaign}</span>}
                <span className="ml-2 tabular-nums font-semibold text-teal-700">{num(s.n)}</span>
              </span>
            ))
          )}
        </div>
      </div>

      {/* Retro ledger: every previous lead */}
      <div>
        <SectionHeading title="Every lead generated" hint="The full retro ledger, newest first. Contact details are shown for follow-up." />
        <div className="mt-3 overflow-x-auto rounded-md border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-[10px] uppercase tracking-widest text-gray-500">
                <th className="px-4 py-2.5 text-left">Date</th>
                <th className="px-4 py-2.5 text-left">Seller</th>
                <th className="px-4 py-2.5 text-left">Contact</th>
                <th className="px-4 py-2.5 text-left">Area</th>
                <th className="px-4 py-2.5 text-left">Property</th>
                <th className="px-4 py-2.5 text-left">Est. value</th>
                <th className="px-4 py-2.5 text-left">Timeline</th>
                <th className="px-4 py-2.5 text-right">Agents</th>
                <th className="px-4 py-2.5 text-left">Requested</th>
                <th className="px-4 py-2.5 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id} className="border-b border-gray-100 last:border-0 align-top">
                  <td className="px-4 py-2.5 whitespace-nowrap text-gray-600">{fmtDate(l.created_at)}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-900">{l.full_name ?? "—"}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-600">
                    {l.email && <div>{l.email}</div>}
                    {(l.whatsapp || l.phone) && <div className="font-mono">{l.whatsapp || l.phone}</div>}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">{tc(l.town) || l.district_code || "—"}</td>
                  <td className="px-4 py-2.5 text-gray-600">{tc(l.property_type) || "—"}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-gray-600">{valueRange(l.est_value_low, l.est_value_high)}</td>
                  <td className="px-4 py-2.5 text-gray-600">{tc(l.timeline) || "—"}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-gray-900">{num(l.matched)}</td>
                  <td className="px-4 py-2.5 text-gray-600">{l.requested_agent ? tc(l.requested_agent) : "—"}</td>
                  <td className="px-4 py-2.5"><Pill color={statusColor(l.status)}>{l.status ?? "new"}</Pill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
