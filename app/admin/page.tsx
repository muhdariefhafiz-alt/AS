"use client";

import { useState, useEffect, useCallback } from "react";

type Metrics = {
  funnel: {
    allTime: Record<string, number> | null;
    last7d: Record<string, number>;
    today: Record<string, number>;
  };
  daily: Record<string, Record<string, number>>;
  topProfilePages: { name: string; count: number }[];
  topEmailSources: { name: string; count: number }[];
  email: {
    total: number;
    last7d: number;
    bySource: { source: string; count: number }[];
  };
  claims: {
    total: number;
    withProfile: number;
  };
  recentEvents: {
    event: string;
    agent_id: number | null;
    agent_slug: string | null;
    source: string | null;
    page_path: string | null;
    created_at: string;
  }[];
};

const FUNNEL_STEPS = [
  { key: "profile_view", label: "Profile Views", color: "bg-blue-500" },
  { key: "claim_banner_view", label: "Banner Views", color: "bg-indigo-500" },
  { key: "claim_click", label: "Claim Clicks", color: "bg-purple-500" },
  { key: "claim_submit", label: "Claims Submitted", color: "bg-teal-500" },
  { key: "claim_verified", label: "Claims Verified", color: "bg-green-500" },
  { key: "email_capture", label: "Emails Captured", color: "bg-amber-500" },
  { key: "profile_edit", label: "Profile Edits", color: "bg-rose-500" },
];

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d ago`;
}

function conversionRate(from: number, to: number): string {
  if (!from) return "-";
  return `${((to / from) * 100).toFixed(1)}%`;
}

export default function AdminPage() {
  const [key, setKey] = useState("");
  const [authed, setAuthed] = useState(false);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState<"today" | "7d" | "all">("7d");

  const fetchMetrics = useCallback(async (adminKey: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/metrics?key=${encodeURIComponent(adminKey)}`);
      if (res.status === 401) {
        setError("Invalid admin key.");
        setAuthed(false);
        return;
      }
      const data = await res.json();
      setMetrics(data);
      setAuthed(true);
    } catch {
      setError("Failed to load metrics.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh every 60s
  useEffect(() => {
    if (!authed || !key) return;
    const interval = setInterval(() => fetchMetrics(key), 60000);
    return () => clearInterval(interval);
  }, [authed, key, fetchMetrics]);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    fetchMetrics(key);
  }

  if (!authed) {
    return (
      <div className="mx-auto max-w-sm px-5 py-20">
        <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
        <form onSubmit={handleLogin} className="mt-6">
          <label className="block text-sm font-medium text-gray-700">Admin key</label>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            placeholder="Enter admin secret key"
            autoFocus
          />
          {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="mt-3 w-full rounded-lg bg-teal-600 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {loading ? "Loading..." : "Access Dashboard"}
          </button>
        </form>
      </div>
    );
  }

  if (!metrics) return null;

  const funnelData = period === "today" ? metrics.funnel.today : period === "7d" ? metrics.funnel.last7d : (metrics.funnel.allTime ?? {});
  const maxFunnel = Math.max(...FUNNEL_STEPS.map(s => funnelData[s.key] || 0), 1);

  // Daily chart data (last 14 days)
  const dailyKeys = Object.keys(metrics.daily).sort().slice(-14);

  return (
    <div className="mx-auto max-w-[1200px] px-5 py-8 md:px-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Growth Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">FairComparisons funnel metrics, real-time</p>
        </div>
        <button
          onClick={() => fetchMetrics(key)}
          disabled={loading}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard label="Profile Views" value={funnelData["profile_view"] || 0} sub={period} />
        <KpiCard label="Claim Clicks" value={funnelData["claim_click"] || 0} sub={period} accent />
        <KpiCard label="Claims Submitted" value={funnelData["claim_submit"] || 0} sub={period} />
        <KpiCard label="Email Subscribers" value={metrics.email.total} sub="total" accent />
        <KpiCard label="Claimed Agents" value={metrics.claims.total} sub={`${metrics.claims.withProfile} with profile`} />
      </div>

      {/* Period toggle */}
      <div className="mt-8 flex gap-1 rounded-lg bg-gray-100 p-1 w-fit">
        {(["today", "7d", "all"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${period === p ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            {p === "today" ? "Today" : p === "7d" ? "Last 7 days" : "All time"}
          </button>
        ))}
      </div>

      {/* Funnel Visualization */}
      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">Conversion Funnel</h2>
          <div className="mt-5 space-y-3">
            {FUNNEL_STEPS.map((step, i) => {
              const count = funnelData[step.key] || 0;
              const barW = maxFunnel > 0 ? Math.max((count / maxFunnel) * 100, 2) : 2;
              const prevCount = i > 0 ? (funnelData[FUNNEL_STEPS[i - 1].key] || 0) : 0;
              return (
                <div key={step.key}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{step.label}</span>
                    <div className="flex items-center gap-3">
                      {i > 0 && prevCount > 0 && (
                        <span className="text-xs text-gray-400">
                          {conversionRate(prevCount, count)}
                        </span>
                      )}
                      <span className="font-bold text-gray-900 tabular-nums w-12 text-right">{count.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="mt-1 h-3 rounded-full bg-gray-100">
                    <div className={`h-3 rounded-full ${step.color} transition-all duration-500`} style={{ width: `${barW}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Daily Activity */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">Daily Activity (14 days)</h2>
          {dailyKeys.length === 0 ? (
            <p className="mt-5 text-sm text-gray-400">No events recorded yet.</p>
          ) : (
            <div className="mt-5 space-y-2">
              {dailyKeys.map((day) => {
                const dayData = metrics.daily[day];
                const total = Object.values(dayData).reduce((s, v) => s + v, 0);
                const maxDay = Math.max(...dailyKeys.map(d => Object.values(metrics.daily[d]).reduce((s, v) => s + v, 0)), 1);
                const barW = Math.max((total / maxDay) * 100, 3);
                return (
                  <div key={day} className="flex items-center gap-3">
                    <span className="w-20 shrink-0 text-xs text-gray-400 tabular-nums">{day.slice(5)}</span>
                    <div className="flex-1 h-5 rounded bg-gray-50">
                      <div className="h-5 rounded bg-teal-400 transition-all duration-500" style={{ width: `${barW}%` }} />
                    </div>
                    <span className="w-10 text-right text-xs font-medium text-gray-600 tabular-nums">{total}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        {/* Top Profile Pages */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">Top Profile Pages (7d)</h2>
          {metrics.topProfilePages.length === 0 ? (
            <p className="mt-4 text-sm text-gray-400">No profile views yet.</p>
          ) : (
            <div className="mt-4 space-y-2">
              {metrics.topProfilePages.slice(0, 15).map((p, i) => (
                <div key={p.name} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 text-right text-xs text-gray-300">{i + 1}</span>
                    <span className="truncate text-xs text-gray-700">{p.name.replace("/property-agents/agent/", "")}</span>
                  </div>
                  <span className="shrink-0 text-xs font-bold text-gray-900 tabular-nums">{p.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Email Sources */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">Email Subscribers by Source</h2>
          <div className="mt-2 mb-4 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-gray-900">{metrics.email.total}</span>
            <span className="text-sm text-gray-400">total</span>
            {metrics.email.last7d > 0 && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">+{metrics.email.last7d} this week</span>
            )}
          </div>
          {metrics.email.bySource.length === 0 ? (
            <p className="text-sm text-gray-400">No subscribers yet.</p>
          ) : (
            <div className="space-y-2">
              {metrics.email.bySource.map((s) => (
                <div key={s.source} className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">{s.source}</span>
                  <span className="text-xs font-bold text-gray-900 tabular-nums">{s.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Agent Claims */}
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">Agent Claims</h2>
          <div className="mt-4 space-y-4">
            <div>
              <span className="text-3xl font-extrabold text-gray-900">{metrics.claims.total}</span>
              <p className="text-sm text-gray-400">agents claimed</p>
            </div>
            <div>
              <span className="text-3xl font-extrabold text-teal-600">{metrics.claims.withProfile}</span>
              <p className="text-sm text-gray-400">with bio, photo, or WhatsApp</p>
            </div>
            {metrics.claims.total > 0 && (
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-500">
                  Profile completion rate:{" "}
                  <span className="font-bold text-gray-900">
                    {((metrics.claims.withProfile / metrics.claims.total) * 100).toFixed(0)}%
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Events */}
      <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">Recent Events</h2>
        {metrics.recentEvents.length === 0 ? (
          <p className="mt-4 text-sm text-gray-400">No events recorded yet. Events will appear here once users interact with the site.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
                  <th className="pb-2 pr-4 font-medium">Event</th>
                  <th className="pb-2 pr-4 font-medium">Agent</th>
                  <th className="pb-2 pr-4 font-medium">Source</th>
                  <th className="pb-2 pr-4 font-medium">Page</th>
                  <th className="pb-2 font-medium text-right">When</th>
                </tr>
              </thead>
              <tbody>
                {metrics.recentEvents.map((ev, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-2 pr-4">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${eventColor(ev.event)}`}>
                        {ev.event}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-xs text-gray-600">
                      {ev.agent_slug ? (
                        <a href={`/property-agents/agent/${ev.agent_slug}`} className="text-teal-600 hover:underline" target="_blank" rel="noopener noreferrer">
                          {ev.agent_slug}
                        </a>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-xs text-gray-500">{ev.source || "-"}</td>
                    <td className="py-2 pr-4 max-w-[200px] truncate text-xs text-gray-400">{ev.page_path || "-"}</td>
                    <td className="py-2 text-right text-xs text-gray-400">{formatTime(ev.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="mt-6 text-center text-[11px] text-gray-300">Auto-refreshes every 60 seconds</p>
    </div>
  );
}

function KpiCard({ label, value, sub, accent }: { label: string; value: number; sub: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <p className="text-xs font-medium text-gray-400">{label}</p>
      <p className={`mt-1 text-3xl font-extrabold tabular-nums ${accent ? "text-teal-600" : "text-gray-900"}`}>
        {value.toLocaleString()}
      </p>
      <p className="mt-0.5 text-xs text-gray-400">{sub}</p>
    </div>
  );
}

function eventColor(event: string): string {
  switch (event) {
    case "profile_view": return "bg-blue-100 text-blue-700";
    case "claim_banner_view": return "bg-indigo-100 text-indigo-700";
    case "claim_click": return "bg-purple-100 text-purple-700";
    case "claim_submit": return "bg-teal-100 text-teal-700";
    case "claim_verified": return "bg-green-100 text-green-700";
    case "email_capture": return "bg-amber-100 text-amber-700";
    case "profile_edit": return "bg-rose-100 text-rose-700";
    default: return "bg-gray-100 text-gray-700";
  }
}
