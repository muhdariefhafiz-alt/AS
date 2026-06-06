"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { titleName, cleanAgency } from "../../lib/names";

type TopAgent = {
  agent_id: number;
  agent_name: string;
  agent_slug: string | null;
  agency_name: string;
  score: number;
  area_txns: number;
};

type Result = {
  key_collection_date: string;
  mop_date: string;
  months_to_mop: number;
  mop_status: "before_mop" | "past_mop";
  median_resale_price: number | null;
  comp_count: number;
  price_window_months: number;
  top_agents: TopAgent[];
};

type Props = { hdbTowns: string[] };

const FLAT_TYPES = ["2 ROOM", "3 ROOM", "4 ROOM", "5 ROOM", "EXECUTIVE"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function fmtSgd(n: number): string {
  return new Intl.NumberFormat("en-SG", { style: "currency", currency: "SGD", maximumFractionDigits: 0 }).format(n);
}

function monthsLabel(n: number): string {
  if (n === 0) return "MOP this month";
  if (n > 0) {
    const yrs = Math.floor(n / 12);
    const months = n % 12;
    if (yrs === 0) return `${n} month${n === 1 ? "" : "s"} to MOP`;
    if (months === 0) return `${yrs} year${yrs === 1 ? "" : "s"} to MOP`;
    return `${yrs}y ${months}mo to MOP`;
  }
  const abs = Math.abs(n);
  if (abs < 12) return `Past MOP by ${abs} month${abs === 1 ? "" : "s"}`;
  return `Past MOP by ${Math.floor(abs / 12)} year${Math.floor(abs / 12) === 1 ? "" : "s"}`;
}

export default function MopTrackerForm({ hdbTowns }: Props) {
  const currentYear = new Date().getUTCFullYear();
  const yearOptions = useMemo(() => {
    const out: number[] = [];
    for (let y = currentYear + 1; y >= 2010; y--) out.push(y);
    return out;
  }, [currentYear]);

  const [town, setTown] = useState("");
  const [flatType, setFlatType] = useState("4 ROOM");
  const [year, setYear] = useState(String(currentYear - 4));
  const [month, setMonth] = useState("1");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [alertOpen, setAlertOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [pdpa, setPdpa] = useState(false);
  const [alertStatus, setAlertStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || !town) return;
    setSubmitting(true); setError(null); setResult(null); setAlertOpen(false);
    try {
      const res = await fetch("/api/mop/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ town, flat_type: flatType, key_collection_year: Number(year), key_collection_month: Number(month) }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json?.error ?? "Could not look up MOP."); setSubmitting(false); return; }
      setResult(json.result); setSubmitting(false);
    } catch { setError("Network error. Please try again."); setSubmitting(false); }
  }

  async function submitAlert(e: React.FormEvent) {
    e.preventDefault();
    if (alertStatus === "saving" || !result) return;
    if (!email && !whatsapp) { setAlertStatus("error"); return; }
    setAlertStatus("saving");
    try {
      const res = await fetch("/api/mop/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ town, flat_type: flatType, key_collection_year: Number(year), key_collection_month: Number(month), persist: true, email: email || null, whatsapp: whatsapp || null, marketing_consent: true }),
      });
      const json = await res.json();
      if (!res.ok || !pdpa) { setAlertStatus("error"); return; }
      setAlertStatus("saved");
      if (json.token) window.history.replaceState(null, "", `/tools/mop-tracker/result/${json.token}`);
    } catch { setAlertStatus("error"); }
  }

  return (
    <>
      <form onSubmit={submit} className="lp-panel" style={{ maxWidth: 620, margin: "-32px auto 0", padding: "26px 28px" }}>
        <div className="form-step">Tell us about your flat</div>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 18, marginTop: 14 }}>
          <div className="fc-field">
            <label className="fc-label">HDB town</label>
            <select className="fc-select" value={town} onChange={(e) => setTown(e.target.value)} required>
              <option value="">Pick a town</option>
              {hdbTowns.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="fc-field">
            <label className="fc-label">Flat type</label>
            <select className="fc-select" value={flatType} onChange={(e) => setFlatType(e.target.value)}>
              {FLAT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="form-step" style={{ marginTop: 24 }}>When did you collect your keys?</div>
        <p className="small muted" style={{ margin: "6px 0 0" }}>Roughly the month and year. We&apos;ll use the 1st of that month.</p>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 18, marginTop: 12 }}>
          <div className="fc-field">
            <label className="fc-label">Month</label>
            <select className="fc-select" value={month} onChange={(e) => setMonth(e.target.value)}>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div className="fc-field">
            <label className="fc-label">Year</label>
            <select className="fc-select" value={year} onChange={(e) => setYear(e.target.value)}>
              {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {error && <div className="fc-alert fc-alert--warn" style={{ marginTop: 16 }}>{error}</div>}

        <button type="submit" disabled={submitting || !town} className="fc-btn fc-btn--primary fc-btn--block fc-btn--lg" style={{ marginTop: 20 }}>
          {submitting ? "Calculating…" : "Calculate my MOP + value"}
        </button>
      </form>

      {result && (
        <div className="fc-card fc-card--pad" style={{ maxWidth: 620, margin: "20px auto 0", background: "var(--cloud)" }}>
          <div className="eyebrow">Your result</div>
          <div className="fc-grid-2" style={{ marginTop: 12, gap: 24 }}>
            <div>
              <div className="kicker">MOP status</div>
              <div className="serif" style={{ fontSize: 28, fontWeight: 600, marginTop: 4 }}>{monthsLabel(result.months_to_mop)}</div>
              <p className="muted small" style={{ marginTop: 4 }}>MOP date: {new Date(result.mop_date).toLocaleDateString("en-SG", { year: "numeric", month: "long" })}</p>
            </div>
            <div>
              <div className="kicker">Estimated current value</div>
              {result.median_resale_price ? (
                <>
                  <div className="serif tnum" style={{ fontSize: 28, fontWeight: 600, marginTop: 4 }}>{fmtSgd(result.median_resale_price)}</div>
                  <p className="muted small" style={{ marginTop: 4 }}>Median of {result.comp_count} {flatType} resales in {town} over the last {result.price_window_months} months</p>
                </>
              ) : (
                <>
                  <div className="muted" style={{ fontSize: 16, marginTop: 4 }}>Not enough recent comps</div>
                  <p className="muted small" style={{ marginTop: 4 }}>Fewer than 5 resales of this type in the last 6 months</p>
                </>
              )}
            </div>
          </div>

          {result.top_agents.length > 0 && (
            <div style={{ marginTop: 22, borderTop: "1px solid var(--line)", paddingTop: 18 }}>
              <div className="kicker">Top 3 HDB agents in {town}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                {result.top_agents.map((a) => (
                  <div key={a.agent_id} className="fc-card fc-row" style={{ justifyContent: "space-between", gap: 12, padding: "12px 14px", background: "#fff" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{titleName(a.agent_name)}</div>
                      <div className="muted small">{cleanAgency(a.agency_name)} · {Math.round(a.score)} AgentScore · {a.area_txns} deals in {town}</div>
                    </div>
                    {a.agent_slug && <Link href={`/property-agents/agent/${a.agent_slug}`} className="small" style={{ fontWeight: 600 }}>Profile ›</Link>}
                  </div>
                ))}
              </div>
              <Link href={`/sell?utm_source=mop_tracker&town=${encodeURIComponent(town)}`} className="fc-btn fc-btn--ink fc-btn--block" style={{ marginTop: 16 }}>
                Compare every agent in {town} free
              </Link>
            </div>
          )}

          <div style={{ marginTop: 22, borderTop: "1px solid var(--line)", paddingTop: 18 }}>
            {!alertOpen && alertStatus !== "saved" && (
              <button type="button" onClick={() => setAlertOpen(true)} className="fc-btn fc-btn--ghost fc-btn--block fc-btn--sm">
                Alert me 3 months before MOP
              </button>
            )}
            {alertOpen && alertStatus !== "saved" && (
              <form onSubmit={submitAlert} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <p style={{ fontWeight: 600, fontSize: 14 }}>When you&apos;re 3 months from MOP we&apos;ll send a refreshed valuation and a shortlist.</p>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 12 }}>
                  <div className="fc-field"><label className="fc-label">Email</label><input className="fc-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                  <div className="fc-field"><label className="fc-label">WhatsApp <span className="muted" style={{ fontWeight: 400 }}>(optional)</span></label><input className="fc-input" type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+65 ..." /></div>
                </div>
                <label className="fc-row" style={{ gap: 8, alignItems: "flex-start", fontSize: 12.5 }}>
                  <input type="checkbox" checked={pdpa} onChange={(e) => setPdpa(e.target.checked)} style={{ marginTop: 3 }} required />
                  <span className="muted">I agree to be contacted about my MOP and a future agent shortlist. Unsubscribe any time. PDPA-compliant.</span>
                </label>
                {alertStatus === "error" && <p className="small" style={{ color: "var(--danger)" }}>Provide at least one contact method and tick the consent box.</p>}
                <button type="submit" disabled={alertStatus === "saving" || !pdpa} className="fc-btn fc-btn--primary fc-btn--block fc-btn--sm">
                  {alertStatus === "saving" ? "Saving…" : "Yes, alert me before MOP"}
                </button>
              </form>
            )}
            {alertStatus === "saved" && <div className="fc-alert fc-alert--ok">Saved. We&apos;ll be in touch 3 months before your MOP.</div>}
          </div>

          <div style={{ marginTop: 14 }}>
            <button type="button"
              onClick={() => {
                const url = typeof window !== "undefined" ? window.location.href : "https://fair-comparisons.com/tools/mop-tracker";
                const text = `My HDB ${flatType} in ${town}: ${monthsLabel(result.months_to_mop)}${result.median_resale_price ? `, est. ${fmtSgd(result.median_resale_price)}` : ""}. Check yours: ${url}`;
                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
              }}
              className="fc-btn fc-btn--quiet fc-btn--block fc-btn--sm">
              Share my result via WhatsApp
            </button>
          </div>
        </div>
      )}
    </>
  );
}
