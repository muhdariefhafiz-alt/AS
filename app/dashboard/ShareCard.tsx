"use client";

import { useState } from "react";

// One consolidated "Share your record" card. Replaces the two separate
// BadgeCard + LeadWidgetCard blocks AND the stray "Unlock with Verified"
// teaser (owner feedback: "2 badges/widgets + a 3rd unlockable is too much").
// A 3-tab segmented control shows ONE preview at a time:
//   Rank card  — the weekly-fresh, shareable AgentScore (the manufactured
//                share loop: the number changes, so it is worth re-sharing)
//   Website badge — the email/site embed
//   Lead widget   — the co-branded valuation card for the agent's own site

type Mode = "rank" | "badge" | "widget";
const TABS: { id: Mode; label: string }[] = [
  { id: "rank", label: "Rank card" },
  { id: "badge", label: "Website badge" },
  { id: "widget", label: "Lead widget" },
];

export default function ShareCard({ slug, score }: { slug: string; score: number | null }) {
  const [mode, setMode] = useState<Mode>("rank");
  const [copied, setCopied] = useState<string | null>(null);
  const base = "https://fair-comparisons.com";
  const profileUrl = `${base}/property-agents/agent/${slug}?ref=badge`;

  const badgeEmbed = `<a href="${profileUrl}"><img src="${base}/badge/${slug}.svg" alt="My AgentScore on FairComparisons" width="320" height="96"></a>`;
  const widgetEmbed = `<iframe src="${base}/embed/agent/${slug}" width="100%" height="230" style="border:0;max-width:404px" title="Get a free valuation" loading="lazy"></iframe>`;

  const waText = encodeURIComponent(
    `My AgentScore is ${score ?? ""}${score ? "/100" : ""} on FairComparisons, ranked on real CEA transaction records. See my full track record: ${profileUrl}`.replace("  ", " "),
  );

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="fc-card" style={{ padding: 22 }}>
      <div className="fc-row" style={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div className="kicker">Share your record</div>
        {/* Segmented toggle */}
        <div style={{ display: "inline-flex", background: "var(--cloud)", borderRadius: 999, padding: 3 }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => { setMode(t.id); setCopied(null); }}
              className="small"
              style={{
                border: "none", cursor: "pointer", padding: "5px 12px", borderRadius: 999, fontWeight: 600, whiteSpace: "nowrap",
                background: mode === t.id ? "#fff" : "transparent",
                color: mode === t.id ? "var(--ink)" : "var(--slate)",
                boxShadow: mode === t.id ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* RANK CARD — the shareable, weekly-fresh standing */}
      {mode === "rank" && (
        <div style={{ marginTop: 14 }}>
          <p className="muted small" style={{ marginBottom: 12 }}>
            Your AgentScore is proof no competitor can fake: it&apos;s computed from real CEA records and can&apos;t be bought. Drop it into a listing pitch or your WhatsApp and let it close for you.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/badge/${slug}.svg`}
            alt="Your AgentScore card"
            width={320}
            height={96}
            style={{ maxWidth: "100%", border: "1px solid var(--line)", borderRadius: "var(--r-md)" }}
          />
          <div className="fc-row" style={{ gap: 10, marginTop: 12, flexWrap: "wrap" }}>
            <a
              href={`https://wa.me/?text=${waText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="fc-btn fc-btn--primary fc-btn--sm"
              style={{ textDecoration: "none" }}
            >
              Share to WhatsApp
            </a>
            <button onClick={() => copy(profileUrl, "link")} className="fc-btn fc-btn--ghost fc-btn--sm">
              {copied === "link" ? "Copied" : "Copy profile link"}
            </button>
          </div>
        </div>
      )}

      {/* WEBSITE BADGE */}
      {mode === "badge" && (
        <div style={{ marginTop: 14 }}>
          <p className="muted small" style={{ marginBottom: 12 }}>
            For your email signature or website. Links back to your full record.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/badge/${slug}.svg`} alt="Your AgentScore badge" width={320} height={96} style={{ maxWidth: "100%", border: "1px solid var(--line)", borderRadius: "var(--r-md)" }} />
          <textarea readOnly value={badgeEmbed} onFocus={(e) => e.currentTarget.select()} className="fc-textarea" style={{ marginTop: 12, fontFamily: "var(--font-mono)", fontSize: 12, height: 76 }} />
          <button onClick={() => copy(badgeEmbed, "badge")} className="fc-btn fc-btn--ink fc-btn--sm" style={{ marginTop: 10 }}>
            {copied === "badge" ? "Copied" : "Copy embed code"}
          </button>
        </div>
      )}

      {/* LEAD WIDGET */}
      {mode === "widget" && (
        <div style={{ marginTop: 14 }}>
          <p className="muted small" style={{ marginBottom: 12 }}>
            A co-branded &ldquo;Get a free valuation&rdquo; card for your own site. Visitors who use it come to you as a seller enquiry, with you already pinned as their agent.
          </p>
          <div style={{ border: "1px solid var(--line)", borderRadius: "var(--r-md)", overflow: "hidden", maxWidth: 404 }}>
            <iframe src={`/embed/agent/${slug}`} width="100%" height={230} style={{ border: 0, display: "block" }} title="Lead widget preview" loading="lazy" />
          </div>
          <textarea readOnly value={widgetEmbed} onFocus={(e) => e.currentTarget.select()} className="fc-textarea" style={{ marginTop: 12, fontFamily: "var(--font-mono)", fontSize: 12, height: 76 }} />
          <button onClick={() => copy(widgetEmbed, "widget")} className="fc-btn fc-btn--ink fc-btn--sm" style={{ marginTop: 10 }}>
            {copied === "widget" ? "Copied" : "Copy embed code"}
          </button>
        </div>
      )}
    </div>
  );
}
