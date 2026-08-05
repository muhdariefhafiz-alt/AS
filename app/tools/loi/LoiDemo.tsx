"use client";

import { useState } from "react";
import Link from "next/link";

// Public letter-of-intent demo.
//
// The salesperson finds themselves in the CEA register, sees the letterhead
// they would be sending on, and opens a clearly-stamped sample PDF. The live
// tool (their own parties, their own terms, stored and reusable) is one claim
// away. Nothing here is invented: the name, registration number and agency are
// the same public register details already on their profile page.

type Hit = { slug: string; name: string; cea: string | null; agency: string; claimed: boolean };

export default function LoiDemo() {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [picked, setPicked] = useState<Hit | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function search(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    if (term.length < 2) return;
    setBusy(true); setError(""); setPicked(null);
    try {
      const res = await fetch(`/api/tools/loi-demo?q=${encodeURIComponent(term)}`);
      const d = await res.json();
      if (!res.ok) { setError(d.error || "Search failed."); setHits([]); }
      else setHits(d.agents ?? []);
    } catch { setError("Connection error."); }
    setBusy(false);
  }

  return (
    <div className="fc-card fc-card--pad" style={{ background: "#fff" }}>
      <form onSubmit={search} className="fc-row" style={{ gap: 8, flexWrap: "wrap", alignItems: "stretch" }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Your name or CEA registration number"
          className="fc-input"
          aria-label="Your name or CEA registration number"
          style={{ flex: 1, minWidth: 220, fontSize: 15 }}
        />
        <button type="submit" disabled={busy || q.trim().length < 2} className="fc-btn fc-btn--primary fc-btn--hairline">
          {busy ? "Looking…" : "Find me"}
        </button>
      </form>
      {error && <p className="small" style={{ marginTop: 10, color: "var(--danger)" }}>{error}</p>}

      {hits && hits.length === 0 && !error && (
        <p className="muted small" style={{ marginTop: 12 }}>
          No salesperson found for that. Try your full name as it appears on the CEA register, or your registration
          number (for example R012345A).
        </p>
      )}

      {hits && hits.length > 0 && !picked && (
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
          {hits.map((h, i) => (
            <button
              key={h.slug}
              onClick={() => setPicked(h)}
              className="fc-card fc-reveal"
              style={{ ["--reveal-delay" as string]: `${Math.min(i * 0.04, 0.3)}s`, padding: "12px 14px", textAlign: "left", cursor: "pointer", background: "#fff" }}
            >
              <div style={{ fontWeight: 600, fontSize: 14.5 }}>{h.name}</div>
              <div className="muted small" style={{ marginTop: 2 }}>
                {h.cea}{h.agency ? ` · ${h.agency}` : ""}
              </div>
            </button>
          ))}
        </div>
      )}

      {picked && (
        <div style={{ marginTop: 16 }}>
          <button onClick={() => setPicked(null)} className="small" style={{ border: "none", background: "none", cursor: "pointer", color: "var(--blue)", fontWeight: 600, padding: 0 }}>
            &larr; Someone else
          </button>

          <div className="fc-card fc-pop-in" style={{ marginTop: 12, padding: "18px 20px", background: "#fff", maxWidth: 480 }}>
            <p className="mono" style={{ margin: 0, fontSize: 10, letterSpacing: ".08em", color: "var(--slate)" }}>LETTERHEAD PREVIEW</p>
            <p className="serif" style={{ margin: "10px 0 0", fontSize: 18, fontWeight: 600 }}>LETTER OF INTENT</p>
            <p className="muted small" style={{ margin: "2px 0 0" }}>Residential lease</p>
            <div style={{ marginTop: 12, borderTop: "1px solid var(--line)", paddingTop: 10 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{picked.name}</p>
              <p className="muted" style={{ margin: "2px 0 0", fontSize: 12.5 }}>
                CEA Reg. No. {picked.cea}{picked.agency ? ` · ${picked.agency}` : ""}
              </p>
            </div>
          </div>

          <div className="fc-row" style={{ gap: 10, marginTop: 16, flexWrap: "wrap", alignItems: "center" }}>
            <a
              href={`/api/tools/loi-demo?slug=${encodeURIComponent(picked.slug)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="fc-btn fc-btn--ink fc-btn--hairline"
              style={{ textDecoration: "none" }}
            >
              Open the sample PDF
            </a>
            <Link href={`/property-agents/agent/${picked.slug}`} className="fc-btn fc-btn--quiet" style={{ textDecoration: "none" }}>
              {picked.claimed ? "See the profile" : "Claim this profile"}
            </Link>
          </div>

          <p className="muted small" style={{ marginTop: 12, maxWidth: "58ch" }}>
            The sample is stamped and uses placeholder parties and figures. To draw one up for a live deal, with your
            own parties, terms and stored copies, claim your profile: the tool then fills the tenancy agreement from
            the letter of intent without you retyping anything.
          </p>
        </div>
      )}
    </div>
  );
}
