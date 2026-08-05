import { createClient } from "@supabase/supabase-js";
import { SectionHeading, StatCard, EmptyState } from "../shared";
import { countIndexableAgents } from "../../lib/indexable";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Summary = { win: string; pv: number; organic: number; direct: number; referral: number; internal: number; distinct_pages: number; mobile: number; bot: number };
type Bar = { k: string; n: number };

function delta(cur: number, prev: number): { text: string; dir: "up" | "down" | "flat" } {
  if (prev === 0) return { text: cur > 0 ? "new" : "flat", dir: cur > 0 ? "up" : "flat" };
  const pct = Math.round(((cur - prev) / prev) * 100);
  return { text: `${pct >= 0 ? "+" : ""}${pct}% vs prior 30d`, dir: pct > 2 ? "up" : pct < -2 ? "down" : "flat" };
}

function Bars({ rows, total, label }: { rows: Bar[]; total: number; label: string }) {
  if (rows.length === 0) return <EmptyState title={`No ${label} yet`} hint="Fills automatically as FairComparisons traffic comes in." />;
  // Scale bars by the largest row, not rows[0], the arrival list is in fixed
  // channel order (not sorted), so rows[0] is not the max and bars would overflow.
  const top = Math.max(...rows.map((r) => r.n), 1);
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      {rows.map((r) => (
        <div key={r.k} className="grid grid-cols-[1fr_90px] items-center gap-3 py-1">
          <div className="min-w-0">
            <div className="truncate text-[13px] text-gray-700" title={r.k}>{r.k}</div>
            <div className="mt-0.5 h-2 rounded bg-gray-100"><div className="h-2 rounded bg-teal-500" style={{ width: `${Math.max(Math.round((r.n / top) * 100), 3)}%` }} /></div>
          </div>
          <div className="text-right text-[13px] font-bold tabular-nums text-gray-900">
            {r.n.toLocaleString()}{total > 0 && <span className="ml-1 text-[11px] font-normal text-gray-400">{Math.round((r.n / total) * 100)}%</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

type GscDay = { date: string; clicks: number; impressions: number; position: number };
type GscRowT = { dimension_value: string; clicks: number; impressions: number; ctr: number; position: number };

export async function SeoTab() {
  const since28 = new Date(Date.now() - 28 * 86_400_000).toISOString().slice(0, 10);
  const [summaryRes, topRes, organicRes, refRes, dailyRes, gscDailyRes, gscQueryRes, gscPageRes] = await Promise.all([
    supabase.rpc("seo_summary", { p_days: 30 }),
    supabase.rpc("seo_top_pages", { p_days: 30, p_organic: false, p_limit: 15 }),
    supabase.rpc("seo_top_pages", { p_days: 30, p_organic: true, p_limit: 10 }),
    supabase.rpc("seo_referrers", { p_days: 30, p_limit: 8 }),
    supabase.rpc("seo_daily", { p_days: 14 }),
    supabase.from("fc_gsc_daily_stats").select("date, clicks, impressions, position").eq("dimension", "date").gte("date", since28).order("date", { ascending: true }),
    supabase.from("fc_gsc_daily_stats").select("dimension_value, clicks, impressions, ctr, position").eq("dimension", "query").order("impressions", { ascending: false }).limit(10),
    supabase.from("fc_gsc_daily_stats").select("dimension_value, clicks, impressions, ctr, position").eq("dimension", "page").order("impressions", { ascending: false }).limit(10),
  ]);
  const [coverageRes, universeCount] = await Promise.all([
    supabase.from("sg_index_coverage").select("date, agent_pages_with_impressions, agent_clicks, agent_impressions, sample_size, sample_indexed, sitemaps_submitted, families, notes").order("date", { ascending: true }).limit(60),
    countIndexableAgents(),
  ]);

  // ---- Google Search Console (organic SERP) ----
  const gscDays = (gscDailyRes.data ?? []) as GscDay[];
  const gscQueries = (gscQueryRes.data ?? []) as GscRowT[];
  const gscPages = (gscPageRes.data ?? []) as GscRowT[];
  const last = (arr: GscDay[], n: number) => arr.slice(-n);
  const sum = (arr: GscDay[], k: "clicks" | "impressions") => arr.reduce((s, r) => s + Number(r[k] || 0), 0);
  // GSC average position must be impression-weighted, not a flat daily mean:
  // sum(position * impressions) / sum(impressions). A busy day at rank 20 should
  // dominate the blended figure, not be offset one-for-one by a quiet day at rank 3.
  const weightedPos = (arr: GscDay[]) => {
    const impr = arr.reduce((s, r) => s + Number(r.impressions || 0), 0);
    if (!impr) return 0;
    return arr.reduce((s, r) => s + Number(r.position || 0) * Number(r.impressions || 0), 0) / impr;
  };
  const g7 = last(gscDays, 7), gPrior7 = gscDays.slice(-14, -7), g28 = last(gscDays, 28);
  const impr7 = sum(g7, "impressions"), clicks7 = sum(g7, "clicks");
  const imprPrior7 = sum(gPrior7, "impressions");
  const ctr7 = impr7 > 0 ? (clicks7 / impr7) * 100 : 0;
  const pos7 = weightedPos(g7);
  const hasGsc = gscDays.length > 0 || gscQueries.length > 0;
  const shortPath = (u: string) => { try { return new URL(u).pathname || u; } catch { return u; } };

  const sums = (summaryRes.data ?? []) as Summary[];
  const cur = sums.find((s) => s.win === "current");
  const prior = sums.find((s) => s.win === "prior");
  const n = (s: Summary | undefined, k: keyof Summary) => Number(s?.[k] ?? 0);

  const pv30 = n(cur, "pv");
  const pvPrior = n(prior, "pv");
  const organic30 = n(cur, "organic");
  const acquisition = n(cur, "organic") + n(cur, "direct") + n(cur, "referral");
  const mobilePct = pv30 ? Math.round((n(cur, "mobile") / pv30) * 100) : 0;

  const topPages: Bar[] = (topRes.data ?? []).map((r: { path: string; n: number }) => ({ k: r.path, n: Number(r.n) }));
  const organicPages: Bar[] = (organicRes.data ?? []).map((r: { path: string; n: number }) => ({ k: r.path, n: Number(r.n) }));
  const referrers: Bar[] = (refRes.data ?? []).map((r: { ref_host: string; n: number }) => ({ k: r.ref_host, n: Number(r.n) }));

  // 14-day sparkline (fill missing days with 0).
  const dailyMap = new Map<string, number>((dailyRes.data ?? []).map((r: { d: string; n: number }) => [r.d, Number(r.n)]));
  const daily: number[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    daily.push(dailyMap.get(d) ?? 0);
  }

  const noData = pv30 === 0 && pvPrior === 0;

  // ---- Indexation coverage (daily scoreboard vs the 29.7k universe) ----
  type FamilyCov = { url_count: number | null; pages_with_impressions: number | null; clicks: number | null; impressions: number | null };
  type CoverageRow = {
    date: string; agent_pages_with_impressions: number | null; agent_clicks: number | null;
    agent_impressions: number | null; sample_size: number | null; sample_indexed: number | null;
    sitemaps_submitted: number | null; families: { hire?: FamilyCov; directory?: FamilyCov } | null;
    notes: Record<string, unknown> | null;
  };
  const coverage = (coverageRes.data ?? []) as CoverageRow[];
  const latestCov = coverage[coverage.length - 1];
  const covSampleSize = coverage.reduce((s, r) => s + (r.sample_size ?? 0), 0);
  const covSampleIndexed = coverage.reduce((s, r) => s + (r.sample_indexed ?? 0), 0);
  const covRate = covSampleSize > 0 ? Math.round((covSampleIndexed / covSampleSize) * 100) : null;
  const latestSample = (latestCov?.notes as { sample?: { dense?: { size: number; indexed: number }; tail?: { size: number; indexed: number } } } | null)?.sample;
  const submitError = (latestCov?.notes as { submit_error?: string } | null)?.submit_error;

  // Per-family segments from the latest cron row. Agent pages reuse the
  // existing dedicated columns; hire/directory come from the families jsonb.
  const fam = (key: "hire" | "directory"): FamilyCov | null => latestCov?.families?.[key] ?? null;
  const familyRows = [
    {
      name: "Agent pages",
      urls: universeCount as number | null,
      pages: latestCov?.agent_pages_with_impressions ?? null,
      impressions: latestCov?.agent_impressions ?? null,
      clicks: latestCov?.agent_clicks ?? null,
    },
    {
      name: "Hire pages",
      urls: fam("hire")?.url_count ?? null,
      pages: fam("hire")?.pages_with_impressions ?? null,
      impressions: fam("hire")?.impressions ?? null,
      clicks: fam("hire")?.clicks ?? null,
    },
    {
      name: "Directory pages",
      urls: fam("directory")?.url_count ?? null,
      pages: fam("directory")?.pages_with_impressions ?? null,
      impressions: fam("directory")?.impressions ?? null,
      clicks: fam("directory")?.clicks ?? null,
    },
  ];
  const hasFamilies = !!latestCov?.families;
  const num = (v: number | null) => (v == null ? "n/a" : v.toLocaleString());

  return (
    <div className="space-y-8">
      <p className="text-sm text-gray-500">
        Two homebuilt sources, no Windsor: <strong>Search Console</strong> (Google organic: impressions, queries, SERP
        rank, pulled daily by the <code>gsc-sync</code> cron) and our own <strong>page-view log</strong> (page views, top
        pages, referrers, scoped to FairComparisons since <code>page_views</code> is shared with the NL app). Every metric
        below counts raw page-view rows, not distinct sessions.
      </p>

      {/* Google Search Console */}
      <div>
        <SectionHeading title="Search Console (Google organic)" hint="Impressions, clicks, CTR and SERP position, daily from the GSC API." />
        {hasGsc ? (
          <>
            <div className="mt-3 grid gap-4 sm:grid-cols-4">
              <StatCard title="Impressions 7d" value={impr7.toLocaleString()} delta={delta(impr7, imprPrior7)} sparkline={g28.map((d) => Number(d.impressions || 0))} color="#2980b9" />
              <StatCard title="Clicks 7d" value={clicks7.toLocaleString()} sub={`${sum(g28, "clicks").toLocaleString()} in 28d`} color="#059669" />
              <StatCard title="CTR 7d" value={`${ctr7.toFixed(1)}%`} sub="clicks / impressions" color="#8e44ad" />
              <StatCard title="Avg position 7d" value={pos7 ? pos7.toFixed(1) : "n/a"} sub="lower is better" color="#e67e22" />
            </div>
            <div className="mt-4 grid gap-6 lg:grid-cols-2">
              <div>
                <SectionHeading title="Top queries (28d)" hint="What people search to find you." />
                <Bars rows={gscQueries.map((q) => ({ k: q.dimension_value, n: q.impressions }))} total={gscQueries.reduce((s, q) => s + q.impressions, 0)} label="queries" />
              </div>
              <div>
                <SectionHeading title="Top pages in search (28d)" hint="By impressions." />
                <Bars rows={gscPages.map((p) => ({ k: shortPath(p.dimension_value), n: p.impressions }))} total={gscPages.reduce((s, p) => s + p.impressions, 0)} label="pages" />
              </div>
            </div>
          </>
        ) : (
          <div className="mt-3 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
            Not connected yet. Create a Google service account, enable the Search Console API, add its email as a user on the{" "}
            <code>sc-domain:fair-comparisons.com</code> property, then set <code>GSC_SA_EMAIL</code> + <code>GSC_SA_PRIVATE_KEY</code>.
            The daily <code>gsc-sync</code> cron fills this automatically.
          </div>
        )}
      </div>

      {/* Indexation coverage */}
      <div>
        <SectionHeading
          title="Indexation coverage (agent pages)"
          hint={`Daily scoreboard from the index-coverage cron vs the ${universeCount.toLocaleString()}-page scored universe. Sitemaps are resubmitted to GSC on every run.`}
        />
        {coverage.length > 0 ? (
          <>
            <div className="mt-3 grid gap-4 sm:grid-cols-4">
              <StatCard
                title="Pages with impressions 28d"
                value={(latestCov?.agent_pages_with_impressions ?? 0).toLocaleString()}
                sub={`of ${universeCount.toLocaleString()} in sitemap`}
                sparkline={coverage.map((r) => Number(r.agent_pages_with_impressions ?? 0))}
                color="#2980b9"
              />
              <StatCard
                title="Sample indexed rate"
                value={covRate == null ? "n/a" : `${covRate}%`}
                sub={`${covSampleIndexed}/${covSampleSize} URLs inspected (rolling)`}
                color="#059669"
              />
              <StatCard
                title="Latest sample: dense / tail"
                value={latestSample ? `${latestSample.dense?.indexed ?? 0}/${latestSample.dense?.size ?? 0} · ${latestSample.tail?.indexed ?? 0}/${latestSample.tail?.size ?? 0}` : "n/a"}
                sub="indexed / inspected per tier"
                color="#8e44ad"
              />
              <StatCard
                title="Sitemaps submitted"
                value={String(latestCov?.sitemaps_submitted ?? 0)}
                sub={submitError ? "submit error, see cron JSON" : "root + agent shards, daily"}
                color={submitError ? "#e74c3c" : "#e67e22"}
              />
            </div>
            {submitError && (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                Sitemap submission failed: <code>{String(submitError).slice(0, 200)}</code>. If this is a 403, the GSC
                service account is Restricted; upgrade it to Full in Search Console users to enable API submission.
              </div>
            )}

            <div className="mt-6">
              <SectionHeading
                title="Per-family breakdown"
                hint={`Latest cron row (${latestCov?.date ?? "n/a"}); GSC figures cover the trailing 28d window, lagging ~2 days. URL counts come from each family's own build source.`}
              />
              {hasFamilies ? (
                <div className="mt-3 overflow-x-auto rounded-xl border border-gray-200 bg-white p-4">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="border-b text-left text-[11px] font-medium uppercase tracking-wider text-gray-400">
                        <th className="pb-2 pr-4">Family</th>
                        <th className="pb-2 pr-4 text-right">URLs</th>
                        <th className="pb-2 pr-4 text-right">Pages w/ impressions 28d</th>
                        <th className="pb-2 pr-4 text-right">Impressions 28d</th>
                        <th className="pb-2 text-right">Clicks 28d</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {familyRows.map((r) => (
                        <tr key={r.name}>
                          <td className="py-2 pr-4 font-medium text-gray-900">{r.name}</td>
                          <td className="py-2 pr-4 text-right tabular-nums">{num(r.urls)}</td>
                          <td className="py-2 pr-4 text-right tabular-nums">
                            {num(r.pages)}
                            {r.urls != null && r.urls > 0 && r.pages != null && (
                              <span className="ml-1 text-[11px] text-gray-400">{Math.round((r.pages / r.urls) * 100)}%</span>
                            )}
                          </td>
                          <td className="py-2 pr-4 text-right tabular-nums">{num(r.impressions)}</td>
                          <td className="py-2 text-right tabular-nums">{num(r.clicks)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState title="No per-family rows yet" hint="Fills on the next index-coverage cron run (the families column is new)." />
              )}
            </div>
          </>
        ) : (
          <EmptyState title="No coverage rows yet" hint="Runs daily at 05:45 UTC (13:45 SGT), or trigger index-coverage from the Ops tab." />
        )}
      </div>

      {noData ? (
        <EmptyState title="No FairComparisons page views yet (30d)" hint="The site just launched. PageTracker logs every route change; this lights up as SG traffic grows." />
      ) : (
        <>
          <div>
            <SectionHeading
              title="Traffic (last 30 days)"
              hint={`FairComparisons only, from our own log.${n(cur, "bot") > 0 ? ` Excluding ${n(cur, "bot").toLocaleString()} bot views (form-spam heuristic).` : ""}`}
            />
            <div className="mt-3 grid gap-4 sm:grid-cols-4">
              <StatCard title="Page views 30d" value={pv30.toLocaleString()} delta={delta(pv30, pvPrior)} sparkline={daily} color="#2980b9" />
              <StatCard title="Organic (search) 30d" value={organic30.toLocaleString()} delta={delta(organic30, n(prior, "organic"))} sub="Google, Bing, etc." color="#059669" />
              <StatCard title="Pages viewed" value={n(cur, "distinct_pages").toLocaleString()} sub="distinct URLs (30d)" color="#8e44ad" />
              <StatCard title="Mobile share" value={`${mobilePct}%`} sub="of 30d views" color="#e67e22" />
            </div>
            {n(cur, "bot") > 0 && (
              <p className="mt-2 text-[11px] text-gray-400">
                Data quality: {pv30.toLocaleString()} human page views kept,{" "}
                {n(cur, "bot").toLocaleString()} bot views removed (
                {Math.round((n(cur, "bot") / (pv30 + n(cur, "bot"))) * 100)}% of raw traffic filtered as form-spam bots).
              </p>
            )}
          </div>

          <div>
            <SectionHeading title="How visitors arrive (30d)" hint="Referrer-classified. Internal = in-site navigation, excluded from acquisition." />
            <Bars
              label="sources"
              total={acquisition}
              rows={[
                { k: "Organic search", n: n(cur, "organic") },
                { k: "Direct / app", n: n(cur, "direct") },
                { k: "Referral", n: n(cur, "referral") },
              ].filter((x) => x.n > 0)}
            />
            {n(cur, "internal") > 0 && (
              <p className="mt-2 text-[11px] text-gray-400">
                Plus {n(cur, "internal").toLocaleString()} internal page-to-page views (in-site navigation, not counted as acquisition).
              </p>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <SectionHeading title="Top pages (30d)" hint="Most-viewed FairComparisons URLs." />
              <Bars rows={topPages} total={pv30} label="pages" />
            </div>
            <div>
              <SectionHeading title="Top organic landing pages (30d)" hint="Where search engines send traffic, your SEO winners." />
              <Bars rows={organicPages} total={organic30} label="organic pages" />
            </div>
          </div>

          {referrers.length > 0 && (
            <div>
              <SectionHeading title="Referring sites (30d)" hint="External non-search referrers." />
              <Bars rows={referrers} total={n(cur, "referral")} label="referrers" />
            </div>
          )}
        </>
      )}

      <p className="text-[11px] text-gray-400">
        Both sources are homebuilt and run on our own infrastructure (no Windsor, no third-party analytics SaaS). Search
        Console lags ~2 days; the page-view log is real-time. GSC is the SERP picture (what Google shows); the page-view
        log is what visitors actually do on-site once they arrive.
      </p>
    </div>
  );
}
