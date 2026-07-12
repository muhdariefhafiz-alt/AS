"use client";

import { useState } from "react";

// Time slots offered on the booking page (agent-agnostic default availability).
const SLOTS: string[] = [];
for (let h = 9; h <= 19; h++) {
  SLOTS.push(`${String(h).padStart(2, "0")}:00`);
  if (h < 19) SLOTS.push(`${String(h).padStart(2, "0")}:30`);
}

export default function BookingForm({ agentSlug, agentName }: { agentSlug: string; agentName: string }) {
  const [propertyLabel, setPropertyLabel] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [attendeeName, setAttendeeName] = useState("");
  const [attendeeContact, setAttendeeContact] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!propertyLabel || !date || !time || !attendeeName || !attendeeContact) {
      setError("Please fill in the property, date, time, your name and a contact.");
      return;
    }
    setBusy(true);
    try {
      const viewingAt = new Date(`${date}T${time}:00`).toISOString();
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentSlug, propertyLabel, viewingAt, attendeeName, attendeeContact, message }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok) setDone(true);
      else setError(j.error || "Something went wrong. Please try again.");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="fc-card fc-card--fill" style={{ padding: "24px 22px", textAlign: "center" }}>
        <div className="serif" style={{ fontSize: 22, fontWeight: 600, color: "var(--ink)" }}>Viewing requested</div>
        <p className="muted" style={{ marginTop: 8, fontSize: 15 }}>
          {agentName} has received your request for <strong>{propertyLabel}</strong> and will confirm the time with you shortly.
        </p>
      </div>
    );
  }

  // Date bounds: today to +90 days (computed in a handler-free way is fine here as
  // string min/max on the input, generated at render from the input's own value is not
  // possible, so we leave min unset and validate server-side; the API rejects past/far dates).
  return (
    <form onSubmit={submit} className="lp-panel" style={{ padding: "24px 24px" }}>
      <div className="fld">
        <label className="fc-label">Property or address</label>
        <input className="fc-input" value={propertyLabel} onChange={(e) => setPropertyLabel(e.target.value.slice(0, 120))} placeholder="e.g. Blk 332 Ubi Ave 1, #10-01" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 16, marginTop: 4 }}>
        <div className="fld">
          <label className="fc-label">Preferred date</label>
          <input className="fc-input" type="date" value={date} max="2035-12-31" onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="fld">
          <label className="fc-label">Preferred time</label>
          <select className="fc-select" value={time} onChange={(e) => setTime(e.target.value)}>
            <option value="">Pick a time</option>
            {SLOTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 16, marginTop: 4 }}>
        <div className="fld">
          <label className="fc-label">Your name</label>
          <input className="fc-input" value={attendeeName} onChange={(e) => setAttendeeName(e.target.value.slice(0, 80))} placeholder="Full name" />
        </div>
        <div className="fld">
          <label className="fc-label">Phone or email</label>
          <input className="fc-input" value={attendeeContact} onChange={(e) => setAttendeeContact(e.target.value.slice(0, 120))} placeholder="So the agent can confirm" />
        </div>
      </div>
      <div className="fld" style={{ marginTop: 4 }}>
        <label className="fc-label">Message (optional)</label>
        <textarea className="fc-input" value={message} onChange={(e) => setMessage(e.target.value.slice(0, 500))} rows={3} style={{ resize: "vertical", minHeight: 70, fontFamily: "inherit" }} placeholder="Anything the agent should know" />
      </div>

      {error && <div className="fc-alert fc-alert--warn" style={{ marginTop: 14 }}>{error}</div>}

      <button type="submit" className="fc-btn fc-btn--primary fc-btn--block" disabled={busy} style={{ marginTop: 16 }}>
        {busy ? "Requesting..." : "Request viewing"}
      </button>
      <p className="muted small" style={{ marginTop: 10, textAlign: "center" }}>
        No account needed. {agentName} confirms the final time with you directly.
      </p>
    </form>
  );
}
