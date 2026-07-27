"use client";

import { useState } from "react";
import Link from "next/link";
import { TIER_LABEL, TIER_PRICE, isPaid, type Tier } from "../lib/tiers";

// Account-settings "Plan & billing" panel. One coherent surface for every tier:
//   free  -> compact upgrade chooser
//   paid  -> change plan + manage billing (Stripe portal) + period-end notice
//   sandbox -> a clearly-marked test block: test-mode checkout note + simulate
//              buttons that flip the tier with no payment (preview the gates).
// All billing actions delegate to the parent (handleUpgrade / openBillingPortal)
// so there is one code path; only the sandbox simulate call lives here.

const PAID: Exclude<Tier, "free">[] = ["verified", "professional", "elite"];
const ALL: Tier[] = ["free", "verified", "professional", "elite"];

export default function PlanBillingPanel({
  tier,
  subscriptionEndsAt,
  isSandbox,
  sandboxTestReady,
  checkoutLoading,
  billingLoading,
  onUpgrade,
  onManageBilling,
  onSandboxChanged,
}: {
  tier: Tier;
  subscriptionEndsAt: string | null;
  isSandbox: boolean;
  sandboxTestReady: boolean;
  checkoutLoading: string | null;
  billingLoading: boolean;
  onUpgrade: (t: Exclude<Tier, "free">) => void;
  onManageBilling: (flow?: "update_plan") => void;
  onSandboxChanged: (t: Tier) => void;
}) {
  const [simBusy, setSimBusy] = useState<string | null>(null);
  const [simErr, setSimErr] = useState("");
  const paid = isPaid(tier);
  const endsDate = subscriptionEndsAt
    ? new Date(subscriptionEndsAt).toLocaleDateString("en-SG", { day: "numeric", month: "long", year: "numeric" })
    : null;

  async function simulate(t: Tier) {
    setSimBusy(t);
    setSimErr("");
    try {
      const res = await fetch("/api/dashboard/sandbox/tier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: t }),
      });
      const data = await res.json();
      if (!res.ok) { setSimErr(data.error || "Could not switch."); setSimBusy(null); return; }
      onSandboxChanged(t);
    } catch {
      setSimErr("Connection error.");
    }
    setSimBusy(null);
  }

  return (
    <div id="billing-card" className="fc-card fc-hero-in" style={{ padding: 22 }}>
      <div className="fc-row" style={{ justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
        <p className="kicker" style={{ margin: 0 }}>Plan &amp; billing</p>
        <span className="fc-badge" style={{ background: paid ? "var(--blue-wash)" : "var(--cloud)", color: paid ? "var(--blue-deep)" : "var(--ink)" }}>
          {paid ? `${TIER_LABEL[tier]} · S$${TIER_PRICE[tier as Exclude<Tier, "free">]}/mo` : "Free plan"}
        </span>
      </div>

      {endsDate ? (
        <p className="small" style={{ marginTop: 10, color: "var(--danger)" }}>
          Your plan is set to end on {endsDate}. Your tools stay active until then; reactivate any time from billing.
        </p>
      ) : paid ? (
        <p className="muted small" style={{ marginTop: 10 }}>
          Change plan, update your card, download invoices or cancel. Plan changes show the prorated amount before
          you confirm, and cancelling keeps your tools until the period you paid for ends.
        </p>
      ) : (
        <p className="muted small" style={{ marginTop: 10 }}>
          You&apos;re on the free plan: listed, ranked and receiving seller enquiries at no cost. Optional paid tiers add
          reputation and analytics tools and never change your ranking.
        </p>
      )}

      {/* PAID: manage via Stripe portal */}
      {paid && (
        <div className="fc-row" style={{ gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <button onClick={() => onManageBilling("update_plan")} disabled={billingLoading} className="fc-btn fc-btn--ghost fc-btn--sm">
            {billingLoading ? "Opening…" : "Change plan"}
          </button>
          <button onClick={() => onManageBilling()} disabled={billingLoading} className="fc-btn fc-btn--quiet fc-btn--sm">
            {billingLoading ? "Opening…" : "Manage billing"}
          </button>
        </div>
      )}

      {/* FREE: compact upgrade chooser */}
      {!paid && (
        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
          {PAID.map((t) => (
            <div key={t} className="fc-card" style={{ padding: "12px 14px", background: "#fff" }}>
              <div className="fc-row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{TIER_LABEL[t]}</span>
                <span className="serif" style={{ fontWeight: 600, fontSize: 17 }}>S${TIER_PRICE[t]}</span>
              </div>
              <button
                onClick={() => onUpgrade(t)}
                disabled={checkoutLoading !== null}
                className="fc-btn fc-btn--ghost fc-btn--sm fc-btn--block"
                style={{ marginTop: 10 }}
              >
                {checkoutLoading === t ? "…" : "Upgrade"}
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="small" style={{ marginTop: 12 }}>
        <Link href="/for-agents" style={{ color: "var(--blue)", fontWeight: 600 }}>Compare all plans &rsaquo;</Link>
      </p>

      {/* SANDBOX: test-mode + simulate controls (only ever rendered for the
          single is_sandbox test account; the endpoint re-checks server-side). */}
      {isSandbox && (
        <div className="fc-scene fc-scene--ink" style={{ marginTop: 16, padding: "clamp(10px,1.6vw,14px)" }}>
          <div className="fc-scene__card" style={{ padding: "14px 16px" }}>
            <div className="fc-row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
              <p className="kicker" style={{ margin: 0 }}>Sandbox testing</p>
              <span className="fc-badge" style={{ background: "#78350f", color: "#fde68a" }}>test account</span>
            </div>
            {sandboxTestReady ? (
              <p className="small" style={{ marginTop: 8 }}>
                Real checkout runs in <strong>Stripe test mode</strong>. Click Upgrade above, then pay with card{" "}
                <code>4242 4242 4242 4242</code>, any future expiry, any CVC and postal code. No money moves.
              </p>
            ) : (
              <p className="small" style={{ marginTop: 8, color: "var(--warn)" }}>
                Add <code>STRIPE_TEST_SECRET_KEY</code> (sk_test_…) in Vercel to run a real test checkout. Until then,
                use Simulate below to preview the paid tools instantly (no payment).
              </p>
            )}
            <p className="muted small" style={{ marginTop: 10, marginBottom: 6 }}>Simulate a tier (no payment, preview only):</p>
            <div className="fc-row" style={{ gap: 8, flexWrap: "wrap" }}>
              {ALL.map((t) => (
                <button
                  key={t}
                  onClick={() => simulate(t)}
                  disabled={simBusy !== null || t === tier}
                  className="fc-btn fc-btn--quiet fc-btn--sm"
                  style={t === tier ? { opacity: 0.5 } : undefined}
                >
                  {simBusy === t ? "…" : t === tier ? `${TIER_LABEL[t]} (current)` : TIER_LABEL[t]}
                </button>
              ))}
            </div>
            {simErr && <p className="small" style={{ color: "var(--danger)", marginTop: 8 }}>{simErr}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
