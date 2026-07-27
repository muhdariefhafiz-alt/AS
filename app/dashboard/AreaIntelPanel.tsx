"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Area Intelligence: instant CMA + farm intelligence in one panel.
// Pick an area from your own transaction history; get pricing evidence
// (AVM range for HDB towns, URA medians for districts) and the honest
// competition picture (agents, deals, concentration, your position).
// No opaque "saturation" labels: every verdict sentence shows its numbers.

type Area = { area_type: "town" | "district"; area_name: string; deals: number };
type Farm = {
  window_months: number; deals_12mo: number; sales_12mo: number;
  active_agents_12mo: number; deals_per_agent: number | null; top5_share_pct: number | null;
  hdb_deals_12mo: number; condo_deals_12mo: number; landed_deals_12mo: number;
  me: { deals_12mo: number; sales_12mo: number; rank_by_deals: number; of_agents: number } | null;
};
type Pricing = {
  window_months: number; n: number; median_price: number | null;
  p25_price: number | null; p75_price: number | null; median_psf: number | null;
  recent: { project: string; when: string; price: number; psf: number | null }[];
};
type Hdb = {
  low: number; mid: number; high: number; comp_count: number;
  confidence: string; window_months: number;
  recent: { label: string; price: number; detail?: string }[];
};

const FLAT_TYPES = ["3 ROOM", "4 ROOM", "5 ROOM", "EXECUTIVE", "2 ROOM"] as const;

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

function money(n: number | null | undefined): string {
  if (n == null) return "";
  return n >= 1_000_000 ? `S$${(n / 1_000_000).toFixed(2)}M` : `S$${Math.round(n / 1000)}K`;
}

export default function AreaIntelPanel() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [slug, setSlug] = useState<string | null>(null);
  const [picked, setPicked] = useState<number>(0);
  const [flatType, setFlatType] = useState<string>("4 ROOM");
  const [farm, setFarm] = useState<Farm | null>(null);
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [hdb, setHdb] = useState<Hdb | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [intelBusy, setIntelBusy] = useState(false);
  // Monotonic request id: a slower earlier response must never overwrite a
  // newer area's numbers (review-verified race on a numbers-first surface).
  const reqSeq = useRef(0);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/dashboard/pitch");
        if (!res.ok) { if (active) setLoadError(true); return; }
        const j = await res.json();
        if (!active) return;
        setAreas(Array.isArray(j.areas) ? j.areas : []);
        setSlug(typeof j.slug === "string" ? j.slug : null);
      } catch {
        if (active) setLoadError(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const area = areas[picked] ?? null;

  const loadIntel = useCallback(async (a: Area, ft: string) => {
    const seq = ++reqSeq.current;
    setIntelBusy(true);
    try {
      const params = new URLSearchParams({ area_type: a.area_type, area: a.area_name });
      if (a.area_type === "town") params.set("flat_type", ft);
      const res = await fetch(`/api/dashboard/area-intel?${params.toString()}`);
      if (seq !== reqSeq.current) return;
      if (!res.ok) { setFarm(null); setPricing(null); setHdb(null); return; }
      const j = await res.json();
      if (seq !== reqSeq.current) return;
      setFarm(j.intel?.farm ?? null);
      setPricing(j.intel?.pricing ?? null);
      setHdb(j.hdb ?? null);
    } finally {
      if (seq === reqSeq.current) setIntelBusy(false);
    }
  }, []);

  useEffect(() => {
    if (area) loadIntel(area, flatType);
  }, [area, flatType, loadIntel]);

  if (loading) {
    return (
      <div className="fc-card fc-card--pad">
        <p className="muted small" style={{ margin: 0 }}>Loading area intelligence...</p>
      </div>
    );
  }

  const cell = (label: string, value: string | number, sub?: string) => (
    <div className="fc-card fc-card--fill" style={{ padding: "12px 14px" }}>
      <div className="mono" style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--slate)" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: "var(--ink)", fontVariantNumeric: "tabular-nums", marginTop: 2 }}>{value}</div>
      {sub && <div className="muted" style={{ fontSize: 11.5, marginTop: 1 }}>{sub}</div>}
    </div>
  );

  return (
    <div className="fc-card fc-card--pad" id="area-intel">
      <div className="fc-row" style={{ justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
        <div>
          <p className="kicker" style={{ margin: 0, color: "var(--blue-deep)" }}>Area Intelligence</p>
          <h3 style={{ fontSize: 17, margin: "4px 0 0" }}>Price it and size up the competition, before you commit</h3>
        </div>
      </div>
      <p className="muted small" style={{ marginTop: 8 }}>
        Instant pricing evidence and the honest competition picture for the areas you work,
        from the same official records sellers can verify.
      </p>

      {loadError ? (
        <div className="fc-card fc-card--fill" style={{ marginTop: 12, padding: "14px 16px" }}>
          <p className="small" style={{ margin: 0, fontWeight: 600 }}>Could not load your areas</p>
          <p className="muted small" style={{ margin: "4px 0 0" }}>
            Something went wrong on our side. Refresh to try again; your record is unaffected.
          </p>
        </div>
      ) : areas.length === 0 ? (
        <div className="fc-card fc-card--fill" style={{ marginTop: 12, padding: "14px 16px" }}>
          <p className="small" style={{ margin: 0, fontWeight: 600 }}>No recorded transactions yet</p>
          <p className="muted small" style={{ margin: "4px 0 0" }}>
            Area intelligence starts from your own CEA record. As soon as deals appear, your
            active areas show up here.
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
                {areaTitle(a)}
              </button>
            ))}
            {area?.area_type === "town" && (
              <select
                className="fc-select fc-select--sm"
                value={flatType}
                onChange={(e) => setFlatType(e.target.value)}
                style={{ borderRadius: 999, padding: "6px 12px", fontSize: 13 }}
                aria-label="Flat type for the price estimate"
              >
                {FLAT_TYPES.map((t) => <option key={t} value={t}>{t.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}</option>)}
              </select>
            )}
          </div>

          {intelBusy && <p className="muted small" style={{ marginTop: 12 }}>Computing from the record&hellip;</p>}

          {!intelBusy && area?.area_type === "town" && !hdb && (
            <p className="muted small" style={{ marginTop: 12 }}>
              Not enough recent {flatType.toLowerCase()} resales in {areaTitle(area)} for a fair
              estimate. We never extrapolate; try another flat type.
            </p>
          )}

          {!intelBusy && (hdb || pricing) && (
            <div style={{ marginTop: 14 }}>
              <p className="mono" style={{ fontSize: 10.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--blue-deep)", margin: "0 0 8px" }}>
                Pricing evidence {area?.area_type === "town" ? `· ${flatType.toLowerCase()} · last ${hdb?.window_months ?? 6} months` : `· all private · last ${pricing?.window_months ?? 6} months`}
              </p>
              {hdb ? (
                <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))" }}>
                  {cell("Estimate range", `${money(hdb.low)} to ${money(hdb.high)}`, `most likely ${money(hdb.mid)}`)}
                  {cell("Evidence", `${hdb.comp_count} sales`, `${hdb.confidence} confidence`)}
                  {hdb.recent[0] && cell("Latest comparable", money(hdb.recent[0].price), hdb.recent[0].label)}
                </div>
              ) : pricing && pricing.n > 0 ? (
                <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))" }}>
                  {cell("Median sale", money(pricing.median_price), `${pricing.n} sales in window`)}
                  {cell("Middle half", `${money(pricing.p25_price)} to ${money(pricing.p75_price)}`, "25th to 75th percentile")}
                  {pricing.median_psf != null && cell("Median PSF", `S$${pricing.median_psf.toLocaleString()}`, "per square foot")}
                </div>
              ) : (
                <p className="muted small" style={{ margin: 0 }}>
                  Not enough recent transactions in this window for a fair estimate. We never
                  extrapolate; try a wider area.
                </p>
              )}
              {!hdb && pricing && pricing.recent.length > 0 && (
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                  {pricing.recent.slice(0, 3).map((r, i) => (
                    <div key={i} className="small" style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "6px 2px", borderTop: i > 0 ? "1px solid var(--line)" : "none" }}>
                      <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600, color: "var(--ink)" }}>{r.project}</span>
                      <span className="muted" style={{ whiteSpace: "nowrap" }}>{r.when} · {money(r.price)}{r.psf ? ` · S$${r.psf.toLocaleString()} psf` : ""}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!intelBusy && farm && (
            <div style={{ marginTop: 16 }}>
              <p className="mono" style={{ fontSize: 10.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--blue-deep)", margin: "0 0 8px" }}>
                The competition · last {farm.window_months} months
              </p>
              <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))" }}>
                {cell("Active agents", farm.active_agents_12mo.toLocaleString(), "with a deal here")}
                {cell("Deals closed", farm.deals_12mo.toLocaleString(), `${farm.sales_12mo.toLocaleString()} sales, rest rentals`)}
                {farm.deals_per_agent != null && cell("Deals per agent", farm.deals_per_agent, "average across actives")}
                {farm.top5_share_pct != null && cell("Top 5 agents' share", `${farm.top5_share_pct}%`, "of all deals here")}
              </div>
              <div className="fc-card fc-card--fill" style={{ marginTop: 8, padding: "11px 14px" }}>
                {farm.me ? (
                  <p className="small" style={{ margin: 0 }}>
                    <strong>Your position:</strong> {farm.me.deals_12mo} deal{farm.me.deals_12mo === 1 ? "" : "s"} here in
                    this window ({farm.me.sales_12mo} sale{farm.me.sales_12mo === 1 ? "" : "s"}), ranked
                    #{farm.me.rank_by_deals} of {farm.me.of_agents.toLocaleString()} active agents by volume.
                  </p>
                ) : (
                  <p className="small" style={{ margin: 0 }}>
                    <strong>Your position:</strong> no recorded deals here in the last {farm.window_months} months.
                    Every deal you close moves you onto this board.
                  </p>
                )}
              </div>
              {area && slug && (
                <a
                  href={`/pitch/${slug}/${area.area_type}/${encodeURIComponent(area.area_type === "district" ? area.area_name.replace(/^0/, "") : area.area_name.toLowerCase())}`}
                  target="_blank"
                  rel="noopener"
                  className="fc-btn fc-btn--primary fc-btn--sm fc-btn--hairline"
                  style={{ marginTop: 12 }}
                >
                  Open your pitch for {areaTitle(area)}
                </a>
              )}
            </div>
          )}

          <p className="muted small" style={{ marginTop: 12 }}>
            Windows and sample sizes are shown with every number. Deals count sales and rentals
            separately because they are different work.
          </p>
        </>
      )}
    </div>
  );
}
