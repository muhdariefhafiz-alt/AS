import Link from "next/link";

// "Your standing" panel (MVP). Leads with the percentile band, not a raw rank,
// so a strong agent reads as "Top 10%" rather than "#560". Low-ranked agents get
// a forward frame, never an absolute floor. Unranked agents get an on-the-board
// invitation. All framing is factual and CEA-derived.

export type Standing = {
  area_type: string;
  area_name: string;
  agent_rank: number | null;
  agent_total: number | null;
  agent_score: number | null;
  agent_pct: number | null;
  agent_area_txns: number | null;
  above_txns: number | null;
  top_txns: number | null;
  movement?: { delta: number; prev_month: string; prev_pct: number | null } | null;
} | null;

const fmt = (n: number | null | undefined) => (n == null ? "" : n.toLocaleString("en-SG"));
const MONTHS = ["", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];
const monthName = (d: string) => MONTHS[Number((d || "").slice(5, 7))] || "";
const tc = (s: string) =>
  s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()).replace(/\bHdb\b/g, "HDB").replace(/\bMrt\b/g, "MRT");

export default function StandingPanel({
  standing,
  primaryArea,
  score,
}: {
  standing: Standing;
  primaryArea: string | null;
  score: number | null;
}) {
  const s = standing;
  const scoreChip =
    score != null ? (
      <span className="fc-badge" style={{ background: "var(--cloud)", color: "var(--ink)" }}>
        AgentScore {Math.round(Number(score))}
      </span>
    ) : null;

  // Unranked: forward state, never a floor.
  if (!s || s.agent_rank == null || s.agent_pct == null || !s.area_name) {
    const area = s?.area_name ? tc(s.area_name) : primaryArea ? tc(primaryArea) : "your area";
    return (
      <div className="fc-card fc-card--pad" style={{ background: "var(--blue-wash)" }}>
        <div className="fc-row" style={{ justifyContent: "space-between", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
          <div className="kicker">Your standing</div>
          {scoreChip}
        </div>
        <p className="serif" style={{ fontSize: 22, fontWeight: 600, margin: "8px 0 0" }}>
          You are on the board in {area}.
        </p>
        <p className="muted" style={{ margin: "6px 0 0", fontSize: 14 }}>
          A recorded seller-side deal in {area} puts you on the ranked board. Your standing is computed only from
          official CEA transaction records.
        </p>
        <p className="mono small muted" style={{ marginTop: 10 }}>
          <Link href="/how-we-score" style={{ color: "var(--blue)" }}>
            How scoring works
          </Link>
        </p>
      </div>
    );
  }

  const pct = s.agent_pct;
  const areaBase = tc(s.area_name);
  const area = areaBase + (s.area_type === "town" ? " HDB" : "");
  const b =
    pct >= 90
      ? { label: "Top 10%", tone: "var(--blue-deep)" }
      : pct >= 75
      ? { label: "Top 25%", tone: "var(--blue)" }
      : pct >= 50
      ? { label: "Top half", tone: "var(--ink)" }
      : { label: "Building", tone: "var(--ink)" };
  const showRank = pct >= 25; // hide the raw rank for the bottom quartile (avoid the floor)
  const showGap = pct >= 90 && s.above_txns != null; // the neighbor gap only motivates near the very top

  return (
    <div className="fc-card fc-card--pad" style={{ background: "var(--blue-wash)" }}>
      <div className="fc-row" style={{ justifyContent: "space-between", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <div className="kicker">Your standing in {areaBase}</div>
        {scoreChip}
      </div>
      <p className="serif" style={{ fontSize: 30, fontWeight: 700, color: b.tone, margin: "6px 0 0" }}>
        {b.label} of agents in {areaBase}
      </p>
      {showRank ? (
        <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
          Ranked #{fmt(s.agent_rank)} of {fmt(s.agent_total)} scored agents active in {area}, on AgentScore.
        </p>
      ) : (
        <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
          You are active in {area}. Keep closing seller-side deals to climb the board.
        </p>
      )}
      {showRank && s.movement && (
        <p style={{ margin: "8px 0 0", fontSize: 14, fontWeight: 600, color: s.movement.delta > 0 ? "var(--blue-deep)" : "var(--ink)" }}>
          {s.movement.delta > 0
            ? `Up ${s.movement.delta} ${s.movement.delta === 1 ? "place" : "places"} since ${monthName(s.movement.prev_month)}.`
            : s.movement.delta < 0
            ? `Down ${Math.abs(s.movement.delta)} ${Math.abs(s.movement.delta) === 1 ? "place" : "places"} since ${monthName(s.movement.prev_month)}.`
            : `You held your position since ${monthName(s.movement.prev_month)}.`}
        </p>
      )}
      {showGap && (
        <p style={{ margin: "10px 0 0", fontSize: 14, color: "var(--ink)" }}>
          The agent just above you has {fmt(s.above_txns)} recorded deals in {areaBase}. You have {fmt(s.agent_area_txns)}.
        </p>
      )}
      <p className="mono small muted" style={{ marginTop: 10 }}>
        Computed from official CEA transaction records.{" "}
        <Link href="/how-we-score" style={{ color: "var(--blue)" }}>
          How scoring works
        </Link>
      </p>
    </div>
  );
}
