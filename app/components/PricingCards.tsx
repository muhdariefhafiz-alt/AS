"use client";

import { useState } from "react";
import Link from "next/link";

function Tick() {
  return (
    <svg className="tick" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export default function PricingCards() {
  const [email, setEmail] = useState("");
  const [showEmailInput, setShowEmailInput] = useState<"pro" | "premium" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCheckout(tier: "pro" | "premium") {
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

  const free = ["Photo and contact details", "Practice description", "Receive seller leads in your area", "Pay 0.25% only when a sale completes"];
  const pro = ["Everything in Free", "Weekly profile view + lead report", "Comparable-transaction data for pricing", "Monthly market insights for your area"];
  const premium = ["Everything in Pro", "Full district analytics dashboard", "Dedicated account support", "Custom market reports for your areas"];

  return (
    <div>
      <div className="price-grid">
        {/* Free */}
        <div className="fc-card price">
          <div className="eyebrow eyebrow--muted">Free</div>
          <div className="serif" style={{ fontWeight: 600, fontSize: 38, marginTop: 6 }}>S$0</div>
          <div className="small muted">forever</div>
          <ul>{free.map((t) => <li key={t}><Tick /> {t}</li>)}</ul>
          <Link href="/search" className="fc-btn fc-btn--ghost fc-btn--block" style={{ marginTop: 18 }}>Claim your profile</Link>
        </div>

        {/* Pro */}
        <div className="fc-card price price--pop">
          <div className="price__tag">Popular</div>
          <div className="eyebrow">Pro</div>
          <div className="serif" style={{ fontWeight: 600, fontSize: 38, marginTop: 6 }}>S$99<span style={{ fontSize: 16, color: "var(--slate)", fontFamily: "var(--font-sans)" }}>/mo</span></div>
          <div className="small muted">billed monthly</div>
          <ul>{pro.map((t) => <li key={t}><Tick /> {t}</li>)}</ul>
          <button onClick={() => handleCheckout("pro")} disabled={loading} className="fc-btn fc-btn--primary fc-btn--block" style={{ marginTop: 18 }}>
            {loading && showEmailInput === "pro" ? "Redirecting…" : "Add Pro tools"}
          </button>
        </div>

        {/* Premium */}
        <div className="fc-card price">
          <div className="eyebrow eyebrow--muted">Premium</div>
          <div className="serif" style={{ fontWeight: 600, fontSize: 38, marginTop: 6 }}>S$299<span style={{ fontSize: 16, color: "var(--slate)", fontFamily: "var(--font-sans)" }}>/mo</span></div>
          <div className="small muted">billed monthly</div>
          <ul>{premium.map((t) => <li key={t}><Tick /> {t}</li>)}</ul>
          <button onClick={() => handleCheckout("premium")} disabled={loading} className="fc-btn fc-btn--ghost fc-btn--block" style={{ marginTop: 18 }}>
            {loading && showEmailInput === "premium" ? "Redirecting…" : "Add Premium tools"}
          </button>
        </div>
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
            Haven&apos;t claimed your profile yet? <Link href="/search">Find and claim it first</Link> (free).
          </p>
        </div>
      )}

      <p className="mono small muted" style={{ textAlign: "center", marginTop: 18 }}>
        Paid tiers are tools only and never influence ranking position. Your AgentScore is computed from public data, and seller leads are matched on transaction record, not payment.
      </p>
    </div>
  );
}
