"use client";

import { useEffect, useState } from "react";
import { titleName, cleanAgency } from "../lib/names";

// First-run Paperwork moment on Home.
//
// An empty form is the wrong first screen for a tool whose whole pitch is "it
// already knows who you are". So the agent's own letterhead is rendered before
// they start anything: their name, their CEA registration, their agency, laid
// out the way it will print. The card disappears the moment they have a
// document, so it is a starting push and never nagging furniture.
//
// It shows a letterhead PREVIEW, clearly labelled. It never pretends to be an
// issued document, and it invents nothing: every value comes from the agent's
// own profile.

export default function PaperworkNudge({
  name,
  agencyName,
  ceaRegistration,
  onStart,
}: {
  name: string;
  agencyName: string | null;
  ceaRegistration: string | null;
  onStart: () => void;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let alive = true;
    // source=home keeps this out of the paperwork_view count: opening the tool
    // is a different act from seeing a card about it.
    fetch("/api/dashboard/documents?source=home")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d && Array.isArray(d.documents) && d.documents.length === 0) setShow(true);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  if (!show || !ceaRegistration) return null;

  const displayName = titleName(name || "");
  const agency = agencyName ? cleanAgency(agencyName) : "";

  return (
    <div className="fc-scene fc-scene--planner fc-hero-in fc-hero-in--5" style={{ padding: "clamp(12px,2vw,18px)" }}>
      <div className="fc-scene__card" style={{ padding: "clamp(16px,2.6vw,24px)" }}>
        <div style={{ display: "grid", gap: 18, gridTemplateColumns: "minmax(0,1fr)", alignItems: "center" }}>
          <div>
            <p className="kicker" style={{ margin: 0 }}>Paperwork</p>
            <h2 className="serif" style={{ fontSize: "clamp(20px,2.6vw,26px)", margin: "6px 0 0" }}>
              This letterhead is <span className="italic-serif">already yours.</span>
            </h2>
            <p className="muted" style={{ marginTop: 8, fontSize: 14.5, maxWidth: "52ch" }}>
              A letter of intent goes out over your name and CEA registration. Yours are filled in, with the
              standard clauses, deposit terms and signature blocks. Add the property and the parties and it is
              ready to send.
            </p>

            {/* Letterhead preview, drawn from the agent's own profile. */}
            <div
              className="fc-card fc-pop-in"
              style={{ marginTop: 14, padding: "16px 18px", background: "#fff", maxWidth: 460 }}
              aria-label="Preview of your letterhead"
            >
              <p className="mono" style={{ margin: 0, fontSize: 10, letterSpacing: ".08em", color: "var(--slate)" }}>
                LETTERHEAD PREVIEW
              </p>
              <p className="serif" style={{ margin: "10px 0 0", fontSize: 17, fontWeight: 600 }}>LETTER OF INTENT</p>
              <p className="muted small" style={{ margin: "2px 0 0" }}>Residential lease</p>
              <div style={{ marginTop: 12, borderTop: "1px solid var(--line)", paddingTop: 10 }}>
                <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600 }}>{displayName || "Your name"}</p>
                <p className="muted" style={{ margin: "2px 0 0", fontSize: 12.5 }}>
                  CEA Reg. No. {ceaRegistration}
                  {agency ? ` · ${agency}` : ""}
                </p>
              </div>
            </div>

            <div className="fc-row" style={{ gap: 10, marginTop: 16, flexWrap: "wrap", alignItems: "center" }}>
              <button onClick={onStart} className="fc-btn fc-btn--primary fc-btn--hairline">
                Start a letter of intent
              </button>
              <span className="muted small">About 2 minutes. The tenancy agreement then fills itself from it.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
