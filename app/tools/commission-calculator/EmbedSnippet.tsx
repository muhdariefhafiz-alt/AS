"use client";

import { useState } from "react";

const CODE = `<iframe src="https://fair-comparisons.com/embed/commission-calculator" width="100%" height="660" style="border:1px solid #d7deee;border-radius:14px;max-width:680px" title="Singapore property agent commission calculator" loading="lazy"></iframe>`;

export default function EmbedSnippet() {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(CODE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="fc-card fc-card--pad" style={{ background: "#fff" }}>
      <div className="fc-row" style={{ justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <div>
          <div className="kicker">Embed this calculator</div>
          <p className="muted small" style={{ marginTop: 6 }}>
            Free to use on your own site or blog. Paste this snippet wherever you want it to appear.
          </p>
        </div>
        <button type="button" onClick={copy} className="fc-btn fc-btn--primary fc-btn--sm" style={{ flexShrink: 0 }}>
          {copied ? "Copied" : "Copy code"}
        </button>
      </div>
      <pre className="mono" style={{
        marginTop: 14, background: "var(--ink)", color: "#dfe6ff", borderRadius: "var(--r-md)",
        padding: "14px 16px", fontSize: 12, lineHeight: 1.6, overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-all",
      }}>{CODE}</pre>
    </div>
  );
}
