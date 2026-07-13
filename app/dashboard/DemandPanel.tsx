"use client";

import { useEffect, useState } from "react";

// Demand Dashboard: the aha made visible. Real sellers viewing, shortlisting
// and inviting THIS agent, from owned data. Numbers are honest (zeros show as
// zeros) and demand is never for sale: nothing here affects rank or lead flow.

type Demand = {
  views7: number;
  views30: number;
  shortlists30: number;
  invites30: number;
  quotes30: number;
  winsAll: number;
};

export default function DemandPanel() {
  const [d, setD] = useState<Demand | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/dashboard/demand");
        if (res.ok) setD(await res.json());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="fc-card fc-card--pad">
        <p className="muted small" style={{ margin: 0 }}>Loading your demand...</p>
      </div>
    );
  }
  if (!d) return null;

  const stats: { value: number; label: string; sub: string }[] = [
    { value: d.views7, label: "Profile views", sub: "last 7 days" },
    { value: d.shortlists30, label: "Shortlist appearances", sub: "last 30 days" },
    { value: d.invites30, label: "Invites to quote", sub: "last 30 days" },
    { value: d.winsAll, label: "Sellers won", sub: "all time" },
  ];
  const quiet = d.views30 === 0 && d.shortlists30 === 0 && d.invites30 === 0;

  return (
    <div className="fc-card fc-card--pad">
      <div className="fc-row" style={{ justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
        <div>
          <p className="kicker" style={{ color: "var(--blue-deep)", margin: 0 }}>Your demand</p>
          <h2 style={{ fontSize: 18, margin: "4px 0 0" }}>Sellers looking at you</h2>
        </div>
        <span className="muted small">Real activity from sellers comparing agents.</span>
      </div>

      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
        {stats.map((s) => (
          <div key={s.label} className="fc-card fc-card--fill" style={{ padding: "14px 16px" }}>
            <div className="serif tnum" style={{ fontSize: 28, fontWeight: 600, color: s.value > 0 ? "var(--blue-deep)" : "var(--ink)" }}>
              {s.value.toLocaleString()}
            </div>
            <div style={{ fontWeight: 600, fontSize: 13, marginTop: 2, color: "var(--ink)" }}>{s.label}</div>
            <div className="muted small">{s.sub}</div>
          </div>
        ))}
      </div>

      {quiet && (
        <p className="muted small" style={{ marginTop: 12 }}>
          Your ranking is already working for you around the clock. Finish your profile above (photo, message, WhatsApp) and add your farm areas so more of the sellers who find you reach out.
        </p>
      )}

      <p className="muted small" style={{ marginTop: 12 }}>
        {d.views30.toLocaleString()} profile views and {d.quotes30.toLocaleString()} quotes sent in the last 30 days. Demand is never for sale: these numbers never change your rank or who receives leads.
      </p>
    </div>
  );
}
