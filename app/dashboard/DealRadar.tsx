"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";

// Deal Radar: the agent's daily farm-area prospecting feed. Every row is a
// real transaction from deal_radar() (no synthesized data). Two signals:
// owners reaching their 5-year MOP window (fresh sellers), and recent nearby
// sales (comps + market pulse). Agents pick up to 5 areas.

type RadarItem = {
  source: "fresh_private" | "fresh_hdb" | "mop_hdb";
  title: string;
  subtitle: string;
  price: number | null;
  event_date: string;
  area_key: string;
  note: string;
};
type Area = { area_type: "district" | "town"; area_key: string };
// A suggestion is an area the agent has ALREADY worked, straight from their CEA
// record, so the chip can show their own numbers rather than a guess.
type Suggestion = Area & { deals: number; last_deal: string };

// SG postal districts (code -> short area name), for the add-area picker.
const DISTRICTS: [string, string][] = [
  ["1", "Raffles Place, Marina"], ["2", "Tanjong Pagar, Anson"], ["3", "Tiong Bahru, Queenstown"],
  ["4", "Sentosa, Harbourfront"], ["5", "Clementi, West Coast"], ["6", "City Hall, Clarke Quay"],
  ["7", "Bugis, Beach Road"], ["8", "Little India, Farrer Park"], ["9", "Orchard, River Valley"],
  ["10", "Bukit Timah, Holland"], ["11", "Novena, Newton"], ["12", "Balestier, Toa Payoh"],
  ["13", "Macpherson, Potong Pasir"], ["14", "Geylang, Eunos"], ["15", "Katong, Marine Parade"],
  ["16", "Bedok, Upper East Coast"], ["17", "Changi, Loyang"], ["18", "Tampines, Pasir Ris"],
  ["19", "Serangoon, Hougang, Punggol"], ["20", "Ang Mo Kio, Bishan"], ["21", "Clementi Park, Upper Bukit Timah"],
  ["22", "Jurong, Boon Lay"], ["23", "Bukit Panjang, Choa Chu Kang"], ["24", "Lim Chu Kang, Tengah"],
  ["25", "Kranji, Woodgrove"], ["26", "Upper Thomson, Springleaf"], ["27", "Yishun, Sembawang"],
  ["28", "Seletar, Yio Chu Kang"],
];
const TOWNS = [
  "ANG MO KIO", "BEDOK", "BISHAN", "BUKIT BATOK", "BUKIT MERAH", "BUKIT PANJANG", "BUKIT TIMAH",
  "CENTRAL AREA", "CHOA CHU KANG", "CLEMENTI", "GEYLANG", "HOUGANG", "JURONG EAST", "JURONG WEST",
  "KALLANG/WHAMPOA", "MARINE PARADE", "PASIR RIS", "PUNGGOL", "QUEENSTOWN", "SEMBAWANG", "SENGKANG",
  "SERANGOON", "TAMPINES", "TENGAH", "TOA PAYOH", "WOODLANDS", "YISHUN",
];

const money = (n: number | null) =>
  n == null ? "" : n >= 1_000_000 ? `S$${(n / 1_000_000).toFixed(2)}M` : `S$${Math.round(n / 1000)}K`;
const MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmtMonth = (iso: string) => {
  const m = iso.match(/^(\d{4})-(\d{2})/);
  return m ? `${MONTHS[Number(m[2])]} ${m[1]}` : "";
};
const sKey = (a: Area) => `${a.area_type}:${a.area_key}`;
// Districts are STORED zero-padded ('09'), matching every transaction table,
// but this picker's list is authored unpadded ('9'). Compare on the number so a
// saved district still finds its name instead of rendering a bare "D09 ".
const districtName = (key: string) =>
  (DISTRICTS.find((d) => Number(d[0]) === Number(key))?.[1] ?? "").split(",")[0];
const areaLabel = (a: Area) =>
  a.area_type === "district"
    ? `D${String(a.area_key).replace(/^0+(?=\d)/, "")} ${districtName(a.area_key)}`.trim()
    : a.area_key.split("/")[0].toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

export default function DealRadar() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [items, setItems] = useState<RadarItem[]>([]);
  const [agentSlug, setAgentSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [addType, setAddType] = useState<"district" | "town">("town");
  const [addKey, setAddKey] = useState("");
  const [suggested, setSuggested] = useState<Suggestion[]>([]);
  // Pre-checked: the whole point is that accepting is one tap and editing is
  // the exception. Seeded from the first render of suggestions.
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const seededRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/deal-radar");
      if (!res.ok) return;
      const j = await res.json();
      setAreas(j.areas ?? []);
      setItems(j.items ?? []);
      setAgentSlug(j.agentSlug ?? null);
      const sug: Suggestion[] = j.suggested ?? [];
      setSuggested(sug);
      // Top 3 pre-checked, not all 6: the cap is 5 and three areas is a
      // realistic farm. Seeded once so a reload after saving does not re-tick
      // boxes the agent deliberately cleared.
      if (!seededRef.current && sug.length) {
        seededRef.current = true;
        setPicked(new Set(sug.slice(0, 3).map(sKey)));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function confirmSuggested() {
    if (busy || !picked.size) return;
    setBusy(true);
    try {
      const areasToAdd = suggested.filter((s) => picked.has(sKey(s)))
        .map((s) => ({ area_type: s.area_type, area_key: s.area_key }));
      const res = await fetch("/api/dashboard/deal-radar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm", areas: areasToAdd }),
      });
      if (res.ok) {
        const j = await res.json();
        setAreas(j.areas ?? []);
        setItems(j.items ?? []);
        setSuggested(j.suggested ?? []);
        setPicked(new Set());
      }
    } finally {
      setBusy(false);
    }
  }

  async function mutate(action: "add" | "remove", area_type: string, area_key: string) {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/dashboard/deal-radar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, area_type, area_key }),
      });
      if (res.ok) {
        const j = await res.json();
        setAreas(j.areas ?? []);
        setItems(j.items ?? []);
      }
    } finally {
      setBusy(false);
    }
  }

  const mop = items.filter((i) => i.source === "mop_hdb");
  const fresh = items.filter((i) => i.source !== "mop_hdb");

  if (loading) {
    return (
      <div className="fc-card fc-card--pad">
        <p className="muted small" style={{ margin: 0 }}>Loading your Deal Radar...</p>
      </div>
    );
  }

  return (
    <div className="fc-card fc-card--pad">
      <div className="fc-row" style={{ justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
        <div>
          <p className="kicker" style={{ color: "var(--blue-deep)", margin: 0 }}>Deal Radar</p>
          <h2 style={{ fontSize: 18, margin: "4px 0 0" }}>Your next listing is already in the data</h2>
        </div>
        <span className="muted small">See which owners are about to sell, and price from every fresh nearby deal, before your competitors do.</span>
      </div>

      {/* Farm areas */}
      <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        {areas.map((a) => (
          <span key={`${a.area_type}-${a.area_key}`} className="fc-badge fc-badge--source" style={{ paddingRight: 6 }}>
            {areaLabel(a)}
            <button
              type="button"
              onClick={() => mutate("remove", a.area_type, a.area_key)}
              disabled={busy}
              aria-label={`Remove ${areaLabel(a)}`}
              style={{ marginLeft: 6, border: 0, background: "transparent", cursor: "pointer", color: "var(--slate)", fontSize: 14, lineHeight: 1 }}
            >
              ×
            </button>
          </span>
        ))}
        {/* The manual picker steps aside while suggestions are on screen: a
            dropdown above a one-tap confirm makes composition look like the
            main path, which is the behaviour this slice exists to reverse. It
            returns as a quiet "add another" once the agent has areas. */}
        {areas.length < 5 && !(areas.length === 0 && suggested.length > 0) && (
          <span style={{ display: "inline-flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <select
              className="fc-select"
              value={addType}
              onChange={(e) => { setAddType(e.target.value as "district" | "town"); setAddKey(""); }}
              style={{ padding: "6px 10px", fontSize: 13 }}
            >
              <option value="town">HDB town</option>
              <option value="district">District</option>
            </select>
            <select
              className="fc-select"
              value={addKey}
              onChange={(e) => setAddKey(e.target.value)}
              style={{ padding: "6px 10px", fontSize: 13, maxWidth: 200 }}
            >
              <option value="">Add an area...</option>
              {addType === "town"
                ? TOWNS.map((t) => <option key={t} value={t}>{t.split("/")[0].toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}</option>)
                : DISTRICTS.map(([code, name]) => <option key={code} value={code}>D{code} {name.split(",")[0]}</option>)}
            </select>
            <button
              type="button"
              className="fc-btn fc-btn--ghost fc-btn--sm"
              disabled={!addKey || busy}
              onClick={() => { if (addKey) { mutate("add", addType, addKey); setAddKey(""); } }}
            >
              Add
            </button>
          </span>
        )}
      </div>

      {/* Setup is confirmation, not composition. These are the areas the agent
          has actually transacted in, read from their own CEA record, so the
          first interaction is ticking a box rather than filling a form. Before
          this, sg_agent_farm_areas held zero rows platform-wide and the feed
          below was therefore empty for every agent on the platform. */}
      {areas.length === 0 && suggested.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <p className="small" style={{ margin: "0 0 10px", color: "var(--ink-3)" }}>
            These are the areas you already work, from your CEA record. Confirm the ones you farm and
            your call list starts below.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {suggested.map((s) => {
              const on = picked.has(sKey(s));
              return (
                <button
                  key={sKey(s)}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    setPicked((prev) => {
                      const next = new Set(prev);
                      if (next.has(sKey(s))) next.delete(sKey(s));
                      else if (next.size < 5) next.add(sKey(s));
                      return next;
                    })
                  }
                  className="fc-card"
                  style={{
                    padding: "9px 13px", cursor: "pointer", textAlign: "left", minHeight: 44,
                    borderColor: on ? "var(--blue)" : "var(--line)",
                    background: on ? "var(--blue-wash, rgba(31,68,255,.06))" : "transparent",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span aria-hidden="true" style={{ color: on ? "var(--blue)" : "var(--line-2)", fontWeight: 700 }}>
                      {on ? "✓" : "+"}
                    </span>
                    <span>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{areaLabel(s)}</span>
                      <span className="muted small" style={{ display: "block", marginTop: 1 }}>
                        {s.deals} deal{s.deals === 1 ? "" : "s"} · last {s.last_deal}
                      </span>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="fc-btn fc-btn--primary fc-btn--sm"
            style={{ marginTop: 12 }}
            disabled={!picked.size || busy}
            onClick={confirmSuggested}
          >
            {busy ? "Saving..." : `Confirm ${picked.size} area${picked.size === 1 ? "" : "s"}`}
          </button>
        </div>
      )}

      {/* Only agents with no transaction record of their own see the old ask. */}
      {areas.length === 0 && suggested.length === 0 && (
        <p className="muted small" style={{ marginTop: 12 }}>
          Tell us the towns and districts you farm, and every morning you&apos;ll have a fresh call list:
          owners hitting their 5-year MOP (the sellers no one else has spotted yet) and every recent sale
          to price from. Add your first area above and watch your next listing appear.
        </p>
      )}

      {/* MOP prospects (strongest seller signal) */}
      {mop.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <h3 style={{ fontSize: 14, margin: "0 0 8px", color: "var(--ink)" }}>Owners reaching MOP</h3>
          <RadarList items={mop} agentSlug={agentSlug} />
        </div>
      )}

      {/* Recent activity (comps + pulse) */}
      {fresh.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <h3 style={{ fontSize: 14, margin: "0 0 8px", color: "var(--ink)" }}>Recent sales near you</h3>
          <RadarList items={fresh} agentSlug={agentSlug} />
        </div>
      )}

      {areas.length > 0 && items.length === 0 && (
        <p className="muted small" style={{ marginTop: 14 }}>
          No transactions in the last 180 days for these areas yet. Try adding another town or district.
        </p>
      )}
    </div>
  );
}

function RadarList({ items, agentSlug }: { items: RadarItem[]; agentSlug: string | null }) {
  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((it, i) => (
        <li
          key={i}
          className="fc-card"
          style={{ padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 14.5, color: "var(--ink)" }}>{it.title}</div>
            <div className="muted small" style={{ marginTop: 1 }}>{it.subtitle}</div>
            <div className="small" style={{ marginTop: 3, color: it.source === "mop_hdb" ? "var(--blue-deep)" : "var(--slate)" }}>
              {it.note} · {fmtMonth(it.event_date)}
            </div>
          </div>
          <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
            {it.price != null && (
              <div className="serif" style={{ fontWeight: 600, fontSize: 16, color: "var(--ink)" }}>{money(it.price)}</div>
            )}
            {agentSlug ? (
              <Link
                href={`/report/${agentSlug}/${it.source === "fresh_private" ? "district" : "town"}/${encodeURIComponent(it.area_key)}`}
                target="_blank"
                rel="noopener"
                className="fc-btn fc-btn--ghost fc-btn--sm"
                title="Open a co-branded market report to share with this owner"
                style={{ marginTop: 4 }}
              >
                Seller report
              </Link>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
