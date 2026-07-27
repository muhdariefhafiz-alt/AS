"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { titleName, cleanAgency } from "../lib/names";

// The record, in numbers: deals-distribution histogram + time-windowed
// activity boards for the /property-agents hub. House choreography contract:
// the server HTML renders the FINISHED state (bars at full width, default
// window's board present); on scroll-in the bars replay their growth once.
// Honesty rails: boards are SALES-led with rentals shown separately, the
// seller-side count is visible, the freshness month is printed, and the copy
// says plainly that activity is not the ranking.

export type LeagueData = {
  freshness_month: string;
  register_total: number;
  agents_with_deals: number;
  histogram: { band: string; agents: number; pct: number }[];
  boards: Record<"all" | "12mo" | "3mo", {
    rank: number; name: string; slug: string; agency: string | null;
    claimed: boolean; sales: number; seller_side: number; rentals: number;
  }[]>;
};

const WINDOWS: { key: "12mo" | "3mo" | "all"; label: string; sub: string }[] = [
  { key: "12mo", label: "Last 12 months", sub: "the fairest activity window" },
  { key: "3mo", label: "Last 3 months", sub: "latest records, thinner sample" },
  { key: "all", label: "All time", sub: "career volume favours tenure" },
];

export default function LeagueBoards({ data }: { data: LeagueData }) {
  const [win, setWin] = useState<"12mo" | "3mo" | "all">("12mo");
  const [grown, setGrown] = useState(true);
  const histRef = useRef<HTMLDivElement>(null);

  // Replay-on-scroll for the histogram bars (server state = grown).
  useEffect(() => {
    const el = histRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let started = false;
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting) || started) return;
      started = true;
      io.disconnect();
      setGrown(false);
      requestAnimationFrame(() => requestAnimationFrame(() => setGrown(true)));
    }, { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const maxPct = Math.max(...data.histogram.map((h) => h.pct), 1);
  const rows = data.boards[win] ?? [];

  return (
    <>
      {/* Histogram: how the record spreads across the register */}
      <div ref={histRef} className="fc-scene fc-scene--grow fc-reveal" style={{ marginTop: 24, padding: "clamp(16px,2.5vw,28px)" }}>
        <div className="fc-scene__card" style={{ padding: "clamp(16px,2.5vw,24px)" }}>
          <p className="muted small" style={{ margin: "0 0 14px" }}>
            Career deals per agent, across the {data.agents_with_deals.toLocaleString()} agents with at least
            one recorded deal ({data.register_total.toLocaleString()} on the register).
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.histogram.map((h, i) => (
              <div key={h.band} style={{ display: "grid", gridTemplateColumns: "88px 1fr 120px", gap: 12, alignItems: "center" }}>
                <span className="mono" style={{ fontSize: 12, color: "var(--slate)", textAlign: "right" }}>{h.band}</span>
                <span style={{ position: "relative", height: 14, background: "var(--cloud)", borderRadius: 7, overflow: "hidden" }}>
                  <span
                    style={{
                      position: "absolute", left: 0, top: 0, bottom: 0, borderRadius: 7,
                      background: "var(--blue)", opacity: 0.85,
                      width: grown ? `${(h.pct / maxPct) * 100}%` : "0%",
                      transition: `width .8s cubic-bezier(.25,1,.35,1) ${i * 70}ms`,
                    }}
                  />
                </span>
                <span className="small" style={{ fontVariantNumeric: "tabular-nums", color: "var(--ink)", fontWeight: 600 }}>
                  {h.pct}%<span className="muted" style={{ fontWeight: 400 }}> · {h.agents.toLocaleString()}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Windowed activity boards */}
      <div className="fc-scene fc-scene--planner fc-reveal" style={{ marginTop: 16, padding: "clamp(16px,2.5vw,28px)" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {WINDOWS.map((w) => (
            <button
              key={w.key}
              type="button"
              onClick={() => setWin(w.key)}
              className="small"
              title={w.sub}
              style={{
                border: win === w.key ? "1px solid var(--blue)" : "1px solid var(--line)",
                background: win === w.key ? "var(--blue-wash)" : "#fff",
                color: win === w.key ? "var(--blue-deep)" : "var(--slate)",
                borderRadius: 999, padding: "7px 15px", cursor: "pointer", fontWeight: 600,
              }}
            >
              {w.label}
            </button>
          ))}
          <span className="mono" style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--slate)" }}>
            CEA records to {data.freshness_month}
          </span>
        </div>

        <div className="fc-scene__card" style={{ marginTop: 14, padding: "6px 18px" }}>
          {rows.map((r, i) => (
            <Link
              key={`${win}-${r.slug}`}
              href={`/property-agents/agent/${r.slug}`}
              className="fc-pop-in"
              style={{
                display: "flex", alignItems: "center", gap: 12, padding: "11px 0",
                borderTop: i > 0 ? "1px solid var(--line)" : "none",
                color: "inherit", textDecoration: "none",
                animationDelay: `${Math.min(i * 45, 320)}ms`,
              }}
            >
              <span className="mono" style={{ width: 22, textAlign: "right", color: "var(--slate)", fontSize: 13, flexShrink: 0 }}>{r.rank}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontWeight: 700, fontSize: 14.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {titleName(r.name)}
                </span>
                <span className="muted" style={{ fontSize: 12.5 }}>{r.agency ? cleanAgency(r.agency) : "Independent"}</span>
              </span>
              <span style={{ textAlign: "right", flexShrink: 0 }}>
                <span style={{ display: "block", fontWeight: 700, fontSize: 15, fontVariantNumeric: "tabular-nums" }}>
                  {r.sales.toLocaleString()} <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>sales</span>
                </span>
                <span className="muted" style={{ fontSize: 11.5, fontVariantNumeric: "tabular-nums" }}>
                  {r.seller_side.toLocaleString()} seller-side{r.rentals > 0 ? ` · ${r.rentals.toLocaleString()} rentals` : ""}
                </span>
              </span>
            </Link>
          ))}
        </div>

        <p className="muted small" style={{ margin: "12px 0 0" }}>
          Activity, not the ranking: AgentScore also weighs recency, diversity and reviews, and no
          agent can pay to appear here. These boards simply count recorded deals, sales first,
          rentals separately.
        </p>
      </div>
    </>
  );
}
