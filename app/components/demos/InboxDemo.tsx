"use client";

import { useEffect, useRef, useState } from "react";
import TypingDemo from "../TypingDemo";

// Choreographed Inbox mockup: the product performs its own job in sequence.
// 1) the seller's enquiry ARRIVES (card pops in)  2) the AI badge appears
// 3) the draft types itself  4) Send/Edit fade up when the draft finishes.
// Server HTML renders the complete final state, so crawlers, no-JS and
// reduced-motion visitors see everything; the choreography only runs when JS
// + motion are available and the card scrolls into view.
const STEPS_DONE = 3; // enquiry, badge, typing-started (buttons keyed on onDone)

export default function InboxDemo() {
  // Hydration-safe: server state = fully played.
  const [step, setStep] = useState(STEPS_DONE);
  const [buttonsOn, setButtonsOn] = useState(true);
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
        setButtonsOn(false);
        timers.push(window.setTimeout(() => setStep(1), 400)); // enquiry arrives
        timers.push(window.setTimeout(() => setStep(2), 1250)); // AI badge
        timers.push(window.setTimeout(() => setStep(3), 1700)); // typing starts
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
    <div ref={ref} className="fc-scene__card" style={{ maxWidth: 560, margin: "18px auto 0", padding: "18px 22px" }}>
      {/* 1: the enquiry arriving */}
      <div className="fc-cue" data-on={step >= 1 ? "1" : undefined}>
        <div style={{ fontSize: 13, color: "var(--slate)", marginBottom: 6 }}>
          New enquiry · Blk 123 Tampines St 11 · just now
        </div>
        <div
          style={{
            background: "var(--cloud)", borderRadius: "var(--r-md)", padding: "12px 14px",
            fontSize: 14.5, marginBottom: 14,
          }}
        >
          Hi, is the 4-room unit still available? Could we view this weekend?
        </div>
      </div>

      {/* 2: AI badge, 3: the draft typing itself */}
      <div style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
        <span
          className="fc-cue fc-cue--pop"
          data-on={step >= 2 ? "1" : undefined}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6, background: "var(--blue-wash)",
            color: "var(--blue-deep)", borderRadius: 999, padding: "3px 10px", fontSize: 12,
            fontWeight: 700, marginBottom: 8,
          }}
        >
          AI draft
        </span>
        <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.55, minHeight: "4.6em" }}>
          <TypingDemo
            active={step >= 3}
            startDelay={150}
            speed={16}
            text="Hi! Yes, the unit is still available. I have Saturday 2pm or Sunday 11am open for a viewing - which suits you better? I will send the address and my details once you confirm."
            onDone={() => setButtonsOn(true)}
          />
        </p>
        {/* 4: actions appear when the draft completes */}
        <div className="fc-cue" data-on={buttonsOn ? "1" : undefined} style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <span className="fc-btn fc-btn--primary fc-btn--sm">Send</span>
          <span className="fc-btn fc-btn--ghost fc-btn--sm">Edit</span>
          <span className="muted small" style={{ alignSelf: "center" }}>AI draft, ready to send</span>
        </div>
      </div>
    </div>
  );
}
