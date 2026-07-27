"use client";

import { useEffect, useState } from "react";

// Pitch Kit: pick an area from your own transaction history, get the
// shareable co-branded listing pitch built from your verified record.
// The kit itself is computed live at view time, so it is never stale and
// nothing is stored when you generate one.

type Area = { area_type: "town" | "district"; area_name: string; deals: number };

const DISTRICT_HINTS: Record<string, string> = {
  "1": "Raffles Place", "2": "Tanjong Pagar", "3": "Tiong Bahru", "4": "Harbourfront",
  "5": "Clementi", "6": "City Hall", "7": "Bugis", "8": "Little India", "9": "Orchard",
  "10": "Bukit Timah", "11": "Novena", "12": "Toa Payoh", "13": "Potong Pasir",
  "14": "Geylang", "15": "Katong", "16": "Bedok", "17": "Changi", "18": "Tampines",
  "19": "Hougang / Punggol", "20": "Bishan", "21": "Upper Bukit Timah", "22": "Jurong",
  "23": "Bukit Panjang", "24": "Tengah", "25": "Woodgrove", "26": "Upper Thomson",
  "27": "Yishun", "28": "Seletar",
};

function areaTitle(a: Area): string {
  if (a.area_type === "district") {
    const n = a.area_name.replace(/^0/, "");
    return `D${n}${DISTRICT_HINTS[n] ? ` · ${DISTRICT_HINTS[n]}` : ""}`;
  }
  return a.area_name.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function kitPath(slug: string, a: Area): string {
  const key = a.area_type === "district" ? a.area_name.replace(/^0/, "") : a.area_name.toLowerCase();
  return `/pitch/${slug}/${a.area_type}/${encodeURIComponent(key)}`;
}

export default function PitchKitPanel() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [slug, setSlug] = useState<string | null>(null);
  const [picked, setPicked] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/dashboard/pitch");
        if (!res.ok) return;
        const j = await res.json();
        if (!active) return;
        setAreas(Array.isArray(j.areas) ? j.areas : []);
        setSlug(typeof j.slug === "string" ? j.slug : null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  function track(event: string, meta: Record<string, unknown>) {
    fetch("/api/funnel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, source: "pitch_kit_panel", metadata: meta }),
    }).catch(() => {});
  }

  async function copyLink() {
    const a = areas[picked];
    if (!slug || !a) return;
    try {
      await navigator.clipboard.writeText(`https://fair-comparisons.com${kitPath(slug, a)}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      track("pitch_kit_copied", { area: a.area_name, area_type: a.area_type });
    } catch { /* clipboard unavailable */ }
  }

  if (loading) {
    return (
      <div className="fc-card fc-card--pad">
        <p className="muted small" style={{ margin: 0 }}>Loading your Pitch Kit...</p>
      </div>
    );
  }

  return (
    <div className="fc-card fc-card--pad" id="pitch-kit">
      <div className="fc-row" style={{ justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
        <div>
          <p className="kicker" style={{ margin: 0, color: "var(--blue-deep)" }}>Pitch Kit</p>
          <h3 style={{ fontSize: 17, margin: "4px 0 0" }}>Walk into the listing appointment with your record</h3>
        </div>
      </div>
      <p className="muted small" style={{ marginTop: 8 }}>
        A shareable one-page pitch built live from your verified CEA record: your deals in the
        area, your standing, and the market context. Send it before the appointment or open it
        on your phone at the table.
      </p>

      {areas.length === 0 ? (
        <div className="fc-card fc-card--fill" style={{ marginTop: 12, padding: "14px 16px" }}>
          <p className="small" style={{ margin: 0, fontWeight: 600 }}>No recorded transactions yet</p>
          <p className="muted small" style={{ margin: "4px 0 0" }}>
            Your Pitch Kit builds itself from your CEA transaction record. As soon as deals
            appear on your record, your most active areas show up here.
          </p>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            {areas.map((a, i) => (
              <button
                key={`${a.area_type}-${a.area_name}`}
                type="button"
                onClick={() => setPicked(i)}
                className="small"
                style={{
                  border: picked === i ? "1px solid var(--blue)" : "1px solid var(--line)",
                  background: picked === i ? "var(--blue-wash)" : "#fff",
                  color: picked === i ? "var(--blue-deep)" : "var(--slate)",
                  borderRadius: 999, padding: "7px 14px", cursor: "pointer", fontWeight: 600,
                }}
              >
                {areaTitle(a)} · {a.deals} deal{a.deals === 1 ? "" : "s"}
              </button>
            ))}
          </div>
          <div className="fc-row" style={{ gap: 10, marginTop: 14, flexWrap: "wrap" }}>
            <a
              href={slug ? kitPath(slug, areas[picked]) : "#"}
              target="_blank"
              rel="noopener"
              className="fc-btn fc-btn--primary fc-btn--sm fc-btn--hairline"
              onClick={() => track("pitch_kit_opened", { area: areas[picked]?.area_name, area_type: areas[picked]?.area_type })}
            >
              Open your pitch
            </a>
            <button type="button" onClick={copyLink} className="fc-btn fc-btn--ink fc-btn--sm">
              {copied ? "Copied" : "Copy share link"}
            </button>
          </div>
          <p className="muted small" style={{ marginTop: 10 }}>
            Always live: the kit recomputes from the record every time it is opened. It shows
            your context flags too; honest data is what makes it credible.
          </p>
        </>
      )}
    </div>
  );
}
