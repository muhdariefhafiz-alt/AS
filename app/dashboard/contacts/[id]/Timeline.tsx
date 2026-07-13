"use client";

export type TimelineItem = {
  id: string;
  event_type: string;
  at: string | null;
  meta?: Record<string, unknown> | null;
};

type Style = { icon: string; label: string; accent: string };

const EVENT_STYLE: Record<string, Style> = {
  lead_invited: { icon: "◆", label: "Lead invited", accent: "var(--blue)" },
  reply_sent: { icon: "✓", label: "Reply sent", accent: "var(--ok)" },
  email_reply: { icon: "↩", label: "Seller replied", accent: "var(--ink-2)" },
  agent_note: { icon: "✎", label: "Note", accent: "var(--slate)" },
  quote_submitted: { icon: "$", label: "Quote submitted", accent: "var(--blue-deep)" },
  viewing_booked: { icon: "◷", label: "Viewing booked", accent: "var(--blue)" },
  lead_picked: { icon: "★", label: "Seller picked you", accent: "var(--ok)" },
  lead_not_picked: { icon: "·", label: "Seller picked another agent", accent: "var(--slate)" },
};
const FALLBACK: Style = { icon: "•", label: "Event", accent: "var(--line-2)" };

function fmt(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-SG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-SG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function context(item: TimelineItem): string {
  const m = item.meta ?? {};
  switch (item.event_type) {
    case "lead_invited":
      return "Seller shortlisted you and invited a quote.";
    case "reply_sent":
      return "You marked your first reply as sent.";
    case "email_reply": {
      const subj = typeof m.subject === "string" && m.subject ? `“${m.subject}”: ` : "";
      const text = typeof m.text === "string" ? m.text : "";
      return `${subj}${text}`.trim() || "Seller replied by email.";
    }
    case "agent_note":
      return typeof m.text === "string" ? m.text : "";
    case "quote_submitted":
      return "You submitted a quote to the seller.";
    case "viewing_booked": {
      const label = typeof m.property_label === "string" && m.property_label ? m.property_label : "Viewing";
      const when = typeof m.viewing_at === "string" ? fmtDate(m.viewing_at) : "";
      const status = typeof m.status === "string" && m.status ? ` · ${m.status}` : "";
      return `${label}${when ? ` · ${when}` : ""}${status}`;
    }
    case "lead_picked":
      return "The seller chose you as their agent.";
    case "lead_not_picked":
      return "The seller chose another agent. The record still counts toward your standing.";
    default:
      return "";
  }
}

export default function Timeline({ items }: { items: TimelineItem[] }) {
  if (!items.length) {
    return <p className="muted small">No activity yet. It will appear here as the lead progresses.</p>;
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {items.map((item) => {
        const s = EVENT_STYLE[item.event_type] ?? FALLBACK;
        const body = context(item);
        return (
          <div
            key={item.id}
            className="fc-card"
            style={{ padding: "12px 14px", borderLeft: `3px solid ${s.accent}`, background: "var(--paper)" }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
              <span style={{ color: s.accent, fontWeight: 700 }} aria-hidden>
                {s.icon}
              </span>
              <span style={{ fontWeight: 700, color: "var(--ink)", fontSize: 14 }}>{s.label}</span>
              <span className="kicker" style={{ marginLeft: "auto" }}>
                {fmt(item.at)}
              </span>
            </div>
            {body && (
              <p className="small" style={{ margin: "6px 0 0", color: "var(--ink-3)", whiteSpace: "pre-wrap" }}>
                {body}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
