"use client";

import { useEffect, useState } from "react";

// Monthly performance report vs the agent's primary area (Professional+).
// Elite adds the benchmarking block. Locked states never show fake numbers:
// they describe the report and price it; every rendered number is real, with
// its window printed. House choreography: staged cue reveal on data arrival.

type Report = {
  tier: string;
  month: string;
  standing: {
    agent_rank: number; agent_pct: number | null; area_name: string; area_type: string;
    total_agents?: number | null;
    movement: { delta: number; prev_month: string } | null;
  } | null;
  demand: {
    window_days: number;
    views: { current: number; prior: number };
    contact_clicks: { current: number; prior: number };
    shortlists: { current: number; prior: number };
  };
  market: {
    farm?: {
      active_agents_12mo?: number; deals_12mo?: number; deals_per_agent?: number; top5_share_pct?: number;
    } | null;
    pricing?: { median_price?: number; median_psf?: number; p25_price?: number; p75_price?: number; n?: number; window_months?: number } | null;
  } | null;
  benchmark: {
    my_sales_12mo: number; my_rank_by_deals: number | null; of_active_agents: number | null;
    area_deals_per_agent: number | null; top5_share_pct: number | null;
  } | null;
};

function Delta({ current, prior }: { current: number; prior: number }) {
  const diff = current - prior;
  if (prior === 0 && current === 0) return <span className="muted small">no change</span>;
  const up = diff > 0;
  return (
    <span className="small" style={{ color: up ? "var(--ok)" : diff < 0 ? "var(--danger)" : "var(--slate)", fontWeight: 600 }}>
      {up ? "▲" : diff < 0 ? "▼" : "•"} {Math.abs(diff)} vs prior 30d
    </span>
  );
}

const money = (n?: number | null) =>
  typeof n === "number" ? `S$${n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` : Math.round(n).toLocaleString()}` : "–";

export default function PerformancePanel({ onUpgrade }: { onUpgrade?: () => void }) {
  const [state, setState] = useState<"loading" | "locked" | "ready" | "empty" | "error">("loading");
  const [report, setReport] = useState<Report | null>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/dashboard/performance");
        const data = await res.json();
        if (cancelled) return;
        if (res.status === 403 && data.upgrade) { setState("locked"); return; }
        if (!res.ok) { setState("error"); return; }
        setReport(data);
        setState(data.standing || data.market ? "ready" : "empty");
        requestAnimationFrame(() => requestAnimationFrame(() => setOn(true)));
      } catch {
        if (!cancelled) setState("error");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const cue = (delay: number): React.CSSProperties => ({
    opacity: on ? 1 : 0,
    transform: on ? "translateY(0)" : "translateY(8px)",
    transition: `opacity .5s cubic-bezier(.25,1,.35,1) ${delay}ms, transform .5s cubic-bezier(.25,1,.35,1) ${delay}ms`,
  });

  if (state === "loading") return null;

  if (state === "locked") {
    return (
      <div className="fc-scene fc-scene--planner" style={{ padding: "clamp(14px,2.2vw,22px)" }}>
        <div className="fc-scene__card" style={{ padding: "clamp(18px,3vw,24px)" }}>
          <div className="fc-row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
            <p className="kicker" style={{ margin: 0 }}>Performance report</p>
            <span className="fc-badge" style={{ background: "var(--blue-wash)", color: "var(--blue-deep)" }}>Professional</span>
          </div>
          <h3 className="serif" style={{ fontSize: 20, margin: "10px 0 0" }}>
            Your month vs your district, <span className="italic-serif">in one report.</span>
          </h3>
          <ul className="muted" style={{ margin: "12px 0 0", paddingLeft: 18, display: "flex", flexDirection: "column", gap: 6, fontSize: 14 }}>
            <li>Your AgentScore standing and real month-over-month movement</li>
            <li>Profile views, contact clicks and shortlist appearances, 30 days vs the prior 30</li>
            <li>Your area&apos;s competition picture and (districts) pricing, 12-month windows</li>
            <li>Elite adds benchmarking against the active field, aggregate only</li>
          </ul>
          <div className="fc-row" style={{ gap: 10, marginTop: 16 }}>
            {onUpgrade && (
              <button onClick={onUpgrade} className="fc-btn fc-btn--primary fc-btn--hairline">
                Unlock with Professional · S$69/mo
              </button>
            )}
            <a href="/for-agents" className="fc-btn fc-btn--quiet">All plans</a>
          </div>
          <p className="muted small" style={{ marginTop: 10 }}>Tools only. Never changes your ranking.</p>
        </div>
      </div>
    );
  }

  if (state === "error" || state === "empty" || !report) {
    return (
      <div className="fc-card" style={{ padding: 18 }}>
        <p className="kicker" style={{ margin: 0 }}>Performance report</p>
        <p className="muted small" style={{ marginTop: 8 }}>
          {state === "empty"
            ? "Not enough area data to build your report yet. It fills in as your area's CEA records and your profile activity accrue."
            : "The report could not load. Refresh to try again."}
        </p>
      </div>
    );
  }

  const s = report.standing;
  const farm = report.market?.farm ?? null;
  const pricing = report.market?.pricing ?? null;
  const bm = report.benchmark;

  return (
    <div className="fc-scene fc-scene--planner" style={{ padding: "clamp(14px,2.2vw,22px)" }}>
      <div className="fc-scene__card" style={{ padding: "clamp(18px,3vw,24px)" }}>
        <div className="fc-row" style={{ ...cue(0), justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
          <p className="kicker" style={{ margin: 0 }}>Performance report</p>
          <span className="mono" style={{ fontSize: 11.5, color: "var(--slate)" }}>{report.month}</span>
        </div>

        {s && (
          <div style={{ ...cue(120), marginTop: 14 }}>
            <p className="serif" style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>
              #{s.agent_rank}
              {typeof s.total_agents === "number" ? ` of ${s.total_agents.toLocaleString()}` : ""}{" "}
              <span className="muted" style={{ fontSize: 14, fontWeight: 400, fontFamily: "var(--font-sans)" }}>
                in {s.area_name}{s.area_type === "town" ? " (HDB)" : ""} by AgentScore
              </span>
            </p>
            <div className="fc-row" style={{ gap: 10, marginTop: 6, flexWrap: "wrap" }}>
              {typeof s.agent_pct === "number" && (
                <span className="fc-badge" style={{ background: "var(--blue-wash)", color: "var(--blue-deep)" }}>
                  Top {Math.max(1, Math.round(100 - s.agent_pct))}%
                </span>
              )}
              {s.movement && (
                <span className="small" style={{ color: s.movement.delta > 0 ? "var(--ok)" : s.movement.delta < 0 ? "var(--danger)" : "var(--slate)", fontWeight: 600 }}>
                  {s.movement.delta > 0 ? `▲ up ${s.movement.delta} since ${s.movement.prev_month.slice(0, 7)}`
                    : s.movement.delta < 0 ? `▼ down ${Math.abs(s.movement.delta)} since ${s.movement.prev_month.slice(0, 7)}`
                    : "steady month over month"}
                </span>
              )}
            </div>
          </div>
        )}

        <div style={{ ...cue(240), marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
          {([
            ["Profile views", report.demand.views],
            ["Contact clicks", report.demand.contact_clicks],
            ["Shortlist appearances", report.demand.shortlists],
          ] as [string, { current: number; prior: number }][]).map(([label, v]) => (
            <div key={label} className="fc-card" style={{ padding: "12px 14px", background: "#fff" }}>
              <p className="serif tnum" style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>{v.current.toLocaleString()}</p>
              <p className="kicker" style={{ margin: "2px 0 4px" }}>{label} · 30d</p>
              <Delta current={v.current} prior={v.prior} />
            </div>
          ))}
        </div>

        {farm && (
          <div style={{ ...cue(360), marginTop: 16 }}>
            <p className="kicker" style={{ margin: "0 0 8px" }}>Your market, last 12 months</p>
            <div className="fc-row" style={{ gap: 16, flexWrap: "wrap", fontSize: 13.5 }}>
              <span><strong className="tnum">{(farm.deals_12mo ?? 0).toLocaleString()}</strong> <span className="muted">deals</span></span>
              <span><strong className="tnum">{(farm.active_agents_12mo ?? 0).toLocaleString()}</strong> <span className="muted">active agents</span></span>
              {typeof farm.deals_per_agent === "number" && (
                <span><strong className="tnum">{farm.deals_per_agent}</strong> <span className="muted">deals per active agent</span></span>
              )}
              {typeof farm.top5_share_pct === "number" && (
                <span><strong className="tnum">{farm.top5_share_pct}%</strong> <span className="muted">done by the top 5 agents</span></span>
              )}
            </div>
            {pricing && typeof pricing.median_price === "number" && (
              <p className="muted small" style={{ marginTop: 8 }}>
                District pricing, last {pricing.window_months ?? 6} months: median {money(pricing.median_price)}
                {typeof pricing.median_psf === "number" ? ` · ${money(pricing.median_psf)} psf` : ""}
                {typeof pricing.p25_price === "number" && typeof pricing.p75_price === "number"
                  ? ` · middle half ${money(pricing.p25_price)} to ${money(pricing.p75_price)}` : ""}
                {typeof pricing.n === "number" ? ` · ${pricing.n.toLocaleString()} sales` : ""}
              </p>
            )}
          </div>
        )}

        {bm ? (
          <div className="fc-scene fc-scene--grow" style={{ ...cue(480), marginTop: 16, padding: "clamp(10px,1.6vw,14px)" }}>
            <div className="fc-scene__card" style={{ padding: "14px 16px" }}>
              <div className="fc-row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
                <p className="kicker" style={{ margin: 0 }}>Benchmarking</p>
                <span className="fc-badge" style={{ background: "#78350f", color: "#fde68a" }}>Elite</span>
              </div>
              <p style={{ marginTop: 8, fontSize: 14.5 }}>
                Your <strong className="tnum">{bm.my_sales_12mo.toLocaleString()}</strong> recorded sales in 12 months
                {bm.my_rank_by_deals && bm.of_active_agents
                  ? <> place you <strong>#{bm.my_rank_by_deals}</strong> of {bm.of_active_agents.toLocaleString()} active agents in your area.</>
                  : " in your area."}
                {typeof bm.area_deals_per_agent === "number" && (
                  <> The active field averages <strong className="tnum">{bm.area_deals_per_agent}</strong> deals per agent
                  {typeof bm.top5_share_pct === "number" ? <>, with {bm.top5_share_pct}% of volume held by the top 5.</> : "."}</>
                )}
              </p>
              <p className="muted small" style={{ marginTop: 6 }}>Aggregate CEA records only; no individual peer is named.</p>
            </div>
          </div>
        ) : report.tier === "professional" ? (
          <p className="muted small" style={{ ...cue(480), marginTop: 12 }}>
            Benchmarking against the active field unlocks with Elite.
          </p>
        ) : null}

        <p className="mono" style={{ ...cue(600), marginTop: 14, fontSize: 11, color: "var(--slate)" }}>
          Windows printed per figure · CEA, URA and HDB records + your profile analytics · never affects ranking
        </p>
      </div>
    </div>
  );
}
