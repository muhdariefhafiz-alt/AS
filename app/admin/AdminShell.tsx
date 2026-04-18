"use client";

import { useState } from "react";
import Link from "next/link";

// --- shared types ---

type Delta = { pct: string; dir: "up" | "down" | "flat" };

export type AdminData = {
  session: { email: string };
  outcomes: {
    views7: number;
    viewsDelta: Delta;
    wauAgents: number;
    profileEdit7: number;
    payingCount: number;
    mrr: number;
    mrrPrev: number;
    liquidityPct: number;
    liquidityMarkets: number;
    totalMarkets: number;
    northStar: number;
  };
  liquidity: {
    views7: number;
    waClicks7: number;
    overallRate: number;
    byDistrict: Array<{ district: string; views: number; clicks: number; rate: number; claimed: number }>;
    searches7: number;
    searchesWithResults: number;
  };
  funnel: {
    stages: Array<{ label: string; value: number; key: string }>;
    bannerToSubmit: number;
    submitToVerified: number;
    rejected: number;
    emailLoop: { sent: number; opened: number; clicked: number; claimedAfter: number };
  };
  supply: {
    totalAgents: number;
    claimedCount: number;
    pendingClaims: number;
    claimedThisWeek: number;
    ahaAgents: number;
    complete: number;
    completionRate: number;
    dashboardLogins7: number;
    agentsByTier: { free: number; pro: number; premium: number };
    topUnclaimedByViews: Array<{ id: number; name: string; slug: string; score: number | null; primary_area: string | null; agency_name: string | null; views: number }>;
    topAgencies: Array<{ name: string; total: number; claimed: number; paid: number; claimRate: number }>;
  };
  seo: {
    totalClicks7: number;
    totalImpressions7: number;
    ctr: number;
    avgPosition: number;
    totalClicksPrev: number;
    indexedPages: number;
    indexationIssues: number;
    topQueries: Array<{ query: string; clicks: number; impressions: number; position: number; ctr: number }>;
    topPages: Array<{ page: string; clicks: number; impressions: number; position: number }>;
    rankTracking: Array<{ keyword: string; rank: number | null; checked_at: string }>;
  };
  ops: {
    pendingClaims: number;
    rejectedClaims30: number;
    unsubscribes30: number;
    staleScrapes: number;
    recentCronEvents: Array<{ event: string; created_at: string; metadata: Record<string, unknown> }>;
    emailQueueBacklog: number;
  };
  revenue: {
    mrr: number;
    proCount: number;
    premiumCount: number;
    payingCount: number;
    arpu: number;
    claimedToPaidRate: number;
    churnedLast30d: number;
    newPayingLast30d: number;
    upgradesByTier: Array<{ tier: string; count: number }>;
  };
  recentClaims: Array<{ id: number; email: string; status: string; created_at: string; agent_id: number }>;
};

type TabKey = "overzicht" | "liquidity" | "funnel" | "supply" | "seo" | "ops" | "revenue";

const TABS: Array<{ key: TabKey; label: string; emoji: string }> = [
  { key: "overzicht", label: "Overzicht", emoji: "◆" },
  { key: "liquidity", label: "Liquidity", emoji: "◈" },
  { key: "funnel", label: "Funnel", emoji: "▼" },
  { key: "supply", label: "Supply", emoji: "●" },
  { key: "seo", label: "SEO", emoji: "↗" },
  { key: "ops", label: "Ops", emoji: "⚙" },
  { key: "revenue", label: "Revenue", emoji: "S$" },
];

// --- helpers ---

function fmt(n: number): string {
  return n.toLocaleString();
}

function pct(n: number, decimals = 1): string {
  return `${n.toFixed(decimals)}%`;
}

function currency(n: number): string {
  return `S$${Math.round(n).toLocaleString()}`;
}

function deltaClass(dir: Delta["dir"]): string {
  return dir === "up" ? "text-green-600" : dir === "down" ? "text-red-600" : "text-gray-400";
}

// --- shared UI components ---

function Card({
  label,
  value,
  sub,
  delta,
  size = "md",
}: {
  label: string;
  value: string | number;
  sub?: string;
  delta?: Delta;
  size?: "sm" | "md" | "lg";
}) {
  const pad = size === "lg" ? "p-5" : size === "sm" ? "p-3" : "p-4";
  const valueSize = size === "lg" ? "text-3xl" : size === "sm" ? "text-lg" : "text-xl";
  return (
    <div className={`rounded-xl border border-gray-200 bg-white ${pad}`}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
      <div className="mt-1.5 flex items-baseline gap-2">
        <p className={`font-extrabold text-gray-900 ${valueSize}`}>{value}</p>
        {delta && <span className={`text-xs font-semibold ${deltaClass(delta.dir)}`}>{delta.pct}</span>}
      </div>
      {sub && <p className="mt-1 text-[11px] text-gray-500">{sub}</p>}
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="mb-4">
      <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
    </header>
  );
}

function Block({ children }: { children: React.ReactNode }) {
  return <section className="mb-8">{children}</section>;
}

function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

function Th({ children, right }: { children?: React.ReactNode; right?: boolean }) {
  return (
    <th className={`bg-gray-50 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-gray-500 ${right ? "text-right" : "text-left"}`}>
      {children}
    </th>
  );
}

function Td({ children, right, mono }: { children?: React.ReactNode; right?: boolean; mono?: boolean }) {
  return (
    <td className={`border-t border-gray-100 px-4 py-2.5 ${right ? "text-right" : ""} ${mono ? "font-mono text-xs" : ""}`}>
      {children}
    </td>
  );
}

// --- tab panels ---

function OverzichtTab({ d }: { d: AdminData }) {
  return (
    <>
      <Block>
        <SectionHeader
          title="North Star"
          subtitle="Weekly MRR-contributing claimed agents (claimed + upgraded in last 30d)"
        />
        <div className="rounded-xl border-2 border-teal-300 bg-teal-50 p-6">
          <p className="text-[11px] font-bold uppercase tracking-widest text-teal-700">Claimed agents that upgraded</p>
          <p className="mt-2 text-5xl font-extrabold text-teal-700">{d.outcomes.northStar}</p>
          <p className="mt-1 text-xs text-teal-800">MRR contribution this period</p>
        </div>
      </Block>

      <Block>
        <SectionHeader title="Outcome metrics" subtitle="Per growth model pillar (acquisition, retention, monetization)" />
        <div className="grid gap-3 md:grid-cols-3">
          <Card label="Consumer sessions (7d)" value={fmt(d.outcomes.views7)} sub="Profile views" delta={d.outcomes.viewsDelta} size="lg" />
          <Card label="WAU claimed agents" value={fmt(d.outcomes.wauAgents)} sub={`${d.outcomes.profileEdit7} edits this week`} size="lg" />
          <Card label="Paying agents" value={fmt(d.outcomes.payingCount)} sub={`${currency(d.outcomes.mrr)} MRR`} size="lg" />
        </div>
      </Block>

      <Block>
        <SectionHeader title="Health indicators" />
        <div className="grid gap-3 md:grid-cols-3">
          <Card
            label="Liquidity"
            value={pct(d.outcomes.liquidityPct)}
            sub={`${d.outcomes.liquidityMarkets} of ${d.outcomes.totalMarkets} markets above 40% tipping point`}
          />
          <Card
            label="Funnel health"
            value={pct(d.funnel.submitToVerified, 1)}
            sub="Submit to verified rate (30d)"
          />
          <Card
            label="MRR delta"
            value={currency(d.outcomes.mrr - d.outcomes.mrrPrev)}
            sub={`vs S$${d.outcomes.mrrPrev} last period`}
          />
        </div>
      </Block>
    </>
  );
}

function LiquidityTab({ d }: { d: AdminData }) {
  return (
    <>
      <Block>
        <SectionHeader
          title="Marketplace liquidity"
          subtitle="% of consumer profile views that result in a WhatsApp click, per market (district × segment). Tipping point: 40% (needs validation against growth correlation)."
        />
        <div className="grid gap-3 md:grid-cols-4">
          <Card label="Profile views (7d)" value={fmt(d.liquidity.views7)} />
          <Card label="WhatsApp clicks (7d)" value={fmt(d.liquidity.waClicks7)} />
          <Card label="Overall liquidity" value={pct(d.liquidity.overallRate, 2)} sub="WA clicks / views" />
          <Card label="Consumer searches (7d)" value={fmt(d.liquidity.searches7)} sub={`${d.liquidity.searchesWithResults} with results`} />
        </div>
      </Block>

      <Block>
        <SectionHeader title="By district" subtitle="Granular supply unit. Demand rarely switches districts." />
        <Table>
          <thead>
            <tr>
              <Th>District / Area</Th>
              <Th right>Claimed agents</Th>
              <Th right>Views (30d)</Th>
              <Th right>WA clicks (30d)</Th>
              <Th right>Liquidity</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {d.liquidity.byDistrict.length === 0 && (
              <tr>
                <Td>
                  <span className="text-gray-400">No district-tagged events yet. Ensure profile_view events include metadata.primary_area.</span>
                </Td>
                <Td right>0</Td>
                <Td right>0</Td>
                <Td right>0</Td>
                <Td right>0%</Td>
                <Td>-</Td>
              </tr>
            )}
            {d.liquidity.byDistrict.map((m) => (
              <tr key={m.district}>
                <Td>{m.district || "Unknown"}</Td>
                <Td right>{m.claimed}</Td>
                <Td right>{m.views}</Td>
                <Td right>{m.clicks}</Td>
                <Td right>
                  <span className={m.rate >= 40 ? "font-bold text-teal-600" : m.rate >= 20 ? "text-amber-600" : "text-red-500"}>
                    {pct(m.rate, 1)}
                  </span>
                </Td>
                <Td>
                  {m.rate >= 40 ? (
                    <span className="rounded bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-700">liquid</span>
                  ) : m.rate >= 20 ? (
                    <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">warming</span>
                  ) : (
                    <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">cold</span>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
        <p className="mt-3 text-xs text-gray-500">
          Framework: Growth Series &gt; Marketplace Liquidity (Dan Hockenmaier). Tipping point is the minimum demand value threshold that powers the flywheel. Validate 40% against correlation with WAU claimed agents once you have 10+ districts with traffic.
        </p>
      </Block>
    </>
  );
}

function FunnelTab({ d }: { d: AdminData }) {
  const max = Math.max(1, ...d.funnel.stages.map((s) => s.value));
  return (
    <>
      <Block>
        <SectionHeader title="Claim funnel" subtitle="Last 30 days. Per stage: absolute + conversion from previous." />
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="space-y-3">
            {d.funnel.stages.map((s, i) => {
              const prev = i > 0 ? d.funnel.stages[i - 1].value : null;
              const rate = prev && prev > 0 ? ((s.value / prev) * 100).toFixed(1) : null;
              const w = (s.value / max) * 100;
              return (
                <div key={s.key}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-gray-700">{s.label}</span>
                    <span className="text-gray-500">
                      <strong className="text-gray-900">{fmt(s.value)}</strong>
                      {rate && <span className="ml-2 text-gray-400">{rate}% of prev</span>}
                    </span>
                  </div>
                  <div className="mt-1 h-5 overflow-hidden rounded bg-gray-100">
                    <div className="h-full bg-teal-600" style={{ width: `${Math.max(2, w)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-gray-100 pt-4 text-xs text-gray-600">
            <span>Banner to submit: <strong className="text-gray-900">{pct(d.funnel.bannerToSubmit, 2)}</strong></span>
            <span>Submit to verified: <strong className="text-gray-900">{pct(d.funnel.submitToVerified, 1)}</strong></span>
            <span>Rejected (30d): <strong className="text-gray-900">{d.funnel.rejected}</strong></span>
          </div>
        </div>
      </Block>

      <Block>
        <SectionHeader title="Email outreach loop" subtitle="Agent acquisition via outreach. Cumulative from sg_outreach table." />
        <div className="grid gap-3 md:grid-cols-4">
          <Card label="Emails sent" value={fmt(d.funnel.emailLoop.sent)} />
          <Card
            label="Opened"
            value={fmt(d.funnel.emailLoop.opened)}
            sub={d.funnel.emailLoop.sent > 0 ? pct((d.funnel.emailLoop.opened / d.funnel.emailLoop.sent) * 100) : "-"}
          />
          <Card
            label="Clicked"
            value={fmt(d.funnel.emailLoop.clicked)}
            sub={d.funnel.emailLoop.opened > 0 ? pct((d.funnel.emailLoop.clicked / d.funnel.emailLoop.opened) * 100) + " of opened" : "-"}
          />
          <Card
            label="Claimed after"
            value={fmt(d.funnel.emailLoop.claimedAfter)}
            sub={d.funnel.emailLoop.sent > 0 ? pct((d.funnel.emailLoop.claimedAfter / d.funnel.emailLoop.sent) * 100) + " of sent" : "-"}
          />
        </div>
        <p className="mt-3 text-xs text-gray-500">
          Framework: Mastering Growth Marketing &gt; Loops Not Funnels. This is the SEO → outreach → claim loop: SEO drives profile views, unclaimed profiles trigger outreach emails, claims refresh profile content, new content drives more SEO.
        </p>
      </Block>
    </>
  );
}

function SupplyTab({ d }: { d: AdminData }) {
  return (
    <>
      <Block>
        <SectionHeader title="Supply health" subtitle="4 levers: volume, quality, matching, retention (Growth Series)." />
        <div className="grid gap-3 md:grid-cols-4">
          <Card label="Total agents" value={fmt(d.supply.totalAgents)} />
          <Card
            label="Claimed"
            value={fmt(d.supply.claimedCount)}
            sub={pct((d.supply.claimedCount / Math.max(1, d.supply.totalAgents)) * 100, 2) + " of total"}
          />
          <Card label="Claimed this week" value={fmt(d.supply.claimedThisWeek)} />
          <Card label="Pending verifications" value={fmt(d.supply.pendingClaims)} />
        </div>
      </Block>

      <Block>
        <SectionHeader title="Quality & matching" />
        <div className="grid gap-3 md:grid-cols-4">
          <Card label="Profile completion" value={pct(d.supply.completionRate, 0)} sub={`${d.supply.complete} complete`} />
          <Card label="Aha moment (7d)" value={fmt(d.supply.ahaAgents)} sub="Agents with WA click" />
          <Card label="Dashboard logins (7d)" value={fmt(d.supply.dashboardLogins7)} sub="Supply retention signal" />
          <Card
            label="Tier mix"
            value={`${d.supply.agentsByTier.free}/${d.supply.agentsByTier.pro}/${d.supply.agentsByTier.premium}`}
            sub="Free / Pro / Premium"
          />
        </div>
      </Block>

      <Block>
        <SectionHeader title="Top unclaimed by recent profile views" subtitle="Daily outreach hit list. Buyer demand exists but supply not activated." />
        <Table>
          <thead>
            <tr>
              <Th>Agent</Th>
              <Th>Agency</Th>
              <Th>Area</Th>
              <Th right>Score</Th>
              <Th right>Views (30d)</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {d.supply.topUnclaimedByViews.length === 0 && (
              <tr>
                <Td>
                  <span className="text-gray-400">No unclaimed agents with recent views yet.</span>
                </Td>
                <Td>-</Td>
                <Td>-</Td>
                <Td right>-</Td>
                <Td right>-</Td>
                <Td></Td>
              </tr>
            )}
            {d.supply.topUnclaimedByViews.map((a) => (
              <tr key={a.id}>
                <Td>
                  <span className="font-medium text-gray-900">{a.name}</span>
                </Td>
                <Td>{a.agency_name || "Independent"}</Td>
                <Td>{a.primary_area || ""}</Td>
                <Td right>
                  <span className="font-semibold text-teal-600">{a.score ? Math.round(Number(a.score)) : ""}</span>
                </Td>
                <Td right>{a.views}</Td>
                <Td right>
                  <Link href={`/property-agents/agent/${a.slug}`} target="_blank" className="text-xs text-teal-600 hover:underline">
                    View
                  </Link>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Block>

      <Block>
        <SectionHeader title="Top agencies" subtitle="Segmentation by agency. Which agencies adopt faster?" />
        <Table>
          <thead>
            <tr>
              <Th>Agency</Th>
              <Th right>Agents</Th>
              <Th right>Claimed</Th>
              <Th right>Paid</Th>
              <Th right>Claim rate</Th>
            </tr>
          </thead>
          <tbody>
            {d.supply.topAgencies.map((a) => (
              <tr key={a.name}>
                <Td>
                  <span className="font-medium text-gray-900">{a.name}</span>
                </Td>
                <Td right>{fmt(a.total)}</Td>
                <Td right>{a.claimed}</Td>
                <Td right>{a.paid}</Td>
                <Td right>
                  <span className={a.claimRate > 5 ? "font-semibold text-teal-600" : "text-gray-500"}>
                    {pct(a.claimRate, 1)}
                  </span>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Block>
    </>
  );
}

function SEOTab({ d }: { d: AdminData }) {
  const clicksDelta = d.seo.totalClicksPrev > 0
    ? Math.round(((d.seo.totalClicks7 - d.seo.totalClicksPrev) / d.seo.totalClicksPrev) * 100)
    : 0;
  return (
    <>
      <Block>
        <SectionHeader title="Search performance" subtitle="Google Search Console, synced daily via Windsor." />
        <div className="grid gap-3 md:grid-cols-4">
          <Card
            label="Clicks (7d)"
            value={fmt(d.seo.totalClicks7)}
            delta={d.seo.totalClicksPrev > 0 ? { pct: `${clicksDelta > 0 ? "+" : ""}${clicksDelta}%`, dir: clicksDelta > 0 ? "up" : clicksDelta < 0 ? "down" : "flat" } : undefined}
          />
          <Card label="Impressions (7d)" value={fmt(d.seo.totalImpressions7)} />
          <Card label="CTR" value={pct(d.seo.ctr * 100, 2)} />
          <Card label="Avg position" value={d.seo.avgPosition.toFixed(1)} />
        </div>
      </Block>

      <Block>
        <SectionHeader title="Index health" />
        <div className="grid gap-3 md:grid-cols-2">
          <Card label="Pages in index" value={fmt(d.seo.indexedPages)} sub="From gsc_indexation_log" />
          <Card label="Indexation issues" value={fmt(d.seo.indexationIssues)} sub="Pages not indexed" />
        </div>
      </Block>

      <Block>
        <SectionHeader title="Top queries (7d)" subtitle="Which queries drive traffic?" />
        <Table>
          <thead>
            <tr>
              <Th>Query</Th>
              <Th right>Clicks</Th>
              <Th right>Impressions</Th>
              <Th right>CTR</Th>
              <Th right>Position</Th>
            </tr>
          </thead>
          <tbody>
            {d.seo.topQueries.length === 0 && (
              <tr>
                <Td><span className="text-gray-400">No GSC query data yet. Check Windsor sync.</span></Td>
                <Td right>-</Td>
                <Td right>-</Td>
                <Td right>-</Td>
                <Td right>-</Td>
              </tr>
            )}
            {d.seo.topQueries.map((q) => (
              <tr key={q.query}>
                <Td>{q.query}</Td>
                <Td right><strong>{q.clicks}</strong></Td>
                <Td right>{fmt(q.impressions)}</Td>
                <Td right>{pct(q.ctr * 100, 1)}</Td>
                <Td right>{q.position.toFixed(1)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Block>

      <Block>
        <SectionHeader title="Top landing pages (7d)" />
        <Table>
          <thead>
            <tr>
              <Th>Page</Th>
              <Th right>Clicks</Th>
              <Th right>Impressions</Th>
              <Th right>Position</Th>
            </tr>
          </thead>
          <tbody>
            {d.seo.topPages.map((p) => (
              <tr key={p.page}>
                <Td mono>{p.page.replace("https://fair-comparisons.com", "")}</Td>
                <Td right><strong>{p.clicks}</strong></Td>
                <Td right>{fmt(p.impressions)}</Td>
                <Td right>{p.position.toFixed(1)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Block>

      {d.seo.rankTracking.length > 0 && (
        <Block>
          <SectionHeader title="Rank tracking" subtitle="Manually tracked keywords" />
          <Table>
            <thead>
              <tr>
                <Th>Keyword</Th>
                <Th right>Rank</Th>
                <Th right>Checked</Th>
              </tr>
            </thead>
            <tbody>
              {d.seo.rankTracking.map((r) => (
                <tr key={r.keyword}>
                  <Td>{r.keyword}</Td>
                  <Td right>{r.rank != null ? `#${r.rank}` : "-"}</Td>
                  <Td right>{new Date(r.checked_at).toLocaleDateString("en-SG")}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Block>
      )}
    </>
  );
}

function OpsTab({ d }: { d: AdminData }) {
  return (
    <>
      <Block>
        <SectionHeader title="Operational health" />
        <div className="grid gap-3 md:grid-cols-4">
          <Card label="Pending verifications" value={fmt(d.ops.pendingClaims)} sub="Awaiting email click" />
          <Card label="Rejected claims (30d)" value={fmt(d.ops.rejectedClaims30)} sub="CEA mismatches = fraud?" />
          <Card label="Unsubscribes (30d)" value={fmt(d.ops.unsubscribes30)} />
          <Card label="Email queue backlog" value={fmt(d.ops.emailQueueBacklog)} sub="Unsent emails" />
        </div>
      </Block>

      <Block>
        <SectionHeader title="Data freshness" />
        <div className="grid gap-3 md:grid-cols-2">
          <Card label="Stale contact scrapes" value={fmt(d.ops.staleScrapes)} sub=">30 days old, needs rescrape" />
          <Card label="Recent cron activity" value={fmt(d.ops.recentCronEvents.length)} sub="Events tracked last 48h" />
        </div>
      </Block>

      <Block>
        <SectionHeader title="Recent cron / system events" />
        <Table>
          <thead>
            <tr>
              <Th>Event</Th>
              <Th>Time</Th>
              <Th>Metadata</Th>
            </tr>
          </thead>
          <tbody>
            {d.ops.recentCronEvents.length === 0 && (
              <tr>
                <Td>
                  <span className="text-gray-400">No recent cron events tracked.</span>
                </Td>
                <Td></Td>
                <Td></Td>
              </tr>
            )}
            {d.ops.recentCronEvents.map((e, i) => (
              <tr key={i}>
                <Td>
                  <span className="font-mono text-xs">{e.event}</span>
                </Td>
                <Td>
                  <span className="text-xs text-gray-500">
                    {new Date(e.created_at).toLocaleString("en-SG", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                </Td>
                <Td>
                  <span className="font-mono text-[10px] text-gray-600">
                    {JSON.stringify(e.metadata).slice(0, 80)}
                  </span>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Block>
    </>
  );
}

function RevenueTab({ d }: { d: AdminData }) {
  return (
    <>
      <Block>
        <SectionHeader title="MRR" />
        <div className="grid gap-3 md:grid-cols-4">
          <Card label="Total MRR" value={currency(d.revenue.mrr)} size="lg" />
          <Card label="Paying agents" value={fmt(d.revenue.payingCount)} sub={`${d.revenue.proCount} Pro, ${d.revenue.premiumCount} Premium`} size="lg" />
          <Card label="ARPU" value={currency(d.revenue.arpu)} sub="Per paying agent" size="lg" />
          <Card label="Claimed to paid" value={pct(d.revenue.claimedToPaidRate, 1)} sub="Conversion" size="lg" />
        </div>
      </Block>

      <Block>
        <SectionHeader title="Flow (30 days)" />
        <div className="grid gap-3 md:grid-cols-3">
          <Card label="New paying (30d)" value={fmt(d.revenue.newPayingLast30d)} />
          <Card label="Churned (30d)" value={fmt(d.revenue.churnedLast30d)} sub="Subscription canceled" />
          <Card label="Net MRR movement" value={fmt(d.revenue.newPayingLast30d - d.revenue.churnedLast30d)} />
        </div>
      </Block>

      <Block>
        <SectionHeader title="Investment thesis check" subtitle="Per Mastering Growth Marketing > CAC & LTV lesson" />
        <div className="rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-700">
          <p className="leading-relaxed">
            At <strong>{currency(d.revenue.mrr)}</strong> MRR with <strong>{d.revenue.payingCount}</strong> paying agents and{" "}
            <strong>{pct(d.revenue.claimedToPaidRate, 1)}</strong> claimed-to-paid conversion, focus on
            proving the first growth loop works before investing in CAC. Marginal claim costs are near zero
            (email outreach) so payback on Pro (S$99/mo) is under 1 day of Stripe fees. LTV estimate becomes
            meaningful at ~20 paying agents retained for 3+ months.
          </p>
          <p className="mt-3 leading-relaxed text-gray-500">
            <strong>Next milestone:</strong> 20 paying agents. Then build retention cohorts to estimate true LTV.
          </p>
        </div>
      </Block>
    </>
  );
}

// --- main shell ---

export default function AdminShell({ data }: { data: AdminData }) {
  const [active, setActive] = useState<TabKey>("overzicht");

  const panel = {
    overzicht: <OverzichtTab d={data} />,
    liquidity: <LiquidityTab d={data} />,
    funnel: <FunnelTab d={data} />,
    supply: <SupplyTab d={data} />,
    seo: <SEOTab d={data} />,
    ops: <OpsTab d={data} />,
    revenue: <RevenueTab d={data} />,
  }[active];

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="sticky top-0 flex h-screen w-52 shrink-0 flex-col border-r border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-5">
          <p className="text-sm font-extrabold text-gray-900">FairComparisons</p>
          <p className="mt-0.5 text-[11px] text-gray-500">Admin</p>
        </div>

        <nav className="flex-1 space-y-0.5 p-3">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActive(t.key)}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition ${
                active === t.key
                  ? "bg-teal-50 font-semibold text-teal-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              <span className={`w-4 text-center text-xs ${active === t.key ? "text-teal-600" : "text-gray-400"}`}>{t.emoji}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </nav>

        <div className="border-t border-gray-100 p-3">
          <form action="/api/admin/logout" method="POST">
            <button
              type="submit"
              className="w-full rounded-lg px-3 py-2 text-left text-xs text-gray-500 transition hover:bg-gray-50 hover:text-gray-900"
            >
              Sign out
            </button>
          </form>
          <p className="mt-2 truncate px-3 text-[10px] text-gray-400">{data.session.email}</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="mx-auto max-w-[1080px] px-8 py-8">
          <header className="mb-6">
            <h1 className="text-2xl font-extrabold text-gray-900">
              {TABS.find((t) => t.key === active)?.label}
            </h1>
            <p className="mt-1 text-xs text-gray-500">
              Data refreshed on page load. All times SGT.
            </p>
          </header>
          {panel}
        </div>
      </main>
    </div>
  );
}
