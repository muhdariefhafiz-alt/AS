"use client";

import { useEffect, useState } from "react";

type Broadcast = {
  id: number;
  title: string;
  body: string;
  cta_label: string | null;
  cta_href: string | null;
  severity: string;
};

const TONE: Record<string, { bg: string; border: string; fg: string }> = {
  info: { bg: "var(--blue-wash)", border: "var(--blue)", fg: "var(--blue-deep)" },
  success: { bg: "var(--ok-wash)", border: "var(--ok)", fg: "var(--ok)" },
  warn: { bg: "var(--warn-wash)", border: "var(--warn)", fg: "var(--warn)" },
};

// Operator announcements targeted at this agent's cohort. Dismissible; a
// dismissal is remembered server-side so it does not reappear.
export default function DashboardBanner() {
  const [items, setItems] = useState<Broadcast[]>([]);

  useEffect(() => {
    let live = true;
    fetch("/api/dashboard/broadcasts")
      .then((r) => r.json())
      .then((j) => {
        if (live && Array.isArray(j.broadcasts)) setItems(j.broadcasts);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  function dismiss(id: number) {
    setItems((xs) => xs.filter((x) => x.id !== id)); // optimistic
    fetch("/api/dashboard/broadcast-dismiss", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ broadcast_id: id }),
    }).catch(() => {});
  }

  if (!items.length) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
      {items.map((b) => {
        const t = TONE[b.severity] ?? TONE.info;
        return (
          <div
            key={b.id}
            className="fc-card"
            style={{ padding: "14px 16px", borderLeft: `4px solid ${t.border}`, background: t.bg, display: "flex", gap: 12, alignItems: "flex-start" }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, color: "var(--ink)", fontSize: 14.5 }}>{b.title}</div>
              <p className="small" style={{ margin: "4px 0 0", color: "var(--ink-3)" }}>{b.body}</p>
              {b.cta_label && b.cta_href && (
                <a href={b.cta_href} style={{ display: "inline-block", marginTop: 8, fontWeight: 700, fontSize: 13.5, color: t.fg }}>
                  {b.cta_label} →
                </a>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismiss(b.id)}
              aria-label="Dismiss"
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--slate)", fontSize: 18, lineHeight: 1, padding: 2 }}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
