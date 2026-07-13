"use client";

import { useEffect, useState, useCallback } from "react";

// Planner: the agent's viewing appointments booked through their public /book
// link, plus the link itself to share. Every viewing is a real request from
// sg_viewings; the agent confirms, completes or cancels each one.

type Viewing = {
  id: string;
  property_label: string;
  viewing_at: string;
  attendee_name: string;
  attendee_contact: string;
  message: string | null;
  status: "requested" | "confirmed" | "completed" | "cancelled";
  created_at: string;
};

const STATUS_STYLE: Record<Viewing["status"], { bg: string; color: string; label: string }> = {
  requested: { bg: "#fff4e5", color: "#93500b", label: "New request" },
  confirmed: { bg: "#e7f0ff", color: "#1f44ff", label: "Confirmed" },
  completed: { bg: "#e7f6ef", color: "#0a6b4b", label: "Completed" },
  cancelled: { bg: "#f1f2f5", color: "#6b7280", label: "Cancelled" },
};

function fmt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-SG", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true }).format(d);
}

export default function PlannerPanel() {
  const [viewings, setViewings] = useState<Viewing[]>([]);
  const [bookUrl, setBookUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [cal, setCal] = useState<{ configured: boolean; connected: boolean; email?: string | null } | null>(null);

  const load = useCallback(async () => {
    try {
      const [res, calRes] = await Promise.all([
        fetch("/api/dashboard/viewings"),
        fetch("/api/agent/calendar/status"),
      ]);
      if (calRes.ok) setCal(await calRes.json());
      if (!res.ok) return;
      const j = await res.json();
      setViewings(j.viewings ?? []);
      setBookUrl(j.bookUrl ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function setStatus(id: string, status: Viewing["status"]) {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/dashboard/viewings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        const j = await res.json();
        setViewings(j.viewings ?? []);
      }
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!bookUrl) return;
    try {
      await navigator.clipboard.writeText(bookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
  }

  if (loading) {
    return (
      <div className="fc-card fc-card--pad">
        <p className="muted small" style={{ margin: 0 }}>Loading your Planner...</p>
      </div>
    );
  }

  const active = viewings.filter((v) => v.status !== "cancelled" && v.status !== "completed");
  const archive = viewings.filter((v) => v.status === "cancelled" || v.status === "completed");

  return (
    <div className="fc-card fc-card--pad">
      <div className="fc-row" style={{ justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
        <div>
          <p className="kicker" style={{ color: "var(--blue-deep)", margin: 0 }}>Planner</p>
          <h2 style={{ fontSize: 18, margin: "4px 0 0" }}>Viewings</h2>
        </div>
        <span className="muted small">{active.length} active</span>
      </div>

      {/* Shareable booking link */}
      {bookUrl && (
        <div className="fc-card fc-card--fill" style={{ marginTop: 14, padding: "14px 16px" }}>
          <div className="fc-row" style={{ justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ minWidth: 0 }}>
              <div className="kicker">Your booking link</div>
              <div className="mono small" style={{ marginTop: 3, color: "var(--slate)", wordBreak: "break-all" }}>{bookUrl}</div>
            </div>
            <button type="button" onClick={copyLink} className="fc-btn fc-btn--ink fc-btn--sm" style={{ flexShrink: 0 }}>
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
          <p className="muted small" style={{ margin: "8px 0 0" }}>Share it in your listings, bio and messages so buyers can request a viewing time.</p>
        </div>
      )}

      {/* Google Calendar connect: only shows once the integration is configured.
          Connected agents get every viewing they confirm dropped into their own
          calendar automatically. */}
      {cal?.configured && (
        <div className="fc-card fc-card--fill" style={{ marginTop: 12, padding: "12px 16px" }}>
          {cal.connected ? (
            <div className="fc-row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ color: "var(--ok)", fontWeight: 700, fontSize: 13 }}>&#10003; Google Calendar connected</span>
              {cal.email && <span className="muted small">· {cal.email}</span>}
              <span className="muted small" style={{ flexBasis: "100%" }}>Every viewing you confirm is added to your calendar automatically.</span>
            </div>
          ) : (
            <div className="fc-row" style={{ justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>Connect your calendar</div>
                <div className="muted small" style={{ marginTop: 2 }}>Confirmed viewings drop straight into your Google Calendar. We only add events, never read the rest.</div>
              </div>
              <a href="/api/agent/calendar/google/start" className="fc-btn fc-btn--ink fc-btn--sm" style={{ flexShrink: 0, textDecoration: "none" }}>
                Connect Google Calendar
              </a>
            </div>
          )}
        </div>
      )}

      {active.length === 0 && (
        <p className="muted small" style={{ marginTop: 14 }}>
          No viewings yet. Share your booking link above and requests will appear here for you to confirm.
        </p>
      )}

      {active.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, margin: "14px 0 0", display: "flex", flexDirection: "column", gap: 10 }}>
          {active.map((v) => {
            const s = STATUS_STYLE[v.status];
            return (
              <li key={v.id} className="fc-card" style={{ padding: "13px 15px" }}>
                <div className="fc-row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14.5, color: "var(--ink)" }}>{v.property_label}</div>
                    <div className="small" style={{ marginTop: 2, color: "var(--blue-deep)", fontWeight: 600 }}>{fmt(v.viewing_at)}</div>
                    <div className="muted small" style={{ marginTop: 3 }}>{v.attendee_name} · {v.attendee_contact}</div>
                    {v.message && <div className="muted small" style={{ marginTop: 3, fontStyle: "italic" }}>&ldquo;{v.message}&rdquo;</div>}
                  </div>
                  <span className="fc-badge" style={{ background: s.bg, color: s.color, fontWeight: 600, flexShrink: 0 }}>{s.label}</span>
                </div>
                <div className="fc-row" style={{ gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                  {v.status === "requested" && (
                    <button type="button" disabled={busy} onClick={() => setStatus(v.id, "confirmed")} className="fc-btn fc-btn--primary fc-btn--sm">Confirm</button>
                  )}
                  {v.status === "confirmed" && (
                    <button type="button" disabled={busy} onClick={() => setStatus(v.id, "completed")} className="fc-btn fc-btn--ink fc-btn--sm">Mark done</button>
                  )}
                  <button type="button" disabled={busy} onClick={() => setStatus(v.id, "cancelled")} className="fc-btn fc-btn--ghost fc-btn--sm">Cancel</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {archive.length > 0 && (
        <details style={{ marginTop: 14 }}>
          <summary className="mono" style={{ cursor: "pointer", fontSize: 12.5, color: "var(--slate)" }}>
            {archive.length} completed / cancelled
          </summary>
          <ul style={{ listStyle: "none", padding: 0, margin: "10px 0 0", display: "flex", flexDirection: "column", gap: 6 }}>
            {archive.map((v) => (
              <li key={v.id} className="fc-row" style={{ justifyContent: "space-between", fontSize: 13, color: "var(--slate)", padding: "4px 0" }}>
                <span>{v.property_label} · {fmt(v.viewing_at)}</span>
                <span>{STATUS_STYLE[v.status].label}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
