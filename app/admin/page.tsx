import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { getAdminSession } from "../lib/admin-auth";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// --- helpers ---

function iso(date: Date): string {
  return date.toISOString();
}

async function eventCount(event: string, since: Date, until?: Date): Promise<number> {
  let q = supabase
    .from("sg_funnel_events")
    .select("id", { count: "exact", head: true })
    .eq("event", event)
    .gte("created_at", iso(since));
  if (until) q = q.lt("created_at", iso(until));
  const { count } = await q;
  return count ?? 0;
}

async function distinctAgentsWithEvent(event: string, since: Date): Promise<number> {
  const { data } = await supabase
    .from("sg_funnel_events")
    .select("agent_id")
    .eq("event", event)
    .not("agent_id", "is", null)
    .gte("created_at", iso(since));
  const ids = new Set((data ?? []).map((r) => r.agent_id));
  return ids.size;
}

function fmtDelta(curr: number, prev: number): { pct: string; dir: "up" | "down" | "flat" } {
  if (prev === 0 && curr === 0) return { pct: "0%", dir: "flat" };
  if (prev === 0) return { pct: "new", dir: "up" };
  const pct = Math.round(((curr - prev) / prev) * 100);
  return {
    pct: `${pct > 0 ? "+" : ""}${pct}%`,
    dir: pct > 0 ? "up" : pct < 0 ? "down" : "flat",
  };
}

// --- data queries ---

async function loadMetrics() {
  const now = new Date();
  const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const d14 = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    views7,
    views14,
    whatsapp7,
    whatsapp14,
    claimBannerView30,
    claimClick30,
    claimSubmit30,
    profileEdit7,
    wauAgents,
    ahaAgents,
    claimedStats,
    paidStats,
    pendingClaims,
    verifiedClaims30,
    rejectedClaims30,
    agenciesRaw,
    topOpportunities,
    recentClaims,
    subscribers,
  ] = await Promise.all([
    eventCount("profile_view", d7),
    eventCount("profile_view", d14, d7),
    eventCount("whatsapp_click", d7),
    eventCount("whatsapp_click", d14, d7),
    eventCount("claim_banner_view", d30),
    eventCount("claim_click", d30),
    eventCount("claim_submit", d30),
    eventCount("profile_edit", d7),
    distinctAgentsWithEvent("profile_edit", d7),
    distinctAgentsWithEvent("whatsapp_click", d7),
    supabase.from("sg_agents").select("id, claimed, photo_url, whatsapp, bio, message", { count: "exact" }),
    supabase
      .from("sg_agents")
      .select("subscription_tier", { count: "exact" })
      .in("subscription_tier", ["pro", "premium"]),
    supabase.from("sg_claim_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase
      .from("sg_claim_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "verified")
      .gte("created_at", iso(d30)),
    supabase
      .from("sg_claim_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "rejected")
      .gte("created_at", iso(d30)),
    supabase
      .from("sg_agents")
      .select("agency_name, claimed, subscription_tier")
      .not("agency_name", "is", null),
    supabase
      .from("sg_agents")
      .select("id, name, slug, score, agency_name, primary_area")
      .eq("claimed", false)
      .not("score", "is", null)
      .order("score", { ascending: false })
      .limit(15),
    supabase
      .from("sg_claim_requests")
      .select("id, email, status, created_at, agent_id")
      .gte("created_at", iso(d30))
      .order("created_at", { ascending: false })
      .limit(15),
    supabase.from("sg_email_subscribers").select("id", { count: "exact", head: true }),
  ]);

  const agents = (claimedStats.data ?? []) as Array<{
    id: number;
    claimed: boolean;
    photo_url: string | null;
    whatsapp: string | null;
    bio: string | null;
    message: string | null;
  }>;
  const totalAgents = claimedStats.count ?? 0;
  const claimedAgents = agents.filter((a) => a.claimed);
  const claimedCount = claimedAgents.length;

  const complete = claimedAgents.filter(
    (a) => a.photo_url && a.whatsapp && a.bio && a.message
  ).length;

  const paidAgents = (paidStats.data ?? []) as Array<{ subscription_tier: string }>;
  const proCount = paidAgents.filter((a) => a.subscription_tier === "pro").length;
  const premiumCount = paidAgents.filter((a) => a.subscription_tier === "premium").length;
  const payingCount = proCount + premiumCount;
  const mrr = proCount * 99 + premiumCount * 299;

  const agencyMap = new Map<string, { total: number; claimed: number; paid: number }>();
  for (const row of (agenciesRaw.data ?? []) as Array<{
    agency_name: string | null;
    claimed: boolean;
    subscription_tier: string | null;
  }>) {
    const key = row.agency_name || "Independent";
    const entry = agencyMap.get(key) || { total: 0, claimed: 0, paid: 0 };
    entry.total++;
    if (row.claimed) entry.claimed++;
    if (row.subscription_tier === "pro" || row.subscription_tier === "premium") entry.paid++;
    agencyMap.set(key, entry);
  }
  const topAgencies = Array.from(agencyMap.entries())
    .map(([name, s]) => ({
      name,
      ...s,
      claimRate: s.total > 0 ? (s.claimed / s.total) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  const viewsDelta = fmtDelta(views7, views14);
  const waDelta = fmtDelta(whatsapp7, whatsapp14);

  const viewToWaRate = views7 > 0 ? (whatsapp7 / views7) * 100 : 0;
  const bannerToSubmitRate = claimBannerView30 > 0 ? (claimSubmit30 / claimBannerView30) * 100 : 0;
  const claimToVerifiedRate =
    claimSubmit30 > 0 ? ((verifiedClaims30.count ?? 0) / claimSubmit30) * 100 : 0;
  const claimedToPaidRate = claimedCount > 0 ? (payingCount / claimedCount) * 100 : 0;
  const completionRate = claimedCount > 0 ? (complete / claimedCount) * 100 : 0;
  const arpu = payingCount > 0 ? mrr / payingCount : 0;

  return {
    outcomes: { views7, viewsDelta, wauAgents, profileEdit7, payingCount, mrr },
    acquisition: { views7, viewsDelta, whatsapp7, waDelta, viewToWaRate, subscribers: subscribers.count ?? 0 },
    agentRetention: {
      totalAgents,
      claimedCount,
      pendingClaims: pendingClaims.count ?? 0,
      ahaAgents,
      complete,
      completionRate,
    },
    monetization: { payingCount, proCount, premiumCount, mrr, claimedToPaidRate, arpu },
    funnel: {
      bannerViews: claimBannerView30,
      bannerClicks: claimClick30,
      submits: claimSubmit30,
      verified: verifiedClaims30.count ?? 0,
      rejected: rejectedClaims30.count ?? 0,
      bannerToSubmitRate,
      claimToVerifiedRate,
    },
    topAgencies,
    topOpportunities: (topOpportunities.data ?? []) as Array<{
      id: number;
      name: string;
      slug: string;
      score: number | null;
      agency_name: string | null;
      primary_area: string | null;
    }>,
    recentClaims: (recentClaims.data ?? []) as Array<{
      id: number;
      email: string;
      status: string;
      created_at: string;
      agent_id: number;
    }>,
  };
}

// --- UI components ---

function OutcomeCard({
  label,
  value,
  sub,
  delta,
}: {
  label: string;
  value: string | number;
  sub?: string;
  delta?: { pct: string; dir: "up" | "down" | "flat" };
}) {
  const deltaColor =
    delta?.dir === "up" ? "text-green-600" : delta?.dir === "down" ? "text-red-600" : "text-gray-400";
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
      <div className="mt-2 flex items-baseline gap-2">
        <p className="text-3xl font-extrabold text-gray-900">{value}</p>
        {delta && <span className={`text-sm font-semibold ${deltaColor}`}>{delta.pct}</span>}
      </div>
      {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-gray-100 bg-white p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
      <p className="mt-1.5 text-xl font-bold text-gray-900">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-gray-500">{sub}</p>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-sm font-bold uppercase tracking-widest text-gray-500">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

// --- page ---

export default async function AdminDashboard() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const m = await loadMetrics();

  const funnelStages = [
    { label: "Banner views (30d)", value: m.funnel.bannerViews },
    { label: "Banner clicks (30d)", value: m.funnel.bannerClicks },
    { label: "Submits (30d)", value: m.funnel.submits },
    { label: "Verified (30d)", value: m.funnel.verified },
  ];
  const maxFunnel = Math.max(1, ...funnelStages.map((s) => s.value));

  return (
    <div className="mx-auto max-w-[1180px] px-5 py-8 md:px-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Admin dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Lever dashboard. Outcome metrics at top, KPIs below, funnel and opportunities at bottom.
          </p>
        </div>
        <form action="/api/admin/logout" method="POST">
          <button
            type="submit"
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
          >
            Sign out
          </button>
        </form>
      </header>

      <Section title="Outcome metrics (weekly)">
        <div className="grid gap-3 md:grid-cols-3">
          <OutcomeCard
            label="Consumer sessions (7d)"
            value={m.outcomes.views7.toLocaleString()}
            sub="Profile views as proxy"
            delta={m.outcomes.viewsDelta}
          />
          <OutcomeCard
            label="WAU claimed agents"
            value={m.outcomes.wauAgents.toLocaleString()}
            sub={`${m.outcomes.profileEdit7} profile edits this week`}
          />
          <OutcomeCard
            label="Paying agents"
            value={m.outcomes.payingCount}
            sub={`S$${m.outcomes.mrr.toLocaleString()} total MRR`}
          />
        </div>
      </Section>

      <Section title="Acquisition KPIs">
        <div className="grid gap-3 md:grid-cols-4">
          <KpiCard
            label="Profile views (7d)"
            value={m.acquisition.views7.toLocaleString()}
            sub={`Prev week delta: ${m.acquisition.viewsDelta.pct}`}
          />
          <KpiCard
            label="WhatsApp clicks (7d)"
            value={m.acquisition.whatsapp7.toLocaleString()}
            sub={`Prev week delta: ${m.acquisition.waDelta.pct}`}
          />
          <KpiCard
            label="View to WhatsApp"
            value={`${m.acquisition.viewToWaRate.toFixed(2)}%`}
            sub="The core consumer value event"
          />
          <KpiCard
            label="Email subscribers"
            value={m.acquisition.subscribers.toLocaleString()}
            sub="Consumer mailing list"
          />
        </div>
      </Section>

      <Section title="Agent activation KPIs">
        <div className="grid gap-3 md:grid-cols-4">
          <KpiCard
            label="Claimed agents"
            value={m.agentRetention.claimedCount.toLocaleString()}
            sub={`of ${m.agentRetention.totalAgents.toLocaleString()} total`}
          />
          <KpiCard
            label="Pending verifications"
            value={m.agentRetention.pendingClaims}
            sub="Awaiting email verify"
          />
          <KpiCard
            label="Aha moment (7d)"
            value={m.agentRetention.ahaAgents}
            sub="Agents with a WhatsApp click"
          />
          <KpiCard
            label="Profile completion"
            value={`${m.agentRetention.completionRate.toFixed(0)}%`}
            sub={`${m.agentRetention.complete} fully complete`}
          />
        </div>
      </Section>

      <Section title="Monetization KPIs">
        <div className="grid gap-3 md:grid-cols-4">
          <KpiCard
            label="Total MRR"
            value={`S$${m.monetization.mrr.toLocaleString()}`}
            sub={`${m.monetization.proCount} Pro, ${m.monetization.premiumCount} Premium`}
          />
          <KpiCard
            label="Paying agents"
            value={m.monetization.payingCount}
            sub={`${m.monetization.claimedToPaidRate.toFixed(1)}% of claimed`}
          />
          <KpiCard
            label="ARPU"
            value={`S$${Math.round(m.monetization.arpu).toLocaleString()}`}
            sub="Monthly per paying agent"
          />
          <KpiCard
            label="Claimed to paid"
            value={`${m.monetization.claimedToPaidRate.toFixed(1)}%`}
            sub="Free to Pro or Premium"
          />
        </div>
      </Section>

      <Section title="Claim funnel (last 30 days)">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="space-y-3">
            {funnelStages.map((s, i) => {
              const prev = i > 0 ? funnelStages[i - 1].value : null;
              const rate = prev && prev > 0 ? ((s.value / prev) * 100).toFixed(1) : null;
              const width = (s.value / maxFunnel) * 100;
              return (
                <div key={s.label}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-gray-700">{s.label}</span>
                    <span className="text-gray-500">
                      <strong className="text-gray-900">{s.value.toLocaleString()}</strong>
                      {rate && <span className="ml-2 text-gray-400">{rate}% of prev</span>}
                    </span>
                  </div>
                  <div className="mt-1 h-6 overflow-hidden rounded bg-gray-100">
                    <div
                      className="h-full bg-teal-600"
                      style={{ width: `${Math.max(2, width)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 border-t border-gray-100 pt-4 text-xs text-gray-500">
            <span className="mr-4">
              Banner to submit: <strong className="text-gray-800">{m.funnel.bannerToSubmitRate.toFixed(2)}%</strong>
            </span>
            <span className="mr-4">
              Submit to verified: <strong className="text-gray-800">{m.funnel.claimToVerifiedRate.toFixed(1)}%</strong>
            </span>
            <span>
              Rejected (30d): <strong className="text-gray-800">{m.funnel.rejected}</strong>
            </span>
          </div>
        </div>
      </Section>

      <Section title="Top agencies">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-[11px] uppercase tracking-widest text-gray-500">
              <tr>
                <th className="px-4 py-2.5">Agency</th>
                <th className="px-4 py-2.5 text-right">Agents</th>
                <th className="px-4 py-2.5 text-right">Claimed</th>
                <th className="px-4 py-2.5 text-right">Paid</th>
                <th className="px-4 py-2.5 text-right">Claim rate</th>
              </tr>
            </thead>
            <tbody>
              {m.topAgencies.map((a) => (
                <tr key={a.name} className="border-t border-gray-100">
                  <td className="px-4 py-2.5 font-medium text-gray-900">{a.name}</td>
                  <td className="px-4 py-2.5 text-right text-gray-600">{a.total.toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-right text-gray-600">{a.claimed}</td>
                  <td className="px-4 py-2.5 text-right text-gray-600">{a.paid}</td>
                  <td className="px-4 py-2.5 text-right">
                    <span className={a.claimRate > 5 ? "font-semibold text-teal-600" : "text-gray-500"}>
                      {a.claimRate.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Top outreach opportunities (unclaimed, highest score)">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-[11px] uppercase tracking-widest text-gray-500">
              <tr>
                <th className="px-4 py-2.5">Agent</th>
                <th className="px-4 py-2.5">Agency</th>
                <th className="px-4 py-2.5">Area</th>
                <th className="px-4 py-2.5 text-right">Score</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {m.topOpportunities.map((a) => (
                <tr key={a.id} className="border-t border-gray-100">
                  <td className="px-4 py-2.5 font-medium text-gray-900">{a.name}</td>
                  <td className="px-4 py-2.5 text-gray-600">{a.agency_name || "Independent"}</td>
                  <td className="px-4 py-2.5 text-gray-600">{a.primary_area || ""}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-teal-600">
                    {a.score ? Math.round(Number(a.score)) : ""}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Link
                      href={`/property-agents/agent/${a.slug}`}
                      target="_blank"
                      className="text-xs text-teal-600 hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Recent claim requests (30 days)">
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-[11px] uppercase tracking-widest text-gray-500">
              <tr>
                <th className="px-4 py-2.5">Date</th>
                <th className="px-4 py-2.5">Email</th>
                <th className="px-4 py-2.5">Agent ID</th>
                <th className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {m.recentClaims.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                    No claim requests in the last 30 days.
                  </td>
                </tr>
              )}
              {m.recentClaims.map((c) => (
                <tr key={c.id} className="border-t border-gray-100">
                  <td className="px-4 py-2.5 text-xs text-gray-500">
                    {new Date(c.created_at).toLocaleDateString("en-SG", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </td>
                  <td className="px-4 py-2.5 text-gray-900">{c.email}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{c.agent_id}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={
                        c.status === "verified"
                          ? "rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
                          : c.status === "pending"
                          ? "rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700"
                          : "rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"
                      }
                    >
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <footer className="mt-12 border-t border-gray-200 pt-6 text-xs text-gray-400">
        <p>Signed in as {session.email}. All times in SGT. Data refreshed on page load.</p>
      </footer>
    </div>
  );
}
