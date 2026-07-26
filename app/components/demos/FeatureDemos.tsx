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
