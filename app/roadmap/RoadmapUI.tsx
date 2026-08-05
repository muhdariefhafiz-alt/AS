import Link from "next/link";
import type { RoadmapEntry, RoadmapStatus } from "../lib/roadmap";

// Shared presentation for the roadmap index and its posts.

export const STATUS_META: Record<RoadmapStatus, { label: string; bg: string; fg: string }> = {
  live: { label: "Live", bg: "var(--ok-wash)", fg: "var(--ok)" },
  building: { label: "Building now", bg: "var(--blue-wash)", fg: "var(--blue-deep)" },
  exploring: { label: "Exploring", bg: "var(--cloud)", fg: "var(--slate)" },
};

export const AUDIENCE_LABEL: Record<RoadmapEntry["audience"], string> = {
  agents: "For agents",
  sellers: "For sellers and landlords",
  everyone: "For everyone",
};

export function StatusPill({ status }: { status: RoadmapStatus }) {
  const s = STATUS_META[status];
  return (
    <span className="fc-badge" style={{ background: s.bg, color: s.fg, flexShrink: 0 }}>
      {s.label}
    </span>
  );
}

export function shippedLabel(iso?: string): string {
  if (!iso) return "";
  const [y, m] = iso.split("-").map(Number);
  const month = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
  return month;
}

export function EntryCard({ entry, index }: { entry: RoadmapEntry; index: number }) {
  return (
    <Link
      href={`/roadmap/${entry.slug}`}
      className="fc-card fc-card--pad fc-reveal"
      style={{
        ["--reveal-delay" as string]: `${Math.min(index * 0.05, 0.4)}s`,
        display: "block",
        background: "#fff",
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <div className="fc-row" style={{ justifyContent: "space-between", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <span className="kicker" style={{ margin: 0 }}>{AUDIENCE_LABEL[entry.audience]}</span>
        <StatusPill status={entry.status} />
      </div>
      <h3 className="serif" style={{ fontSize: 19, margin: "8px 0 0" }}>{entry.title}</h3>
      <p className="muted" style={{ marginTop: 6, fontSize: 14.5, lineHeight: 1.55 }}>{entry.summary}</p>
      <div className="fc-row" style={{ justifyContent: "space-between", alignItems: "center", marginTop: 12, gap: 8 }}>
        <span className="small" style={{ color: "var(--blue)", fontWeight: 600 }}>Read the detail &rarr;</span>
        {entry.shipped && (
          <span className="mono" style={{ fontSize: 11, color: "var(--slate)" }}>{shippedLabel(entry.shipped)}</span>
        )}
      </div>
    </Link>
  );
}
