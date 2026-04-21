import { createClient } from "@supabase/supabase-js";
import { SectionHeading, StatCard, EmptyState } from "../shared";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function SeoTab() {
  const [gscDaily, gscQueries, gscPages, rankTracking, indexationLog, ga4Daily, ga4Sources] = await Promise.all([
    supabase
      .from("fc_gsc_daily_stats")
      .select("date, clicks, impressions, ctr, position, dimension")
      .eq("dimension", "date")
      .order("date", { ascending: false })
      .limit(60),
    supabase
      .from("fc_gsc_daily_stats")
      .select("dimension_value, clicks, impressions, position")
      .eq("dimension", "query")
      .order("impressions", { ascending: false })
      .limit(20),
    supabase
      .from("fc_gsc_daily_stats")
      .select("dimension_value, clicks, impressions, position")
      .eq("dimension", "page")
      .order("impressions", { ascending: false })
      .limit(20),
    supabase.from("fc_rank_tracking").select("keyword, our_rank, checked_at").order("checked_at", { ascending: false }).limit(50),
    supabase.from("fc_gsc_indexation_log").select("verdict, coverage_state"),
    supabase
      .from("fc_ga4_daily_stats")
      .select("date, active_users, sessions, page_views, bounce_rate, avg_session_duration, engaged_sessions")
      .order("date", { ascending: false })
      .limit(60),
    supabase
      .from("fc_ga4_traffic_sources")
      .select("source_medium, sessions, active_users")
      .order("sessions", { ascending: false })
      .limit(10),
  ]);

  const daily = (gscDaily.data ?? []).slice().reverse();
  const daily7 = daily.slice(-7);
  const daily28 = daily.slice(-28);
  const prior7 = daily.slice(-14, -7);

  const sum = (rows: typeof daily, field: "clicks" | "impressions") =>
    rows.reduce((s, r) => s + (Number(r[field]) || 0), 0);
  const avgPos = (rows: typeof daily) => {
    const withPos = rows.filter((r) => r.position != null);
    if (withPos.length === 0) return 0;
    return withPos.reduce((s, r) => s + Number(r.position), 0) / withPos.length;
  };

  const clicks7 = sum(daily7, "clicks");
  const impressions7 = sum(daily7, "impressions");
  const clicks7Prior = sum(prior7, "clicks");
  const impressions7Prior = sum(prior7, "impressions");
  const pos7 = avgPos(daily7);
  const posPrior = avgPos(prior7);
  const ctr7 = impressions7 ? (clicks7 / impressions7) * 100 : 0;

  const clicks28 = sum(daily28, "clicks");
  const impressions28 = sum(daily28, "impressions");

  const dailyImpressions = daily.map((d) => Number(d.impressions) || 0);
  const dailyClicks = daily.map((d) => Number(d.clicks) || 0);

  const noGsc = daily.length === 0;

  // Indexation aggregate
  const indexAgg: Record<string, number> = {};
  for (const r of indexationLog.data ?? []) {
    const key = r.verdict || r.coverage_state || "unknown";
    indexAgg[key] = (indexAgg[key] || 0) + 1;
  }

  const ga4 = (ga4Daily.data ?? []).slice().reverse();
  const ga47 = ga4.slice(-7);
  const ga4Prior = ga4.slice(-14, -7);
  const sumGa = (rows: typeof ga4, field: "active_users" | "sessions" | "page_views" | "engaged_sessions") =>
    rows.reduce((s, r) => s + (Number(r[field]) || 0), 0);
  const users7 = sumGa(ga47, "active_users");
  const sessions7 = sumGa(ga47, "sessions");
  const pageviews7 = sumGa(ga47, "page_views");
  const engaged7 = sumGa(ga47, "engaged_sessions");
  const usersPrior = sumGa(ga4Prior, "active_users");
  const engagementRate = sessions7 ? (engaged7 / sessions7) * 100 : 0;
  const noGa4 = ga4.length === 0;

  const sources = (ga4Sources.data ?? []) as Array<{
    source_medium: string;
    sessions: number;
    active_users: number;
  }>;

  return (
    <div className="space-y-8">
      {noGsc && noGa4 && (
        <div className="rounded-md border-2 border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-bold text-amber-900">Windsor not configured for fair-comparisons.com</p>
          <p className="mt-2 text-sm text-amber-800 leading-relaxed">
            Wire Windsor destinations to these 5 tables (same schema as NL):
            <code className="ml-1 rounded bg-amber-100 px-1 py-0.5 text-xs">fc_gsc_daily_stats</code>,{" "}
            <code className="rounded bg-amber-100 px-1 py-0.5 text-xs">fc_gsc_indexation_log</code>,{" "}
            <code className="rounded bg-amber-100 px-1 py-0.5 text-xs">fc_ga4_daily_stats</code>,{" "}
            <code className="rounded bg-amber-100 px-1 py-0.5 text-xs">fc_ga4_traffic_sources</code>,{" "}
            <code className="rounded bg-amber-100 px-1 py-0.5 text-xs">fc_rank_tracking</code>.
          </p>
        </div>
      )}

      <div>
        <SectionHeading title="GSC 7 dagen (vs. vorige 7)" hint="Hoofdkanaal voor gratis acquisitie." />
        {noGsc ? (
          <EmptyState title="Geen GSC data" hint="fc_gsc_daily_stats is leeg." />
        ) : (
          <div className="grid gap-3 md:grid-cols-4">
            <StatCard
              title="Impressions 7d"
              value={impressions7.toLocaleString()}
              delta={{
                text: impressions7Prior
                  ? `${impressions7 - impressions7Prior > 0 ? "+" : ""}${impressions7 - impressions7Prior} v. vorige 7d`
                  : "eerste meting",
                dir: impressions7 >= impressions7Prior ? "up" : "down",
              }}
              sparkline={dailyImpressions}
              color="#2980b9"
            />
            <StatCard
              title="Clicks 7d"
              value={clicks7.toLocaleString()}
              delta={{
                text: clicks7Prior
                  ? `${clicks7 - clicks7Prior > 0 ? "+" : ""}${clicks7 - clicks7Prior} v. vorige 7d`
                  : "eerste meting",
                dir: clicks7 >= clicks7Prior ? "up" : "down",
              }}
              sparkline={dailyClicks}
              color="#059669"
            />
            <StatCard title="CTR 7d" value={`${ctr7.toFixed(2)}%`} sub="clicks / impressions" color="#e67e22" />
            <StatCard
              title="Avg position 7d"
              value={pos7 ? pos7.toFixed(1) : "-"}
              delta={posPrior ? { text: `v. ${posPrior.toFixed(1)}`, dir: pos7 < posPrior ? "up" : pos7 > posPrior ? "down" : "flat" } : undefined}
              sub="lager = beter"
            />
          </div>
        )}
        {!noGsc && (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <StatCard title="Impressions 28d" value={impressions28.toLocaleString()} color="#2980b9" />
            <StatCard title="Clicks 28d" value={clicks28.toLocaleString()} color="#059669" />
          </div>
        )}
      </div>

      <div>
        <SectionHeading title="GA4 traffic 7 dagen" hint="Echte bezoekers." />
        {noGa4 ? (
          <EmptyState title="Geen GA4 data" hint="fc_ga4_daily_stats is leeg." />
        ) : (
          <div className="grid gap-3 md:grid-cols-4">
            <StatCard
              title="Active users 7d"
              value={users7.toLocaleString()}
              delta={usersPrior ? { text: `v. ${usersPrior}`, dir: users7 >= usersPrior ? "up" : "down" } : undefined}
              sparkline={ga4.map((r) => Number(r.active_users) || 0)}
              color="#059669"
            />
            <StatCard
              title="Sessions 7d"
              value={sessions7.toLocaleString()}
              sparkline={ga4.map((r) => Number(r.sessions) || 0)}
              color="#2980b9"
            />
            <StatCard
              title="Pageviews 7d"
              value={pageviews7.toLocaleString()}
              sparkline={ga4.map((r) => Number(r.page_views) || 0)}
              color="#e67e22"
            />
            <StatCard title="Engagement rate" value={`${engagementRate.toFixed(0)}%`} sub={`${engaged7} engaged`} color="#2980b9" />
          </div>
        )}
      </div>

      {sources.length > 0 && (
        <div>
          <SectionHeading title="Top traffic sources (7d)" />
          <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-[10px] font-bold uppercase tracking-widest text-gray-500">
                <tr>
                  <th className="px-3 py-2">Source / medium</th>
                  <th className="px-3 py-2 text-right">Sessions</th>
                  <th className="px-3 py-2 text-right">Users</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((s) => (
                  <tr key={s.source_medium} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-mono text-xs">{s.source_medium}</td>
                    <td className="px-3 py-2 text-right font-semibold">{Number(s.sessions).toLocaleString()}</td>
                    <td className="px-3 py-2 text-right">{Number(s.active_users).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {Object.keys(indexAgg).length > 0 && (
        <div>
          <SectionHeading title="Indexation status" />
          <div className="grid gap-3 md:grid-cols-3">
            {Object.entries(indexAgg).map(([k, v]) => (
              <StatCard key={k} title={k} value={v.toLocaleString()} />
            ))}
          </div>
        </div>
      )}

      <div>
        <SectionHeading title="Top 20 queries (by impressions)" />
        {(gscQueries.data ?? []).length === 0 ? (
          <EmptyState title="Nog geen query data" />
        ) : (
          <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-[10px] font-bold uppercase tracking-widest text-gray-500">
                <tr>
                  <th className="px-3 py-2">Query</th>
                  <th className="px-3 py-2 text-right">Impr.</th>
                  <th className="px-3 py-2 text-right">Clicks</th>
                  <th className="px-3 py-2 text-right">Pos.</th>
                </tr>
              </thead>
              <tbody>
                {(gscQueries.data ?? []).map((q) => (
                  <tr key={q.dimension_value} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-mono text-xs">{q.dimension_value}</td>
                    <td className="px-3 py-2 text-right">{Number(q.impressions).toLocaleString()}</td>
                    <td className="px-3 py-2 text-right">{Number(q.clicks).toLocaleString()}</td>
                    <td className="px-3 py-2 text-right">{q.position ? Number(q.position).toFixed(1) : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <SectionHeading title="Top 20 landing pages (by impressions)" />
        {(gscPages.data ?? []).length === 0 ? (
          <EmptyState title="Nog geen page data" />
        ) : (
          <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-[10px] font-bold uppercase tracking-widest text-gray-500">
                <tr>
                  <th className="px-3 py-2">Page</th>
                  <th className="px-3 py-2 text-right">Impr.</th>
                  <th className="px-3 py-2 text-right">Clicks</th>
                  <th className="px-3 py-2 text-right">Pos.</th>
                </tr>
              </thead>
              <tbody>
                {(gscPages.data ?? []).map((p) => (
                  <tr key={p.dimension_value} className="border-t border-gray-100">
                    <td className="max-w-[400px] truncate px-3 py-2 font-mono text-[11px]">{p.dimension_value}</td>
                    <td className="px-3 py-2 text-right">{Number(p.impressions).toLocaleString()}</td>
                    <td className="px-3 py-2 text-right">{Number(p.clicks).toLocaleString()}</td>
                    <td className="px-3 py-2 text-right">{p.position ? Number(p.position).toFixed(1) : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <SectionHeading title="Rank tracking (last 50 checks)" />
        {(rankTracking.data ?? []).length === 0 ? (
          <EmptyState title="Geen rank tracking data" hint="fc_rank_tracking is leeg." />
        ) : (
          <div className="overflow-hidden rounded-md border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-[10px] font-bold uppercase tracking-widest text-gray-500">
                <tr>
                  <th className="px-3 py-2">Keyword</th>
                  <th className="px-3 py-2 text-right">Rank</th>
                  <th className="px-3 py-2">Checked</th>
                </tr>
              </thead>
              <tbody>
                {(rankTracking.data ?? []).map((r, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-mono text-xs">{r.keyword}</td>
                    <td className="px-3 py-2 text-right font-semibold">{r.our_rank != null ? `#${r.our_rank}` : "-"}</td>
                    <td className="px-3 py-2 text-xs text-gray-500">
                      {r.checked_at ? new Date(r.checked_at).toLocaleDateString("en-SG") : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
