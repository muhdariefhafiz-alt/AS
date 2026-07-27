"use client";

import { useEffect, useState } from "react";

// Post-checkout unlock moment. Rendered ONLY after the dashboard has
// re-verified the tier against the database (never from the query string), so
// what it announces is already true. House choreography: tier-coloured scene
// world, staged pop-in of the tools that just became active.

type PaidTier = "verified" | "professional" | "elite";

const SCENE: Record<PaidTier, string> = {
  verified: "fc-scene--inbox",
  professional: "fc-scene--planner",
  elite: "fc-scene--grow",
};

const LABEL: Record<PaidTier, string> = {
  verified: "Verified",
  professional: "Professional",
  elite: "Elite",
};

// Truth-aligned: every line here is live in the product for that tier.
const UNLOCKED: Record<PaidTier, string[]> = {
  verified: [
    "Unlimited AI-drafted replies in your inbox",
    "Contact-click detail on your demand dashboard",
    "Verified member mark on your public profile",
    "Three building pages",
  ],
  professional: [
    "Monthly performance report vs your district",
    "Top 10% standing line on your badge, once you earn it",
    "Ten building pages",
    "Everything in Verified",
  ],
  elite: [
    "Elite agent badge on your public profile",
    "Competitive benchmarking inside your report",
    "Twenty-five building pages and priority support",
    "Everything in Professional",
  ],
};

export default function UnlockMoment({
  tier,
  onClose,
  onOpenTools,
}: {
  tier: PaidTier;
  onClose: () => void;
  onOpenTools: () => void;
}) {
  // Server-render-safe: mount with cues off, flip them on one frame later so
  // the staged transitions play (data-on="1" is the CSS contract).
  const [on, setOn] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setOn(true)));
    return () => cancelAnimationFrame(id);
  }, []);
  const cue = (delay: number): React.CSSProperties => ({
    opacity: on ? 1 : 0,
    transform: on ? "translateY(0)" : "translateY(8px)",
    transition: `opacity .5s cubic-bezier(.25,1,.35,1) ${delay}ms, transform .5s cubic-bezier(.25,1,.35,1) ${delay}ms`,
  });

  return (
    <div className={`fc-scene ${SCENE[tier]}`} role="status" style={{ marginTop: 20, padding: "clamp(14px,2.2vw,22px)" }}>
      <div className="fc-scene__card" style={{ padding: "clamp(18px,3vw,26px)", position: "relative" }}>
        <button
          onClick={onClose}
          aria-label="Dismiss"
          style={{ position: "absolute", top: 10, right: 12, border: "none", background: "none", cursor: "pointer", color: "var(--slate)", fontSize: 16, lineHeight: 1 }}
        >
          &times;
        </button>

        <div style={cue(0)}>
          <span
            className="tick"
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 999, background: "var(--ok)", color: "#fff", fontSize: 15 }}
          >
            &#10003;
          </span>
        </div>

        <h2 className="serif" style={{ ...cue(120), fontSize: 24, margin: "12px 0 0" }}>
          You&apos;re on {LABEL[tier]}. <span className="italic-serif">Tools are live.</span>
        </h2>
        <p className="muted" style={{ ...cue(220), marginTop: 6, fontSize: 14.5 }}>
          Payment confirmed. Everything below is already active on your account, and none of it
          changes your ranking.
        </p>

        <ul style={{ listStyle: "none", margin: "16px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
          {UNLOCKED[tier].map((f, i) => (
            <li key={f} className="fc-row" style={{ ...cue(320 + i * 110), gap: 10, fontSize: 14.5, alignItems: "flex-start" }}>
              <span style={{ color: "var(--ok)", fontWeight: 700, flexShrink: 0 }}>&#10003;</span>
              <span>{f}</span>
            </li>
          ))}
        </ul>

        <div className="fc-row" style={{ ...cue(320 + UNLOCKED[tier].length * 110 + 120), gap: 10, marginTop: 18 }}>
          <button onClick={onOpenTools} className="fc-btn fc-btn--primary fc-btn--hairline">
            Open your tools
          </button>
          <button onClick={onClose} className="fc-btn fc-btn--quiet">
            Later
          </button>
        </div>
      </div>
    </div>
  );
}
