"use client";

import { useEffect, useState } from "react";

export default function AgreementForm({ presetCea }: { presetCea?: string }) {
  const [cea, setCea] = useState(presetCea ?? "");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [accept, setAccept] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [already, setAlready] = useState<{ acceptedAt: string; name?: string | null } | null>(null);

  // If a CEA reg is preset, check whether they've already signed the current version.
  useEffect(() => {
    if (!presetCea) return;
    fetch(`/api/agent/agreement?cea=${encodeURIComponent(presetCea)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.signed) setAlready({ acceptedAt: d.acceptedAt, name: d.signatoryName });
      })
      .catch(() => {});
  }, [presetCea]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!accept) { setMessage("Please tick the box to accept the terms."); setStatus("error"); return; }
    setStatus("loading"); setMessage("");
    try {
      const res = await fetch("/api/agent/agreement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ceaRegistration: cea.trim(), email: email.trim(), signatoryName: name.trim(), accept: true, source: "self-serve" }),
      });
      const d = await res.json();
      if (res.ok && d.ok) { setStatus("done"); setMessage(d.alreadySigned ? "You have already accepted the current terms." : "Accepted. A copy is on file."); }
      else { setStatus("error"); setMessage(d.error || "Something went wrong."); }
    } catch {
      setStatus("error"); setMessage("Connection error. Please try again.");
    }
  }

  if (already || status === "done") {
    return (
      <div className="fc-card fc-card--pad" style={{ borderColor: "var(--ok)", background: "var(--ok-wash)" }}>
        <div style={{ fontWeight: 700, color: "var(--ok)" }}>Terms accepted</div>
        <p className="muted small" style={{ marginTop: 6 }}>
          {message || (already ? `Accepted${already.name ? ` by ${already.name}` : ""}.` : "Accepted.")} A copy is stored against your CEA registration.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="fc-card fc-card--pad" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="fc-field">
        <label className="fc-label">CEA registration</label>
        <input className="fc-input" value={cea} onChange={(e) => setCea(e.target.value)} placeholder="R000000A" required />
      </div>
      <div className="fc-field">
        <label className="fc-label">Email on your CEA record (or claimed-profile email)</label>
        <input className="fc-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
      </div>
      <div className="fc-field">
        <label className="fc-label">Full name (this is your signature)</label>
        <input className="fc-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" required />
      </div>
      <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14 }}>
        <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} style={{ marginTop: 3 }} />
        <span>I have read and agree to the FairComparisons Agent Terms above.</span>
      </label>
      {message && <p className="small" style={{ color: status === "error" ? "var(--danger)" : "var(--ok)" }}>{message}</p>}
      <button type="submit" className="fc-btn fc-btn--primary" disabled={status === "loading"}>
        {status === "loading" ? "Accepting…" : "Accept terms"}
      </button>
    </form>
  );
}
