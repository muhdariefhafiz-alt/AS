"use client";

import { useState } from "react";
import Link from "next/link";

type PaidTier = "verified" | "professional" | "elite";

function Tick() {
  return (
    <svg className="tick" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

// Licence-safe SaaS tiers: reputation, presentation and analytics only. No tier
// gates seller leads or buys seller-facing placement, and there is no success
// fee. Introductions from the comparison funnel are free to every agent;
// payment never affects which introductions an agent gets or their ranking.
const TIERS: {
  key: PaidTier | "free";
  name: string;
  price: string;
  period: string;
  popular?: boolean;
  features: string[];
  cta: string;
}[] = [
  {
    key: "free",
    name: "Free",
    price: "S$0",
    period: "forever",
    features: [
      "Claim your CEA-verified profile: photo, bio, message and contact button",
      "Your transaction history, shown from public records",
      "Appear in search and area rankings; verified client reviews displayed",
      "Seller enquiries, viewings planner and demand analytics included",
      "One building page, plus your badge and website widget",
    ],
    cta: "Claim your profile",
  },
  {
    key: "verified",
    name: "Verified",
    price: "S$29",
    period: "billed monthly",
    features: [
      "Everything in Free, plus:",
      "Verified member mark on your public profile",
      "Unlimited AI-drafted replies to seller enquiries",
      "Contact-click detail in your demand analytics",
      "Three building pages",
    ],
    cta: "Get Verified",
  },
  {
    key: "professional",
    name: "Professional",
    price: "S$69",
    period: "billed monthly",
    popular: true,
    features: [
      "Everything in Verified, plus:",
      "Monthly performance report vs your district: standing, movement, demand and market context",
      "Top 10% standing line on your embeddable badge, once you earn it",
      "Ten building pages",
    ],
    cta: "Go Professional",
  },
  {
    key: "elite",
    name: "Elite",
    price: "S$149",
    period: "billed monthly",
    features: [
      "Everything in Professional, plus:",
      "Elite agent badge on your public profile",
      "Competitive benchmarking inside your performance report",
      "Twenty-five building pages",
      "Priority support",
    ],
    cta: "Go Elite",
  },
];

export default function PricingCards() {
  const [email, setEmail] = useState("");
  const [showEmailInput, setShowEmailInput] = useState<PaidTier | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCheckout(tier: PaidTier) {
    if (!email) { setShowEmailInput(tier); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), tier }),
      });
      const data = await res.json();
      if (res.ok && data.url) { window.location.href = data.url; }
      else { setError(data.error || "Something went wrong."); setLoading(false); }
    } catch { setError("Connection error. Please try again."); setLoading(false); }
  }

  return (
    <div>
      <div className="price-grid">
        {TIERS.map((t) => (
          <div key={t.key} className={"fc-card price" + (t.popular ? " price--pop" : "")}>
            {t.popular && <div className="price__tag">Popular</div>}
            <div className={"eyebrow" + (t.popular ? "" : " eyebrow--muted")}>{t.name}</div>
            <div className="serif" style={{ fontWeight: 600, fontSize: 38, marginTop: 6 }}>
              {t.price}
              {t.key !== "free" && <span style={{ fontSize: 16, color: "var(--slate)", fontFamily: "var(--font-sans)" }}>/mo</span>}
            </div>
            <div className="small muted">{t.period}</div>
            <ul>{t.features.map((f) => <li key={f}><Tick /> {f}</li>)}</ul>
            {t.key === "free" ? (
              <Link href="/search" className="fc-btn fc-btn--ghost fc-btn--block" style={{ marginTop: 18 }}>{t.cta}</Link>
            ) : (
              <button
                onClick={() => handleCheckout(t.key as PaidTier)}
                disabled={loading}
                className={"fc-btn fc-btn--block " + (t.popular ? "fc-btn--primary" : "fc-btn--ghost")}
                style={{ marginTop: 18 }}
              >
                {loading && showEmailInput === t.key ? "Redirecting…" : t.cta}
              </button>
            )}
          </div>
        ))}
      </div>

      {showEmailInput && (
        <div className="fc-card fc-card--pad" style={{ marginTop: 16, background: "var(--cloud)" }}>
          <p style={{ fontWeight: 600, fontSize: 14 }}>Enter the email you used to claim your profile to continue:</p>
          <div className="fc-row" style={{ gap: 8, marginTop: 8 }}>
            <input className="fc-input" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} placeholder="you@example.com" autoFocus style={{ flex: 1 }} />
            <button onClick={() => handleCheckout(showEmailInput)} disabled={loading || !email} className="fc-btn fc-btn--primary">
              {loading ? "…" : "Continue"}
            </button>
          </div>
          {error && <p className="small" style={{ color: "var(--danger)", marginTop: 8 }}>{error}</p>}
          <p className="muted small" style={{ marginTop: 8 }}>
            Haven&apos;t claimed your profile yet? <Link href="/claim">Find and claim it first</Link> (free).
          </p>
        </div>
      )}

      <p className="muted small" style={{ textAlign: "center", marginTop: 18 }}>
        One won listing at a typical 1% commission covers years of any tier.
      </p>
      <p className="mono small muted" style={{ textAlign: "center", marginTop: 8 }}>
        Subscriptions are visibility and analytics tools only. They never influence ranking position: your AgentScore is computed from public CEA, URA and HDB data and cannot be bought.
      </p>
    </div>
  );
}
