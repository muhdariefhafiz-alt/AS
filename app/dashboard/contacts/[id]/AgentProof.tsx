"use client";

import { formatPrice } from "../../../lib/narrativeHelpers";

export type Proof = {
  score: number | null;
  agencyName: string | null;
  name: string | null;
  primaryArea: string | null;
  yearsActive: number | null;
  txnTotals: { total: number; sales: number; rentals: number; sellerSales: number };
  recentDeals: { month: string; propertyType: string; transactionType: string; represented: string; area: string }[];
  comps: { title: string; subtitle: string; price: number | null; event_date: string }[];
  areaMedian: number | null;
  areaLabel: string | null;
  standing: { areaName: string; agentPct: number | null; agentRank: number | null; agentTotal: number | null } | null;
};

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// get_agent_standing.agent_pct is "better than N%" (higher = better).
function standingBand(pct: number | null): string | null {
  if (pct == null) return null;
  if (pct >= 90) return "Top 10%";
  if (pct >= 75) return "Top 25%";
  if (pct >= 50) return "Top half";
  return "Ranked";
}

export default function AgentProof({ proof, propertyType }: { proof: Proof; propertyType: string }) {
  const { score, txnTotals, recentDeals, comps, areaMedian, areaLabel, standing, primaryArea, yearsActive } = proof;
  const band = standing ? standingBand(standing.agentPct) : null;

  return (
    <section className="fc-card fc-card--pad" style={{ background: "var(--blue-wash)", borderColor: "transparent" }}>
      <div className="kicker" style={{ marginBottom: 12 }}>Your proof</div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16 }}>
        <div>
          <div className="kicker">AgentScore</div>
          <div className="tnum" style={{ fontSize: 34, fontWeight: 800, color: "var(--blue-deep)", lineHeight: 1.1 }}>
            {score ?? "n/a"}
          </div>
          {band && standing && (
            <div className="small" style={{ color: "var(--blue-deep)", fontWeight: 600 }}>
              {band} in {standing.areaName || primaryArea}
              {standing.agentTotal ? ` of ${standing.agentTotal}` : ""}
            </div>
          )}
        </div>

        <div>
          <div className="kicker">Track record</div>
          <div style={{ fontSize: 15, color: "var(--ink)", fontWeight: 700 }}>
            {txnTotals.total.toLocaleString()} transactions
          </div>
          <div className="small muted">
            {txnTotals.sales.toLocaleString()} sales · {txnTotals.rentals.toLocaleString()} rentals
            {txnTotals.sellerSales ? ` · ${txnTotals.sellerSales.toLocaleString()} as seller's agent` : ""}
          </div>
        </div>

        <div>
          <div className="kicker">Area & experience</div>
          <div style={{ fontSize: 15, color: "var(--ink)", fontWeight: 700 }}>{primaryArea || "n/a"}</div>
          <div className="small muted">{yearsActive ? `${Math.round(yearsActive)} years active` : "Active agent"}</div>
        </div>
      </div>

      {recentDeals.length > 0 && (
        <div className="fc-card fc-card--pad" style={{ marginTop: 16 }}>
          <div className="kicker" style={{ marginBottom: 10 }}>Your recent transactions</div>
          <div style={{ display: "grid", gap: 8 }}>
            {recentDeals.map((d, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  paddingBottom: 8,
                  borderBottom: i < recentDeals.length - 1 ? "1px solid var(--line)" : "none",
                }}
              >
                <span style={{ color: "var(--ink)" }}>
                  {titleCase(d.transactionType || d.propertyType)}
                  {d.area ? ` · ${titleCase(d.area)}` : ""}
                </span>
                <span className="small muted" style={{ whiteSpace: "nowrap" }}>
                  {d.represented ? `acted for ${titleCase(d.represented)}` : ""} · {d.month}
                </span>
              </div>
            ))}
          </div>
          <p className="small muted" style={{ marginTop: 8 }}>
            From official CEA transaction records. Counts, not prices; the register does not publish per-deal prices.
          </p>
        </div>
      )}

      {comps.length > 0 && (
        <div className="fc-card fc-card--pad" style={{ marginTop: 12 }}>
          <div className="kicker" style={{ marginBottom: 10 }}>
            Recent {propertyType.toUpperCase() === "HDB" ? "HDB" : "private"} deals in {areaLabel || "the area"}
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {comps.map((c, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  paddingBottom: 8,
                  borderBottom: i < comps.length - 1 ? "1px solid var(--line)" : "none",
                }}
              >
                <span style={{ color: "var(--ink)" }}>
                  {c.title}
                  {c.subtitle ? <span className="muted"> · {c.subtitle}</span> : null}
                </span>
                <span className="tnum" style={{ fontWeight: 700, color: "var(--ink)", whiteSpace: "nowrap" }}>
                  {c.price != null ? formatPrice(c.price) : "n/a"}
                </span>
              </div>
            ))}
          </div>
          {areaMedian != null && (
            <p className="small muted" style={{ marginTop: 8 }}>
              Median of recent deals shown: <strong className="tnum">{formatPrice(areaMedian)}</strong>. Context for the
              seller&apos;s asking range, not a per-room valuation.
            </p>
          )}
        </div>
      )}

      <div className="fc-alert fc-alert--ok" style={{ marginTop: 14 }}>
        Every figure here comes from official CEA/URA/HDB records. Nothing invented.
      </div>
    </section>
  );
}
