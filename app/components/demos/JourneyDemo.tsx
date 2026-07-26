"use client";

import { useEffect, useRef, useState } from "react";

// The seller journey performing itself, in three acts: ranked agents appear,
// the seller invites three, fee quotes arrive side by side. The homepage
// thesis moment. Names, scores and fees are illustrative mockup UI (no real
// agent depicted); the FLOW is exactly the live /sell product. Server HTML
// renders the finished state so crawlers, no-JS and reduced-motion visitors
// see the complete story; choreography replays on scroll-in when JS + motion
// are available.
const AGENTS: { name: string; sub: string; score: number; quote: string }[] = [
  { name: "W. Tan", sub: "38 sales nearby · Tampines", score: 91, quote: "1.5% + GST" },
  { name: "S. Lim", sub: "29 sales nearby · Bedok", score: 88, quote: "1.8% + GST" },
  { name: "R. Kumar", sub: "24 sales nearby · Pasir Ris", score: 86, quote: "2.0% + GST" },
];
const FINAL_STEP = 8; // 3 rows + 3 invites + quotes + caption

export default function JourneyDemo() {
  const [step, setStep] = useState(FINAL_STEP); // server = fully played
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
        // Act 1: rows cascade in. Act 2: invites pop. Act 3: quotes arrive.
        const cueAt = [350, 560, 770, 1350, 1540, 1730, 2450, 3100];
        cueAt.forEach((t, i) => timers.push(window.setTimeout(() => setStep(i + 1), t)));
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  return (
    <div ref={ref} className="fc-scene__card" aria-hidden="true" style={{ maxWidth: 520, margin: "0 auto", padding: "16px 18px", pointerEvents: "none", userSelect: "none" }}>
      <div style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700, color: "var(--slate)", marginBottom: 10 }}>
        Agents near you, ranked on record
      </div>

      {AGENTS.map((a, i) => (
        <div
          key={a.name}
          className="fc-cue"
          data-on={step >= i + 1 ? "1" : undefined}
          style={{
            display: "flex", alignItems: "center", gap: 10, padding: "9px 0",
            borderBottom: i < AGENTS.length - 1 ? "1px solid var(--line)" : "none",
          }}
        >
          <span
            style={{
              width: 34, height: 34, borderRadius: 10, background: "var(--blue-wash)", color: "var(--blue-deep)",
              display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13.5,
              flex: "0 0 auto", fontVariantNumeric: "tabular-nums",
            }}
          >
            {a.score}
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontWeight: 700, fontSize: 13.5, color: "var(--ink)" }}>{a.name}</span>
            <span style={{ display: "block", fontSize: 11.5, color: "var(--slate)" }}>{a.sub}</span>
          </span>
          {/* Act 2: the invite */}
          <span
            className="fc-cue fc-cue--pop"
            data-on={step >= i + 4 ? "1" : undefined}
            style={{
              fontSize: 11, fontWeight: 700, borderRadius: 999, padding: "4px 10px",
              background: "var(--ink)", color: "#fff", flex: "0 0 auto",
            }}
          >
            &#10003; Invited
          </span>
        </div>
      ))}

      {/* Act 3: quotes arrive side by side */}
      <div
        className="fc-cue"
        data-on={step >= 7 ? "1" : undefined}
        style={{ marginTop: 12, borderTop: "1px solid var(--line)", paddingTop: 12 }}
      >
        <div style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700, color: "var(--ok)", marginBottom: 8 }}>
          Their fee quotes, side by side
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {AGENTS.map((a) => (
            <span
              key={a.name}
              style={{
                flex: 1, textAlign: "center", border: "1px solid var(--line)", borderRadius: 10,
                padding: "8px 4px", fontSize: 12.5, fontWeight: 700, color: "var(--ink)", background: "#fff",
              }}
            >
              {a.quote}
              <span style={{ display: "block", fontSize: 10.5, fontWeight: 500, color: "var(--slate)", marginTop: 2 }}>{a.name}</span>
            </span>
          ))}
        </div>
      </div>

      <p className="fc-cue muted" data-on={step >= 8 ? "1" : undefined} style={{ margin: "12px 0 0", fontSize: 12, textAlign: "center" }}>
        You compare, you choose. Free for sellers, always.
      </p>
    </div>
  );
}
