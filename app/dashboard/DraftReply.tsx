"use client";

import { useState } from "react";

// AI-drafted first reply to a seller lead, grounded in the record (lead brief +
// recent area comps + the agent's own verified stats). Draft only: the agent
// reviews, edits and sends via their own channel. Inert (shows a friendly
// notice) until ANTHROPIC_API_KEY is configured server-side.
export default function DraftReply({ shortlistId }: { shortlistId: number }) {
  const [draft, setDraft] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upgrade, setUpgrade] = useState(false);

  async function generate() {
    if (busy) return;
    setBusy(true);
    setError(null);
    setUpgrade(false);
    try {
      const res = await fetch("/api/dashboard/draft-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shortlist_id: shortlistId }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j.draft) setDraft(j.draft);
      else {
        setError(j.error || "Could not draft a reply.");
        setUpgrade(Boolean(j.upgrade));
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard unavailable */ }
  }

  return (
    <div style={{ marginTop: 10 }}>
      {!draft && (
        <button type="button" onClick={generate} disabled={busy} className="fc-btn fc-btn--ghost fc-btn--sm">
          {busy ? "Drafting..." : "Draft a reply with AI"}
        </button>
      )}
      {error && !upgrade && <p className="muted small" style={{ marginTop: 6 }}>{error}</p>}
      {error && upgrade && (
        <div className="fc-alert fc-alert--info" style={{ marginTop: 8 }}>
          <span>
            {error}{" "}
            <a href="/dashboard?tab=grow" style={{ fontWeight: 700, textDecoration: "underline" }}>
              See plans
            </a>
          </span>
        </div>
      )}
      {draft && (
        <div>
          <div className="kicker" style={{ marginBottom: 6 }}>Suggested reply (grounded in the record)</div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="fc-textarea"
            rows={6}
            style={{ width: "100%", fontSize: 13.5, lineHeight: 1.55 }}
          />
          <div className="fc-row" style={{ gap: 8, marginTop: 8 }}>
            <button type="button" onClick={copy} className="fc-btn fc-btn--ink fc-btn--sm">{copied ? "Copied" : "Copy"}</button>
            <button type="button" onClick={generate} disabled={busy} className="fc-btn fc-btn--ghost fc-btn--sm">{busy ? "Drafting..." : "Redraft"}</button>
          </div>
          <p className="muted small" style={{ marginTop: 6 }}>
            Edit before sending; you send it yourself. Facts come from the lead brief and official records only.
          </p>
        </div>
      )}
    </div>
  );
}
