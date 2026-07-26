"use client";

import { useEffect, useRef, useState } from "react";

// Choreographed Planner mockup: time-slot chips pop in one by one, then one
// SELECTS ITSELF (the "someone is using this" moment), then the confirmation
// line appears. Server HTML renders the final state (all chips + selection +
// confirmation) so no-JS/reduced-motion/crawlers see the complete card.
const SLOTS = ["Sat 2:00", "Sat 3:30", "Sun 11:00", "Sun 2:00"];
const PICK = 2; // Sun 11:00 selects itself

export default function PlannerDemo() {
  // Server state = fully played.
  const [chipsOn, setChipsOn] = useState(SLOTS.length);
  const [picked, setPicked] = useState(true);
  const [confirmed, setConfirmed] = useState(true);
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
        setChipsOn(0);
        setPicked(false);
        setConfirmed(false);
        SLOTS.forEach((_, i) =>
          timers.push(window.setTimeout(() => setChipsOn(i + 1), 350 + i * 190))
        );
        timers.push(window.setTimeout(() => setPicked(true), 350 + SLOTS.length * 190 + 550));
        timers.push(window.setTimeout(() => setConfirmed(true), 350 + SLOTS.length * 190 + 1050));
      },
      { threshold: 0.45 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  return (
    <div ref={ref} className="fc-scene__card" style={{ maxWidth: 440, margin: "18px auto 0", padding: "18px 22px", textAlign: "center" }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>Pick a viewing time</div>
      <div style={{ fontSize: 13, color: "var(--slate)", marginBottom: 12 }}>Blk 123 Tampines St 11</div>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
        {SLOTS.map((t, i) => {
          const isPick = picked && i === PICK;
          return (
            <span
              key={t}
              className="fc-cue fc-cue--pop"
              data-on={chipsOn > i ? "1" : undefined}
              style={{
                border: "1px solid var(--line-2)", borderRadius: 999, padding: "7px 14px",
                fontSize: 13.5, fontWeight: 600,
                background: isPick ? "var(--ink)" : "#fff",
                color: isPick ? "#fff" : "var(--ink)",
                borderColor: isPick ? "var(--ink)" : "var(--line-2)",
                transition: "background .3s, color .3s, border-color .3s",
              }}
            >
              {t}
            </span>
          );
        })}
      </div>
      <p className="fc-cue muted small" data-on={confirmed ? "1" : undefined} style={{ margin: "14px 0 0" }}>
        &#10003; Confirmed. Added to your Google Calendar.
      </p>
    </div>
  );
}
