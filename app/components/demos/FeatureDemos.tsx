"use client";

import { useEffect, useRef, useState } from "react";
import CountUp from "../CountUp";

// Bespoke feature demos (Gate-3b feedback: every feature earns its own
// animated mockup in its own colour world, housapp-style). All follow the
// house choreography contract: server HTML renders the FINISHED state
// (crawlers, no-JS, reduced-motion see everything), and the sequence replays
// when the mockup scrolls into view.

// Shared choreography: counts 0..steps on scroll-in, server state = steps.
function useChoreo(steps: number, timings: number[]) {
  const [step, setStep] = useState(steps);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timers: number[] = [];
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting) || started.current) return;
        started.current = true;
        io.disconnect();
        setStep(0);
        timings.forEach((t, i) => timers.push(window.setTimeout(() => setStep(i + 1), t)));
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      timers.forEach((t) => window.clearTimeout(t));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return { step, ref };
}

const card: React.CSSProperties = { pointerEvents: "none", userSelect: "none" };

/* ------------------------------------------------------------------ */
/* Deal Radar: the radar pings, prospects arrive, the counter settles. */
export function DealRadarDemo() {
  const { step, ref } = useChoreo(4, [350, 950, 1550, 2250]);
  const prospects = [
    ["Blk 512 Hougang Ave 8", "Owner reaches MOP this month"],
    ["Blk 88 Punggol Dr", "Sold nearby: S$668,000 (4-room)"],
    ["Blk 3 Hougang Ave 3", "Owner reaches MOP in 6 weeks"],
  ];
  return (
    <div ref={ref} className="fc-scene__card" aria-hidden="true" style={{ ...card, maxWidth: 440, margin: "0 auto", padding: "16px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span className="fc-ping" style={{ width: 12, height: 12, borderRadius: "50%", background: "var(--ok)", flex: "0 0 auto" }} />
        <span style={{ fontWeight: 700, fontSize: 13.5, color: "var(--ink)" }}>Deal Radar · your farm area</span>
        <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: "var(--ok)", fontVariantNumeric: "tabular-nums" }}>
          {step >= 4 ? <CountUp value={3} duration={500} /> : 3} new
        </span>
      </div>
      {prospects.map(([addr, sub], i) => (
        <div
          key={addr}
          className="fc-cue"
          data-on={step >= i + 1 ? "1" : undefined}
          style={{
            display: "flex", justifyContent: "space-between", gap: 10, padding: "9px 0",
            borderTop: "1px solid var(--line)", fontSize: 13,
          }}
        >
          <span>
            <span style={{ display: "block", fontWeight: 700, color: "var(--ink)" }}>{addr}</span>
            <span className="muted" style={{ fontSize: 12 }}>{sub}</span>
          </span>
          <span style={{ alignSelf: "center", fontSize: 11.5, fontWeight: 700, color: "var(--blue)", whiteSpace: "nowrap" }}>Open &rarr;</span>
        </div>
      ))}
      <p className="muted" style={{ margin: "10px 0 0", fontSize: 11.5, textAlign: "center" }}>
        Built nightly from official CEA, URA and HDB records.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------- */
/* Co-branded report: header lands, the chart GROWS, send button pops. */
export function ReportDemo() {
  const { step, ref } = useChoreo(3, [400, 1000, 2100]);
  const bars = [34, 52, 44, 68, 84];
  return (
    <div ref={ref} className="fc-scene__card" aria-hidden="true" style={{ ...card, maxWidth: 420, margin: "0 auto", padding: "16px 18px" }}>
      <div className="fc-cue" data-on={step >= 1 ? "1" : undefined} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <span
          style={{
            width: 34, height: 34, borderRadius: 10, background: "var(--ink)", color: "#fff",
            display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13,
          }}
        >
          YN
        </span>
        <span>
          <span style={{ display: "block", fontWeight: 700, fontSize: 13.5, color: "var(--ink)" }}>Your name · AgentScore 84</span>
          <span className="muted" style={{ fontSize: 11.5 }}>Market report · Hougang, last 12 months</span>
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 96, padding: "0 6px", borderBottom: "1px solid var(--line)" }}>
        {bars.map((h, i) => (
          <span
            key={i}
            style={{
              flex: 1, borderRadius: "4px 4px 0 0",
              background: i === bars.length - 1 ? "var(--blue)" : "var(--blue-wash)",
              height: step >= 2 ? `${h}%` : "6%",
              transition: `height .7s cubic-bezier(.22,1,.32,1) ${i * 90}ms`,
            }}
          />
        ))}
      </div>
      <div className="muted" style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, padding: "4px 6px 0" }}>
        <span>2021</span><span>2025</span>
      </div>
      <div className="fc-cue" data-on={step >= 3 ? "1" : undefined} style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12 }}>
        <span className="fc-btn fc-btn--primary fc-btn--sm">Send to owner</span>
        <span className="muted" style={{ fontSize: 11.5 }}>Their valuation clicks come back to you.</span>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------------- */
/* Lead widget: the cursor glides in, clicks, and a lead toast pops.     */
export function WidgetDemo() {
  const { step, ref } = useChoreo(3, [500, 900, 2050]);
  return (
    <div ref={ref} aria-hidden="true" style={{ ...card, position: "relative", maxWidth: 380, margin: "0 auto" }}>
      <div className="fc-scene__card" style={{ padding: "16px 18px" }}>
        <div className="fc-cue" data-on={step >= 1 ? "1" : undefined} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              width: 44, height: 44, borderRadius: "50%", border: "3px solid var(--blue)",
              display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 700,
              fontSize: 15, color: "var(--ink)", fontVariantNumeric: "tabular-nums", flex: "0 0 auto",
            }}
          >
            84
          </span>
          <span>
            <span style={{ display: "block", fontWeight: 700, fontSize: 13.5, color: "var(--ink)" }}>Your name · Verified AgentScore</span>
            <span className="muted" style={{ fontSize: 11.5 }}>On your own website</span>
          </span>
        </div>
        <span className="fc-btn fc-btn--primary fc-btn--block fc-btn--sm" style={{ marginTop: 12 }}>
          Get a free valuation
        </span>
      </div>
      {/* the demo cursor glides to the button and clicks */}
      <span
        className="fc-democursor"
        data-on={step >= 2 ? "1" : undefined}
        style={{ ["--cx-from" as string]: "92%", ["--cy-from" as string]: "8%", ["--cx-to" as string]: "50%", ["--cy-to" as string]: "78%" }}
      />
      <div
        className="fc-cue fc-cue--pop"
        data-on={step >= 3 ? "1" : undefined}
        style={{
          position: "absolute", left: "50%", bottom: -18, transform: "translateX(-50%)",
          background: "var(--ink)", color: "#fff", borderRadius: 999, padding: "7px 16px",
          fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap", boxShadow: "var(--sh-2)",
        }}
      >
        &#10003; New seller enquiry, pinned to you
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Workflow chain (housapp style): steps land one by one, connectors  */
/* draw between them. Generic: pass 3-4 steps.                        */
export function WorkflowChain({
  steps,
}: {
  steps: { icon: React.ReactNode; title: string; sub: string }[];
}) {
  const timings = steps.flatMap((_, i) => [400 + i * 700, 750 + i * 700]).slice(0, steps.length * 2 - 1);
  const { step, ref } = useChoreo(timings.length, timings);
  return (
    <div ref={ref} aria-hidden="true" style={{ ...card, maxWidth: 420, margin: "0 auto" }}>
      {steps.map((s, i) => (
        <div key={s.title}>
          {i > 0 && <div className="fc-chain__link" data-on={step >= i * 2 ? "1" : undefined} />}
          <div
            className="fc-cue"
            data-on={step >= i * 2 + 1 ? "1" : undefined}
            style={{
              display: "flex", gap: 12, alignItems: "center", background: "#fff",
              border: "1px solid var(--line)", borderRadius: 14, padding: "12px 16px",
              boxShadow: "0 10px 26px rgba(10,23,51,0.10)",
            }}
          >
            <span
              style={{
                width: 38, height: 38, borderRadius: 11, background: "var(--blue-wash)", color: "var(--blue-deep)",
                display: "inline-flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto",
              }}
            >
              {s.icon}
            </span>
            <span>
              <span style={{ display: "block", fontWeight: 700, fontSize: 13.5, color: "var(--ink)" }}>{s.title}</span>
              <span className="muted" style={{ fontSize: 12 }}>{s.sub}</span>
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// Pitch Kit: the agent's one-page listing pitch assembling itself, section by
// section. Deliberately identity-generic ("Your record"): the sell is that it
// fills with the AGENT's own verified data, and no real agent is mocked.
export function PitchKitDemo() {
  const { step, ref } = useChoreo(4, [300, 1000, 1800, 2600]);
    const STATS = [
    { v: "14", l: "deals in this area" },
    { v: "#3", l: "area standing" },
    { v: "82%", l: "seller-side sales" },
  ];
  const DEALS = [
    { t: "HDB · Resale", s: "Seller side · Feb" },
    { t: "Condo · Resale", s: "Seller side · May" },
  ];
  return (
    <div ref={ref} className="fc-scene__card" style={{ maxWidth: 340, margin: "0 auto", padding: "18px 18px 16px" }}>
      <div className="fc-cue" data-on={step >= 1 ? "1" : undefined} style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--ink)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 15 }}>You</span>
        <span style={{ minWidth: 0, flex: 1 }}>
          <span style={{ display: "block", fontWeight: 700, fontSize: 14.5, color: "var(--ink)" }}>Your record, presented</span>
          <span className="muted" style={{ fontSize: 12 }}>Listing pitch · your farm area</span>
        </span>
        <span style={{ textAlign: "center" }}>
          <span className="serif" style={{ display: "block", fontSize: 24, fontWeight: 700, color: "var(--blue-deep)", fontVariantNumeric: "tabular-nums" }}>
            {step >= 1 ? <CountUp value={84} duration={900} /> : 84}
          </span>
          <span className="mono" style={{ fontSize: 8.5, color: "var(--slate)", letterSpacing: "0.08em" }}>AGENTSCORE</span>
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 14 }}>
        {STATS.map((s, i) => (
          <div key={s.l} className="fc-cue fc-cue--pop" data-on={step >= 2 ? "1" : undefined} style={{ transitionDelay: `${i * 120}ms`, background: "var(--cloud)", borderRadius: 10, padding: "9px 8px", textAlign: "center" }}>
            <div style={{ fontWeight: 700, fontSize: 16.5, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>{s.v}</div>
            <div className="muted" style={{ fontSize: 10, lineHeight: 1.3 }}>{s.l}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
        {DEALS.map((d, i) => (
          <div key={d.t} className="fc-cue" data-on={step >= 3 ? "1" : undefined} style={{ transitionDelay: `${i * 140}ms`, display: "flex", justifyContent: "space-between", border: "1px solid var(--line)", borderRadius: 9, padding: "8px 12px", fontSize: 12 }}>
            <span style={{ fontWeight: 600, color: "var(--ink)" }}>{d.t}</span>
            <span className="muted">{d.s}</span>
          </div>
        ))}
      </div>

      <div className="fc-cue fc-cue--pop" data-on={step >= 4 ? "1" : undefined} style={{ marginTop: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 12.5, fontWeight: 700, color: "var(--ok)" }}>
          <span style={{ width: 18, height: 18, borderRadius: "50%", background: "var(--ok-wash)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>&#10003;</span>
          Ready to present
        </span>
        <span style={{ background: "var(--blue)", color: "#fff", borderRadius: 999, padding: "6px 13px", fontSize: 11.5, fontWeight: 700 }}>Share link</span>
      </div>
    </div>
  );
}
