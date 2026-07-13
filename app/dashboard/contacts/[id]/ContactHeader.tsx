"use client";

import { useState } from "react";
import { formatPrice } from "../../../lib/narrativeHelpers";
import type { InboxLabel } from "../../../lib/inbox-labels";
import type { Lead, Shortlist } from "./ContactDetail";

type Props = {
  lead: Lead;
  shortlist: Shortlist;
  labels: InboxLabel[];
  allLabels: readonly InboxLabel[];
  busyLabel: InboxLabel | null;
  onToggleLabel: (label: InboxLabel) => void;
  onReplied: () => void;
};

const PROPERTY_TYPE_LABEL: Record<string, string> = { HDB: "HDB", CONDO: "Condo", EC: "EC", LANDED: "Landed" };
const TIMELINE_LABEL: Record<string, string> = {
  asap: "ASAP",
  "1_3m": "1–3 months",
  "3_6m": "3–6 months",
  "6_12m": "6–12 months",
  exploring: "Exploring",
};

function hoursBetween(a: string, b: string): number {
  return (new Date(b).getTime() - new Date(a).getTime()) / 3_600_000;
}
function humanDuration(hours: number): string {
  if (hours < 1) return "under an hour";
  if (hours < 24) return `${Math.round(hours)}h`;
  const d = Math.floor(hours / 24);
  const h = Math.round(hours - d * 24);
  return h ? `${d}d ${h}h` : `${d}d`;
}

export default function ContactHeader({ lead, shortlist, labels, allLabels, busyLabel, onToggleLabel, onReplied }: Props) {
  const [marking, setMarking] = useState(false);

  const propType = PROPERTY_TYPE_LABEL[lead.property_type] || lead.property_type;
  const area = lead.town || (lead.district_code ? `District ${lead.district_code}` : "n/a");
  const asking =
    lead.est_value_low && lead.est_value_high
      ? `${formatPrice(lead.est_value_low)} – ${formatPrice(lead.est_value_high)}`
      : formatPrice(lead.est_value_low || lead.est_value_high);
  const timeline = TIMELINE_LABEL[lead.timeline || ""] || lead.timeline || "n/a";

  const invited = shortlist.invited_at;
  const replied = shortlist.first_reply_at;
  const ageH = invited ? hoursBetween(invited, new Date().toISOString()) : null;
  const overdue = ageH != null && ageH >= 24;
  const needsReply = shortlist.status === "invited" && !replied;

  // Honest per-lead reply-timing (no fabricated points/percentiles). Either the
  // real reply latency, or the live SLA countdown, nothing about AgentScore.
  let timingChip: { text: string; cls: string } | null = null;
  if (replied && invited) {
    timingChip = { text: `You replied in ${humanDuration(hoursBetween(invited, replied))}`, cls: "fc-badge--ok" };
  } else if (needsReply && ageH != null) {
    timingChip = overdue
      ? { text: `Overdue: ${humanDuration(ageH)} since invite`, cls: "fc-badge--warn" }
      : { text: `Awaiting your reply, ${humanDuration(ageH)} since invite · target 24h`, cls: "fc-badge--warn" };
  }

  async function markReplied() {
    if (marking) return;
    setMarking(true);
    try {
      const res = await fetch("/api/dashboard/leads/reply-sent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shortlist_id: shortlist.id }),
      });
      if (res.ok) onReplied();
    } finally {
      setMarking(false);
    }
  }

  return (
    <section className="fc-card fc-card--pad">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div>
          <h1 className="serif" style={{ fontSize: "var(--t-h2)", margin: 0, color: "var(--ink)" }}>
            {lead.full_name || "Seller"}
          </h1>
          <p className="muted" style={{ margin: "4px 0 0" }}>
            {propType} in {area}
          </p>
        </div>
        {timingChip && <span className={`fc-badge ${timingChip.cls} fc-badge--sm`}>{timingChip.text}</span>}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
          gap: 14,
          margin: "18px 0",
        }}
      >
        <Stat label="Asking" value={asking} />
        <Stat label="Timeline" value={timeline} />
        <Stat label="Bedrooms" value={lead.bedrooms ? String(lead.bedrooms) : "n/a"} />
        <Stat label="Status" value={shortlist.status} capitalize />
      </div>

      {/* Private per-agent labels (controlled vocabulary). */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <span className="kicker">Label</span>
        {allLabels.map((l) => {
          const active = labels.includes(l);
          return (
            <button
              key={l}
              type="button"
              className={`fc-chip${active ? " fc-chip--active" : ""}`}
              onClick={() => onToggleLabel(l)}
              disabled={busyLabel === l}
              aria-pressed={active}
            >
              {l}
            </button>
          );
        })}
      </div>

      {needsReply && (
        <div style={{ marginTop: 16 }}>
          <button type="button" className="fc-btn fc-btn--primary fc-btn--sm" onClick={markReplied} disabled={marking}>
            {marking ? "Marking…" : "Mark as replied"}
          </button>
        </div>
      )}
    </section>
  );
}

function Stat({ label, value, capitalize }: { label: string; value: string; capitalize?: boolean }) {
  return (
    <div>
      <div className="kicker">{label}</div>
      <div
        style={{
          fontSize: 17,
          fontWeight: 700,
          color: "var(--ink)",
          textTransform: capitalize ? "capitalize" : "none",
        }}
      >
        {value}
      </div>
    </div>
  );
}
