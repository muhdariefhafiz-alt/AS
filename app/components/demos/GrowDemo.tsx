"use client";

import { useEffect, useRef, useState } from "react";
import CountUp from "../CountUp";

// The Grow pillar performing itself: a Deal Radar signal ARRIVES, the
// profile-view counter ticks up, the standing chip climbs. Completes the
// Inbox -> Planner -> Grow demo trilogy. Illustrative mockup values (no real
// agent); server HTML renders the finished state for crawlers, no-JS and
// reduced-motion visitors.
export default function GrowDemo() {
  const [step, setStep] = useState(3); // server = fully played
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
        timers.push(window.setTimeout(() => setStep(1), 350));  // radar signal arrives
        timers.push(window.setTimeout(() => setStep(2), 1150)); // views counter
        timers.push(window.setTimeout(() => setStep(3), 1900)); // standing climbs
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
    <div ref={ref} aria-hidden="true" style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", pointerEvents: "none", userSelect: "none" }}>
      {/* Deal Radar: the signal arrives like a notification */}
      <div className="fc-scene__card fc-cue" data-on={step >= 1 ? "1" : undefined} style={{ padding: "16px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, fontWeight: 700, fontSize: 13, color: "var(--slate)" }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--ok)" }} />
          Deal Radar
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, margin: "6px 0 2px", color: "var(--ink)" }}>
          3 owners in your farm area hit MOP this month
        </div>
        <p className="muted small" style={{ margin: 0 }}>Know your patch before anyone calls them.</p>
      </div>

      {/* Profile views tick up */}
      <div className="fc-scene__card fc-cue" data-on={step >= 2 ? "1" : undefined} style={{ padding: "16px 18px" }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: "var(--slate)" }}>Profile views</div>
        <div style={{ fontSize: 30, fontWeight: 700, margin: "2px 0", fontVariantNumeric: "tabular-nums", color: "var(--ink)" }}>
          {step >= 2 ? <CountUp value={41} duration={900} /> : 41}
        </div>
        <p className="muted small" style={{ margin: 0 }}>sellers viewed you this week</p>
      </div>

      {/* Standing climbs */}
      <div className="fc-scene__card fc-cue" data-on={step >= 3 ? "1" : undefined} style={{ padding: "16px 18px" }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: "var(--slate)" }}>Your standing</div>
        <div style={{ fontSize: 30, fontWeight: 700, margin: "2px 0", color: "var(--ok)", fontVariantNumeric: "tabular-nums" }}>
          &#8593; 2
        </div>
        <p className="muted small" style={{ margin: 0 }}>places up in your area this month</p>
      </div>
    </div>
  );
}
