"use client";

import { useEffect, useState, useCallback } from "react";
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
const areaLabel = (a: Area) =>
  a.area_type === "district"
    ? `D${a.area_key} ${(DISTRICTS.find((d) => d[0] === a.area_key)?.[1] ?? "").split(",")[0]}`
    : a.area_key.split("/")[0].toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

export default function DealRadar() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [items, setItems] = useState<RadarItem[]>([]);
  const [agentSlug, setAgentSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [addType, setAddType] = useState<"district" | "town">("town");
  const [addKey, setAddKey] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/deal-radar");
      if (!res.ok) return;
      const j = await res.json();
      setAreas(j.areas ?? []);
      setItems(j.items ?? []);
      setAgentSlug(j.agentSlug ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
          <h2 style={{ fontSize: 18, margin: "4px 0 0" }}>Fresh prospects in your farm area</h2>
        </div>
        <span className="muted small">Owners reaching MOP + recent nearby sales, from CEA/URA/HDB records.</span>
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
        {areas.length < 5 && (
          <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
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

      {areas.length === 0 && (
        <p className="muted small" style={{ marginTop: 12 }}>
          Add the HDB towns and districts you farm. We surface owners reaching their MOP and every
          recent sale nearby, so you always have a fresh call list.
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
