"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { checkAdvert, CEA_PUBLIC_REGISTER_URL, type AdMedium } from "../../lib/cea-advert";

const SAMPLE =
  "Rarely available high-floor 4-room HDB in Tampines, renovated, near MRT. Viewing by appointment.\n\nJane Tan, R012345A\nPropNex Realty Pte Ltd, L3008022J\n9123 4567";

export default function CeaAdvertChecker() {
  const [medium, setMedium] = useState<AdMedium>("online");
  const [text, setText] = useState("");

  const report = useMemo(() => checkAdvert(text, medium), [text, medium]);
  const empty = text.trim().length === 0;
  const clean = report.allMet && report.risky.length === 0;

  return (
    <div className="lp-panel" style={{ maxWidth: 680, margin: "-32px auto 0", padding: "26px 28px" }}>
      <div className="seg" style={{ marginBottom: 14 }}>
        <button type="button" className={"seg__btn" + (medium === "online" ? " seg__btn--active" : "")} onClick={() => setMedium("online")}>
          Online / portal / social
        </button>
        <button type="button" className={"seg__btn" + (medium === "classified" ? " seg__btn--active" : "")} onClick={() => setMedium("classified")}>
          Newspaper / SMS
        </button>
      </div>

      <div className="fld">
        <label className="fc-label">Paste your advertisement text</label>
        <textarea
          className="fc-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={7}
          placeholder="Paste the exact copy you plan to publish..."
          style={{ resize: "vertical", minHeight: 130, fontFamily: "inherit", lineHeight: 1.5 }}
        />
        <button type="button" className="fc-btn fc-btn--ghost fc-btn--sm" style={{ marginTop: 8 }}
          onClick={() => setText(SAMPLE)}>
          Try a sample
        </button>
      </div>

      <div className="fc-card fc-card--fill" style={{ marginTop: 18, padding: "20px 22px" }}>
        {empty ? (
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>
            Your compliance check appears here as you type. Everything stays in your browser, nothing is sent or stored.
          </p>
        ) : (
          <>
            <div className="fc-row" style={{ gap: 10, alignItems: "center" }}>
              <span
                className="fc-badge"
                style={{
                  background: clean ? "#e7f6ef" : "#fdeceb",
                  color: clean ? "#0a6b4b" : "#b42318",
                  fontWeight: 600,
                }}
              >
                {clean ? "Looks compliant" : `${report.totalCount - report.metCount} required item${report.totalCount - report.metCount === 1 ? "" : "s"} to fix`}
              </span>
              {report.risky.length > 0 && (
                <span className="fc-badge" style={{ background: "#fff4e5", color: "#93500b", fontWeight: 600 }}>
                  {report.risky.length} claim{report.risky.length === 1 ? "" : "s"} to review
                </span>
              )}
            </div>

            <ul style={{ listStyle: "none", padding: 0, margin: "16px 0 0", display: "flex", flexDirection: "column", gap: 10 }}>
              {report.required.map((c) => (
                <li key={c.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span aria-hidden style={{ color: c.met ? "#0a6b4b" : "#b42318", fontWeight: 700, lineHeight: 1.4 }}>
                    {c.met ? "✓" : "✗"}
                  </span>
                  <span>
                    <span style={{ fontWeight: 600, fontSize: 14.5, color: "var(--ink)" }}>{c.label}</span>
                    {!c.met && <span className="muted small" style={{ display: "block", marginTop: 2 }}>{c.hint}</span>}
                  </span>
                </li>
              ))}
            </ul>

            {report.risky.length > 0 && (
              <div className="fc-alert fc-alert--warn" style={{ marginTop: 16 }}>
                <strong>Substantiate or remove:</strong> {report.risky.join(", ")}. CEA rules prohibit false or
                misleading statements. Only keep a claim if you can prove it.
              </div>
            )}
          </>
        )}
      </div>

      <div className="fc-alert fc-alert--info" style={{ marginTop: 14, fontSize: 13.5 }}>
        Also confirm you have the owner&#39;s prior consent to advertise, and that your name, registration number and
        phone resolve to your profile on the{" "}
        <a href={CEA_PUBLIC_REGISTER_URL} target="_blank" rel="noopener" style={{ color: "var(--blue)" }}>CEA Public Register</a>.
      </div>

      <p className="muted small" style={{ marginTop: 14 }}>
        This is a checklist against CEA&#39;s published advertising requirements, not legal advice. You remain
        responsible for your advertisement. Want your record working as hard as your ads?{" "}
        <Link href="/for-agents" style={{ color: "var(--blue)", fontWeight: 600 }}>See how agents use FairComparisons</Link>.
      </p>
    </div>
  );
}
