import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { getAdminSession } from "../lib/admin-auth";
import AdminShell, { type AdminData } from "./AdminShell";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const iso = (d: Date) => d.toISOString();

function fmtDelta(curr: number, prev: number) {
  if (prev === 0 && curr === 0) return { pct: "0%", dir: "flat" as const };
  if (prev === 0) return { pct: "new", dir: "up" as const };
  const pct = Math.round(((curr - prev) / prev) * 100);
  return {
    pct: `${pct > 0 ? "+" : ""}${pct}%`,
    dir: (pct > 0 ? "up" : pct < 0 ? "down" : "flat") as "up" | "down" | "flat",
  };
}

async function count(table: string, filters: Array<[string, unknown]>, since?: { col: string; date: Date; before?: Date }): Promise<number> {
  let q = supabase.from(table).select("id", { count: "exact", head: true });
  for (const [col, val] of filters) {
    q = q.eq(col, val);
  }
  if (since) {
    q = q.gte(since.col, iso(since.date));
    if (since.before) q = q.lt(since.col, iso(since.before));
  }
  const { count } = await q;
  return count ?? 0;
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

async function distinctAgents(event: string, since: Date): Promise<number> {
  const { data } = await supabase
    .from("sg_funnel_events")
    .select("agent_id")
    .eq("event", event)
    .not("agent_id", "is", null)
    .gte("created_at", iso(since));
  return new Set((data ?? []).map((r) => r.agent_id)).size;
}

async function loadData(): Promise<Omit<AdminData, "session">> {
  const now = new Date();
  const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const d14 = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const d60 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const d48h = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  const [
    views7,
    views14,
    wa7,
    wa14,
    searches7,
    searchesAll,
    bannerView30,
    bannerClick30,
    submit30,
    verified30,
    rejected30,
    subStarted30,
    subCanceled30,
    checkoutStart30,
    claimsThisWeek,
    pendingClaims,
    agentsAll,
    agentsRaw,
    profileViewsForAgents,
    waForAgents,
    topUnclaimedByView,
    outreachAgg,
    gscDaily7,
    gscDaily14,
    gscTopQueries,
    gscTopPages,
    rankTracking,
    indexation,
    unsubs30,
    emailQueue,
    staleScrapes,
    recentCron,
    recentClaims,
    dashLogin7,
    profileEdit7,
    subscribers,
    ga4Daily7,
    ga4Sources7,
  ] = await Promise.all([
    eventCount("profile_view", d7),
    eventCount("profile_view", d14, d7),
    eventCount("whatsapp_click", d7),
    eventCount("whatsapp_click", d14, d7),
    eventCount("search_performed", d7),
    supabase.from("sg_funnel_events").select("metadata").eq("event", "search_performed").gte("created_at", iso(d7)),
    eventCount("claim_banner_view", d30),
    eventCount("claim_click", d30),
    eventCount("claim_submit", d30),
    count("sg_claim_requests", [["status", "verified"]], { col: "created_at", date: d30 }),
    count("sg_claim_requests", [["status", "rejected"]], { col: "created_at", date: d30 }),
    eventCount("subscription_started", d30),
    eventCount("subscription_cancelled", d30),
    eventCount("checkout_started", d30),
    count("sg_agents", [["claimed", true]], { col: "claimed_at", date: d7 }),
    count("sg_claim_requests", [["status", "pending"]]),
    supabase.from("sg_agents").select("id", { count: "exact", head: true }),
    supabase.from("sg_agents").select("id, name, slug, claimed, claimed_at, photo_url, whatsapp, bio, message, subscription_tier, subscription_started_at, subscription_canceled_at, agency_name, primary_area"),
    supabase
      .from("sg_funnel_events")
      .select("agent_id, metadata")
      .eq("event", "profile_view")
      .not("agent_id", "is", null)
      .gte("created_at", iso(d30)),
    supabase
      .from("sg_funnel_events")
      .select("agent_id")
      .eq("event", "whatsapp_click")
      .not("agent_id", "is", null)
      .gte("created_at", iso(d30)),
    supabase
      .from("sg_funnel_events")
      .select("agent_id, metadata")
      .eq("event", "profile_view")
      .not("agent_id", "is", null)
      .gte("created_at", iso(d30)),
    supabase
      .from("sg_outreach")
      .select("email_sent, opened, clicked, claimed_after"),
    supabase
      .from("fc_gsc_daily_stats")
      .select("clicks, impressions")
      .gte("date", d7.toISOString().slice(0, 10)),
    supabase
      .from("fc_gsc_daily_stats")
      .select("clicks")
      .gte("date", d14.toISOString().slice(0, 10))
      .lt("date", d7.toISOString().slice(0, 10)),
    supabase
      .from("fc_gsc_daily_stats")
      .select("dimension_value, clicks, impressions, ctr, position")
      .eq("dimension", "query")
      .gte("date", d7.toISOString().slice(0, 10))
      .order("clicks", { ascending: false })
      .limit(15),
    supabase
      .from("fc_gsc_daily_stats")
      .select("dimension_value, clicks, impressions, position")
      .eq("dimension", "page")
      .gte("date", d7.toISOString().slice(0, 10))
      .order("clicks", { ascending: false })
      .limit(15),
    supabase
      .from("fc_rank_tracking")
      .select("keyword, our_rank, checked_at")
      .order("checked_at", { ascending: false })
      .limit(20),
    supabase
      .from("fc_gsc_indexation_log")
      .select("verdict, coverage_state"),
    count("email_unsubscribes", [], { col: "created_at", date: d30 }),
    supabase.from("email_queue").select("id", { count: "exact", head: true }),
    supabase
      .from("sg_agents")
      .select("id", { count: "exact", head: true })
      .not("contact_scraped_at", "is", null)
      .lt("contact_scraped_at", iso(d30)),
    supabase
      .from("sg_funnel_events")
      .select("event, created_at, metadata")
      .in("event", [
        "agent_notification_sent",
        "subscription_started",
        "subscription_cancelled",
        "payment_failed",
        "checkout_started",
      ])
      .gte("created_at", iso(d48h))
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("sg_claim_requests")
      .select("id, email, status, created_at, agent_id")
      .gte("created_at", iso(d30))
      .order("created_at", { ascending: false })
      .limit(15),
    eventCount("dashboard_login", d7),
    eventCount("profile_edit", d7),
    supabase.from("sg_email_subscribers").select("id", { count: "exact", head: true }),
    supabase
      .from("fc_ga4_daily_stats")
      .select("active_users, sessions, page_views, bounce_rate, engaged_sessions")
      .gte("date", d7.toISOString().slice(0, 10)),
    supabase
      .from("fc_ga4_traffic_sources")
      .select("source_medium, sessions, active_users")
      .gte("date", d7.toISOString().slice(0, 10))
      .order("sessions", { ascending: false })
      .limit(10),
  ]);

  // GA4 rollup
  const ga4 = ((ga4Daily7.data ?? []) as Array<{
    active_users: number;
    sessions: number;
    page_views: number;
    bounce_rate: number;
    engaged_sessions: number;
  }>);
  const ga4Sessions7 = ga4.reduce((s, r) => s + (r.sessions || 0), 0);
  const ga4Users7 = ga4.reduce((s, r) => s + (r.active_users || 0), 0);
  const ga4Pageviews7 = ga4.reduce((s, r) => s + (r.page_views || 0), 0);
  const ga4Engaged7 = ga4.reduce((s, r) => s + (r.engaged_sessions || 0), 0);
  const ga4EngagementRate = ga4Sessions7 > 0 ? (ga4Engaged7 / ga4Sessions7) * 100 : 0;
  const trafficSources = ((ga4Sources7.data ?? []) as Array<{
    source_medium: string;
    sessions: number;
    active_users: number;
  }>);

  const agents = (agentsRaw.data ?? []) as Array<{
    id: number;
    name: string;
    slug: string;
    claimed: boolean;
    claimed_at: string | null;
    photo_url: string | null;
    whatsapp: string | null;
    bio: string | null;
    message: string | null;
    subscription_tier: string | null;
    subscription_started_at: string | null;
    subscription_canceled_at: string | null;
    agency_name: string | null;
    primary_area: string | null;
  }>;

  const totalAgents = agentsAll.count ?? 0;
  const claimedAgents = agents.filter((a) => a.claimed);
  const claimedCount = claimedAgents.length;
  const complete = claimedAgents.filter((a) => a.photo_url && a.whatsapp && a.bio && a.message).length;

  const paidPro = agents.filter((a) => a.subscription_tier === "pro").length;
  const paidPremium = agents.filter((a) => a.subscription_tier === "premium").length;
  const payingCount = paidPro + paidPremium;
  const mrr = paidPro * 99 + paidPremium * 299;

  // Rough prev MRR: count agents whose subscription_started before 30d ago AND not canceled = prev paying baseline. Simpler: assume no churn before 30d.
  const mrrPrev = mrr - (paidPro * 99 + paidPremium * 299) * 0; // placeholder; real impl would need historical snapshots

  // North Star: claimed + upgraded (has subscription_started_at) in last 30d
  const northStar = agents.filter(
    (a) => a.claimed && a.subscription_started_at && new Date(a.subscription_started_at) >= d30 && a.subscription_tier && a.subscription_tier !== "free"
  ).length;

  // Agency breakdown
  const agencyMap = new Map<string, { total: number; claimed: number; paid: number }>();
  for (const a of agents) {
    const key = a.agency_name || "Independent";
    const entry = agencyMap.get(key) || { total: 0, claimed: 0, paid: 0 };
    entry.total++;
    if (a.claimed) entry.claimed++;
    if (a.subscription_tier === "pro" || a.subscription_tier === "premium") entry.paid++;
    agencyMap.set(key, entry);
  }
  const topAgencies = Array.from(agencyMap.entries())
    .map(([name, s]) => ({ name, ...s, claimRate: s.total > 0 ? (s.claimed / s.total) * 100 : 0 }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  // Liquidity by district: join profile_view events to agent primary_area
  const agentById = new Map<number, (typeof agents)[number]>();
  for (const a of agents) agentById.set(a.id, a);

  const viewsEvents = (profileViewsForAgents.data ?? []) as Array<{ agent_id: number; metadata: Record<string, unknown> | null }>;
  const waEvents = (waForAgents.data ?? []) as Array<{ agent_id: number }>;

  const districtStats = new Map<string, { views: number; clicks: number; claimed: number; totalAgents: Set<number> }>();

  for (const ev of viewsEvents) {
    const agent = agentById.get(ev.agent_id);
    const district =
      (ev.metadata?.primary_area as string) ||
      (agent?.primary_area || "Unknown");
    const entry = districtStats.get(district) || { views: 0, clicks: 0, claimed: 0, totalAgents: new Set<number>() };
    entry.views++;
    entry.totalAgents.add(ev.agent_id);
    districtStats.set(district, entry);
  }
  for (const ev of waEvents) {
    const agent = agentById.get(ev.agent_id);
    const district = agent?.primary_area || "Unknown";
    const entry = districtStats.get(district) || { views: 0, clicks: 0, claimed: 0, totalAgents: new Set<number>() };
    entry.clicks++;
    districtStats.set(district, entry);
  }
  // Count claimed agents per district
  for (const a of agents) {
    if (!a.claimed || !a.primary_area) continue;
    const entry = districtStats.get(a.primary_area);
    if (entry) entry.claimed++;
  }

  const byDistrict = Array.from(districtStats.entries())
    .map(([district, s]) => ({
      district,
      views: s.views,
      clicks: s.clicks,
      claimed: s.claimed,
      rate: s.views > 0 ? (s.clicks / s.views) * 100 : 0,
    }))
    .filter((m) => m.views >= 3) // only show markets with meaningful traffic
    .sort((a, b) => b.views - a.views)
    .slice(0, 20);

  const overallViews30 = viewsEvents.length;
  const overallClicks30 = waEvents.length;
  const overallRate = overallViews30 > 0 ? (overallClicks30 / overallViews30) * 100 : 0;
  const liquidMarkets = byDistrict.filter((m) => m.rate >= 40).length;
  const totalMarkets = byDistrict.length;
  const liquidityPct = totalMarkets > 0 ? (liquidMarkets / totalMarkets) * 100 : 0;

  const searchesData = (searchesAll.data ?? []) as Array<{ metadata: Record<string, unknown> | null }>;
  const searchesWithResults = searchesData.filter((s) => {
    const meta = s.metadata || {};
    return Number(meta.result_count ?? 0) > 0;
  }).length;

  // Top unclaimed by views
  const viewsPerAgent = new Map<number, number>();
  for (const ev of viewsEvents) {
    viewsPerAgent.set(ev.agent_id, (viewsPerAgent.get(ev.agent_id) || 0) + 1);
  }
  const topUnclaimedByViews = agents
    .filter((a) => !a.claimed)
    .map((a) => ({
      id: a.id,
      name: a.name,
      slug: a.slug,
      score: (agents.find((x) => x.id === a.id) as { score?: number } | undefined)?.score ?? null,
      primary_area: a.primary_area,
      agency_name: a.agency_name,
      views: viewsPerAgent.get(a.id) || 0,
    }))
    .filter((a) => a.views > 0)
    .sort((a, b) => b.views - a.views)
    .slice(0, 15);

  // Fallback: if no events with agent_id, show top unclaimed by score
  let topUnclaimedFinal = topUnclaimedByViews;
  if (topUnclaimedFinal.length === 0) {
    const { data } = await supabase
      .from("sg_agents")
      .select("id, name, slug, score, primary_area, agency_name")
      .eq("claimed", false)
      .not("score", "is", null)
      .order("score", { ascending: false })
      .limit(15);
    topUnclaimedFinal = ((data ?? []) as Array<{
      id: number;
      name: string;
      slug: string;
      score: number | null;
      primary_area: string | null;
      agency_name: string | null;
    }>).map((a) => ({ ...a, views: 0 }));
  }

  // Outreach email loop
  const outreach = (outreachAgg.data ?? []) as Array<{ email_sent: boolean; opened: boolean; clicked: boolean; claimed_after: boolean }>;
  const emailLoop = {
    sent: outreach.filter((o) => o.email_sent).length,
    opened: outreach.filter((o) => o.opened).length,
    clicked: outreach.filter((o) => o.clicked).length,
    claimedAfter: outreach.filter((o) => o.claimed_after).length,
  };

  // SEO
  const gsc7 = (gscDaily7.data ?? []) as Array<{ clicks: number; impressions: number }>;
  const totalClicks7 = gsc7.reduce((s, r) => s + (r.clicks || 0), 0);
  const totalImpressions7 = gsc7.reduce((s, r) => s + (r.impressions || 0), 0);
  const ctr = totalImpressions7 > 0 ? totalClicks7 / totalImpressions7 : 0;
  const totalClicksPrev = (gscDaily14.data ?? []).reduce((s: number, r: { clicks: number }) => s + (r.clicks || 0), 0);

  const positionSampleData = (
    await supabase
      .from("fc_gsc_daily_stats")
      .select("position, impressions")
      .gte("date", d7.toISOString().slice(0, 10))
      .eq("dimension", "query")
      .limit(1000)
  ).data as Array<{ position: number; impressions: number }> | null;

  const posSample = positionSampleData ?? [];
  const weightedPos = posSample.reduce((s, r) => s + (r.position || 0) * (r.impressions || 0), 0);
  const weightedImp = posSample.reduce((s, r) => s + (r.impressions || 0), 0);
  const avgPosition = weightedImp > 0 ? weightedPos / weightedImp : 0;

  const topQueries = ((gscTopQueries.data ?? []) as Array<{
    dimension_value: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }>).map((q) => ({
    query: q.dimension_value,
    clicks: q.clicks,
    impressions: q.impressions,
    position: Number(q.position),
    ctr: Number(q.ctr),
  }));

  const topPages = ((gscTopPages.data ?? []) as Array<{
    dimension_value: string;
    clicks: number;
    impressions: number;
    position: number;
  }>).map((p) => ({
    page: p.dimension_value,
    clicks: p.clicks,
    impressions: p.impressions,
    position: Number(p.position),
  }));

  const rankData = ((rankTracking.data ?? []) as Array<{ keyword: string; our_rank: number | null; checked_at: string }>).map(
    (r) => ({ keyword: r.keyword, rank: r.our_rank, checked_at: r.checked_at })
  );

  const indexData = (indexation.data ?? []) as Array<{ verdict: string; coverage_state: string }>;
  const indexedPages = indexData.filter((i) => i.verdict === "PASS" || i.coverage_state === "Submitted and indexed").length;
  const indexationIssues = indexData.length - indexedPages;

  // Revenue churn/new last 30d
  const churnedLast30d = agents.filter(
    (a) =>
      a.subscription_canceled_at &&
      new Date(a.subscription_canceled_at) >= d30
  ).length || subCanceled30;

  const newPayingLast30d = agents.filter(
    (a) =>
      a.subscription_started_at &&
      new Date(a.subscription_started_at) >= d30 &&
      a.subscription_tier &&
      a.subscription_tier !== "free"
  ).length || subStarted30;

  return {
    outcomes: {
      views7,
      viewsDelta: fmtDelta(views7, views14),
      wauAgents: await distinctAgents("profile_edit", d7),
      profileEdit7,
      payingCount,
      mrr,
      mrrPrev,
      liquidityPct,
      liquidityMarkets: liquidMarkets,
      totalMarkets,
      northStar,
    },
    liquidity: {
      views7,
      waClicks7: wa7,
      overallRate,
      byDistrict,
      searches7,
      searchesWithResults,
    },
    funnel: {
      stages: [
        { key: "banner", label: "Banner views (30d)", value: bannerView30 },
        { key: "click", label: "Banner clicks (30d)", value: bannerClick30 },
        { key: "submit", label: "Submits (30d)", value: submit30 },
        { key: "verified", label: "Verified (30d)", value: verified30 },
        { key: "checkout", label: "Checkout started (30d)", value: checkoutStart30 },
        { key: "paid", label: "Subscriptions started (30d)", value: subStarted30 },
      ],
      bannerToSubmit: bannerView30 > 0 ? (submit30 / bannerView30) * 100 : 0,
      submitToVerified: submit30 > 0 ? (verified30 / submit30) * 100 : 0,
      rejected: rejected30,
      emailLoop,
    },
    supply: {
      totalAgents,
      claimedCount,
      pendingClaims,
      claimedThisWeek: claimsThisWeek,
      ahaAgents: await distinctAgents("whatsapp_click", d7),
      complete,
      completionRate: claimedCount > 0 ? (complete / claimedCount) * 100 : 0,
      dashboardLogins7: dashLogin7,
      agentsByTier: {
        free: agents.filter((a) => !a.subscription_tier || a.subscription_tier === "free").length,
        pro: paidPro,
        premium: paidPremium,
      },
      topUnclaimedByViews: topUnclaimedFinal,
      topAgencies,
    },
    seo: {
      totalClicks7,
      totalImpressions7,
      ctr,
      avgPosition,
      totalClicksPrev,
      indexedPages,
      indexationIssues,
      topQueries,
      topPages,
      rankTracking: rankData,
      ga4Sessions: ga4Sessions7,
      ga4Users: ga4Users7,
      ga4Pageviews: ga4Pageviews7,
      ga4EngagementRate,
      trafficSources,
    },
    ops: {
      pendingClaims,
      rejectedClaims30: rejected30,
      unsubscribes30: unsubs30,
      staleScrapes: staleScrapes.count ?? 0,
      recentCronEvents: ((recentCron.data ?? []) as Array<{
        event: string;
        created_at: string;
        metadata: Record<string, unknown> | null;
      }>).map((e) => ({ event: e.event, created_at: e.created_at, metadata: e.metadata || {} })),
      emailQueueBacklog: emailQueue.count ?? 0,
    },
    revenue: {
      mrr,
      proCount: paidPro,
      premiumCount: paidPremium,
      payingCount,
      arpu: payingCount > 0 ? mrr / payingCount : 0,
      claimedToPaidRate: claimedCount > 0 ? (payingCount / claimedCount) * 100 : 0,
      churnedLast30d,
      newPayingLast30d,
      upgradesByTier: [
        { tier: "pro", count: paidPro },
        { tier: "premium", count: paidPremium },
      ],
    },
    recentClaims: ((recentClaims.data ?? []) as Array<{
      id: number;
      email: string;
      status: string;
      created_at: string;
      agent_id: number;
    }>),
  };
}

export default async function AdminDashboard() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const data = await loadData();
  return <AdminShell data={{ ...data, session }} />;
}
