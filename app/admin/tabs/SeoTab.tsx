import { createClient } from "@supabase/supabase-js";
import { SectionHeading, StatCard, EmptyState } from "../shared";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Summary = { win: string; pv: number; organic: number; direct: number; referral: number; internal: number; distinct_pages: number; mobile: number };
type Bar = { k: string; n: number };

function delta(cur: number, prev: number): { text: string; dir: "up" | "down" | "flat" } {
  if (prev === 0) return { text: cur > 0 ? "new" : "flat", dir: cur > 0 ? "up" : "flat" };
  const pct = Math.round(((cur - prev) / prev) * 100);
  return { text: `${pct >= 0 ? "+" : ""}${pct}% vs prior 30d`, dir: pct > 2 ? "up" : pct < -2 ? "down" : "flat" };
}

function Bars({ rows, total, label }: { rows: Bar[]; total: number; label: string }) {
  if (rows.length === 0) return <EmptyState title={`No ${label} yet`} hint="Fills automatically as FairComparisons traffic comes in." />;
  // Scale bars by the largest row, not rows[0] — the arrival list is in fixed
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

  // ---- Google Search Console (organic SERP) ----
  const gscDays = (gscDailyRes.data ?? []) as GscDay[];
  const gscQueries = (gscQueryRes.data ?? []) as GscRowT[];
  const gscPages = (gscPageRes.data ?? []) as GscRowT[];
  const last = (arr: GscDay[], n: number) => arr.slice(-n);
  const sum = (arr: GscDay[], k: "clicks" | "impressions") => arr.reduce((s, r) => s + Number(r[k] || 0), 0);
  const avgPos = (arr: GscDay[]) => (arr.length ? arr.reduce((s, r) => s + Number(r.position || 0), 0) / arr.length : 0);
  const g7 = last(gscDays, 7), gPrior7 = gscDays.slice(-14, -7), g28 = last(gscDays, 28);
  const impr7 = sum(g7, "impressions"), clicks7 = sum(g7, "clicks");
  const imprPrior7 = sum(gPrior7, "impressions");
  const ctr7 = impr7 > 0 ? (clicks7 / impr7) * 100 : 0;
  const pos7 = avgPos(g7);
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

  return (
    <div className="space-y-8">
      <p className="text-sm text-gray-500">
        Two homebuilt sources, no Windsor: <strong>Search Console</strong> (Google organic — impressions, queries, SERP
        rank, pulled daily by the <code>gsc-sync</code> cron) and our own <strong>page-view log</strong> (sessions, top
        pages, referrers, scoped to FairComparisons since <code>page_views</code> is shared with the NL app).
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
              <StatCard title="Avg position 7d" value={pos7 ? pos7.toFixed(1) : "—"} sub="lower is better" color="#e67e22" />
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

      {noData ? (
        <EmptyState title="No FairComparisons page views yet (30d)" hint="The site just launched. PageTracker logs every route change; this lights up as SG traffic grows." />
      ) : (
        <>
          <div>
            <SectionHeading title="Traffic (last 30 days)" hint="FairComparisons only, from our own log." />
            <div className="mt-3 grid gap-4 sm:grid-cols-4">
              <StatCard title="Page views 30d" value={pv30.toLocaleString()} delta={delta(pv30, pvPrior)} sparkline={daily} color="#2980b9" />
              <StatCard title="Organic (search) 30d" value={organic30.toLocaleString()} delta={delta(organic30, n(prior, "organic"))} sub="Google, Bing, etc." color="#059669" />
              <StatCard title="Pages viewed" value={n(cur, "distinct_pages").toLocaleString()} sub="distinct URLs (30d)" color="#8e44ad" />
              <StatCard title="Mobile share" value={`${mobilePct}%`} sub="of 30d views" color="#e67e22" />
            </div>
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
              <SectionHeading title="Top organic landing pages (30d)" hint="Where search engines send traffic — your SEO winners." />
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
