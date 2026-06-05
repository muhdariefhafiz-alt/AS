"use client";

import { useState, useRef } from "react";
import Link from "next/link";

type Mode = "hdb" | "private";

type RecentComp = { label: string; price: number; detail: string };
type Result = {
  low: number;
  mid: number;
  high: number;
  comp_count: number;
  confidence: "high" | "medium" | "low";
  window_months: number;
  recent: RecentComp[];
  project_name?: string;
  district?: string | null;
};

type ProjectHit = {
  name: string;
  slug: string;
  district: string | null;
  txn_count: number;
};

const FLAT_TYPES = ["2 ROOM", "3 ROOM", "4 ROOM", "5 ROOM", "EXECUTIVE"];

function fmtSgd(n: number): string {
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency: "SGD",
    maximumFractionDigits: 0,
  }).format(n);
}

const CONFIDENCE_COPY: Record<string, string> = {
  high: "High confidence — 30+ recent comparable sales",
  medium: "Medium confidence — 10+ recent comparable sales",
  low: "Lower confidence — few recent comparable sales",
};

export default function ValuationForm({ hdbTowns }: { hdbTowns: string[] }) {
  const [mode, setMode] = useState<Mode>("hdb");
  const [town, setTown] = useState("");
  const [flatType, setFlatType] = useState("4 ROOM");
  const [block, setBlock] = useState("");
  const [projectQuery, setProjectQuery] = useState("");
  const [projectHits, setProjectHits] = useState<ProjectHit[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectHit | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [pdpa, setPdpa] = useState(false);
  const [captureStatus, setCaptureStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  function onProjectQuery(v: string) {
    setProjectQuery(v);
    setSelectedProject(null);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (v.trim().length < 2) { setProjectHits([]); return; }
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/avm/projects?q=${encodeURIComponent(v)}`);
        const json = await res.json();
        setProjectHits(json.projects ?? []);
      } catch { setProjectHits([]); }
    }, 250);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null); setResult(null); setCaptureOpen(false); setCaptureStatus("idle");
    if (mode === "hdb" && !town) { setError("Pick a town."); return; }
    if (mode === "private" && !selectedProject) { setError("Pick a development from the list."); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/avm/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "hdb"
            ? { mode, town, flat_type: flatType, block: block || null }
            : { mode, project_slug: selectedProject!.slug }
        ),
      });
      const json = await res.json();
      if (!res.ok) { setError(json?.error ?? "Could not estimate."); setSubmitting(false); return; }
      setResult(json.result); setSubmitting(false);
    } catch { setError("Network error. Please try again."); setSubmitting(false); }
  }

  async function saveTracker(e: React.FormEvent) {
    e.preventDefault();
    if (captureStatus === "saving" || !result) return;
    if ((!email && !whatsapp) || !pdpa) { setCaptureStatus("error"); return; }
    setCaptureStatus("saving");
    try {
      const res = await fetch("/api/avm/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(mode === "hdb"
            ? { mode, town, flat_type: flatType, block: block || null }
            : { mode, project_slug: selectedProject!.slug }),
          persist: true, email: email || null, whatsapp: whatsapp || null, marketing_consent: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setCaptureStatus("error"); return; }
      setCaptureStatus("saved");
      if (json.token) window.history.replaceState(null, "", `/tools/valuation/result/${json.token}`);
    } catch { setCaptureStatus("error"); }
  }

  const areaForLink = mode === "hdb" ? town : result?.district ? `D${result.district}` : "";
  const midPct = result ? Math.max(6, Math.min(94, ((result.mid - result.low) / Math.max(1, result.high - result.low)) * 100)) : 50;

  return (
    <>
      <form onSubmit={submit} className="lp-panel" style={{ maxWidth: 620, margin: "-32px auto 0", padding: "26px 28px" }}>
        <div className="seg" style={{ gridTemplateColumns: "1fr 1fr" }}>
          {(["hdb", "private"] as Mode[]).map((m) => (
            <button key={m} type="button"
              onClick={() => { setMode(m); setResult(null); setError(null); }}
              className={"seg__btn" + (mode === m ? " seg__btn--active" : "")}>
              {m === "hdb" ? "HDB flat" : "Condo / private"}
            </button>
          ))}
        </div>

        {mode === "hdb" ? (
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 18, marginTop: 18 }}>
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
            <div className="fc-field" style={{ gridColumn: "1 / -1" }}>
              <label className="fc-label">Block <span className="muted" style={{ fontWeight: 400 }}>(optional, tightens the estimate)</span></label>
              <input className="fc-input" value={block} onChange={(e) => setBlock(e.target.value)} placeholder="e.g. 123" />
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 18, position: "relative" }}>
            <div className="fc-field">
              <label className="fc-label">Development name</label>
              <input className="fc-input" value={projectQuery} onChange={(e) => onProjectQuery(e.target.value)} placeholder="Start typing, e.g. The Sail" />
            </div>
            {projectHits.length > 0 && !selectedProject && (
              <ul className="fc-card" style={{ marginTop: 6, maxHeight: 210, overflowY: "auto", listStyle: "none", padding: 0 }}>
                {projectHits.map((p) => (
                  <li key={p.slug}>
                    <button type="button"
                      onClick={() => { setSelectedProject(p); setProjectQuery(p.name); setProjectHits([]); }}
                      style={{ display: "flex", width: "100%", justifyContent: "space-between", gap: 12, padding: "10px 14px", textAlign: "left", background: "none", border: "none", cursor: "pointer" }}>
                      <span style={{ fontWeight: 600 }}>{p.name}</span>
                      <span className="muted small">D{p.district} · {p.txn_count} sales</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {selectedProject && (
              <p className="small" style={{ marginTop: 8, color: "var(--blue-deep)" }}>
                Selected: <strong>{selectedProject.name}</strong> (D{selectedProject.district})
              </p>
            )}
          </div>
        )}

        {error && <div className="fc-alert fc-alert--warn" style={{ marginTop: 16 }}>{error}</div>}

        <button type="submit" disabled={submitting} className="fc-btn fc-btn--primary fc-btn--block fc-btn--lg" style={{ marginTop: 20 }}>
          {submitting ? "Estimating…" : "Estimate my home's value"}
        </button>
      </form>

      {result && (
        <div className="fc-card fc-card--pad" style={{ maxWidth: 620, margin: "20px auto 0", background: "var(--cloud)" }}>
          <div className="eyebrow">Estimated value range</div>
          <div className="serif tnum" style={{ fontWeight: 600, fontSize: 36, letterSpacing: "-0.02em", marginTop: 6 }}>
            {fmtSgd(result.low)} <span className="muted" style={{ fontWeight: 400, fontSize: 22 }}>to</span> {fmtSgd(result.high)}
          </div>
          <p className="muted small" style={{ marginTop: 4 }}>Most likely around <strong>{fmtSgd(result.mid)}</strong></p>

          <div className="fc-range" style={{ marginTop: 16 }}>
            <div className="fc-range__band" style={{ left: "8%", right: "8%" }} />
            <div style={{ position: "absolute", left: `${midPct}%`, top: "50%", width: 14, height: 14, borderRadius: "50%", background: "var(--blue)", border: "2px solid #fff", transform: "translate(-50%,-50%)", boxShadow: "var(--sh-1)" }} />
          </div>
          <div className="fc-row mono small muted" style={{ justifyContent: "space-between", marginTop: 6 }}>
            <span>{fmtSgd(result.low)}</span><span>{fmtSgd(result.high)}</span>
          </div>

          <p className="muted small" style={{ marginTop: 14 }}>
            {CONFIDENCE_COPY[result.confidence]}. Based on {result.comp_count} transactions over the last {result.window_months} months. Actual sale prices vary with floor, facing, renovation and timing.
          </p>

          {result.recent.length > 0 && (
            <div style={{ marginTop: 18, borderTop: "1px solid var(--line)", paddingTop: 14 }}>
              <div className="kicker">Recent comparable sales</div>
              <ul style={{ listStyle: "none", padding: 0, margin: "10px 0 0", display: "flex", flexDirection: "column", gap: 6 }}>
                {result.recent.map((c, i) => (
                  <li key={i} className="fc-row" style={{ justifyContent: "space-between", gap: 12, fontSize: 14 }}>
                    <span>{c.label}{c.detail && <span className="muted"> · {c.detail}</span>}</span>
                    <span style={{ fontWeight: 600 }} className="tnum">{fmtSgd(c.price)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Link href={`/sell?utm_source=avm${areaForLink ? `&town=${encodeURIComponent(areaForLink)}` : ""}`} className="fc-btn fc-btn--ink fc-btn--block" style={{ marginTop: 18 }}>
            Get matched with an agent to sell at the top of this range
          </Link>

          <div style={{ marginTop: 16, borderTop: "1px solid var(--line)", paddingTop: 14 }}>
            {!captureOpen && captureStatus !== "saved" && (
              <button type="button" onClick={() => setCaptureOpen(true)} className="fc-btn fc-btn--ghost fc-btn--block fc-btn--sm">
                Track this value monthly
              </button>
            )}
            {captureOpen && captureStatus !== "saved" && (
              <form onSubmit={saveTracker} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <p style={{ fontWeight: 600, fontSize: 14 }}>We will email you when this estimate moves more than 2%.</p>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 12 }}>
                  <input className="fc-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
                  <input className="fc-input" type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="WhatsApp (optional)" />
                </div>
                <label className="fc-row" style={{ gap: 8, alignItems: "flex-start", fontSize: 12.5 }}>
                  <input type="checkbox" checked={pdpa} onChange={(e) => setPdpa(e.target.checked)} style={{ marginTop: 3 }} required />
                  <span className="muted">I agree to monthly value updates and a future agent shortlist. PDPA-compliant. Unsubscribe anytime.</span>
                </label>
                {captureStatus === "error" && <p className="small" style={{ color: "var(--danger)" }}>Add a contact method and tick the box.</p>}
                <button type="submit" disabled={captureStatus === "saving" || !pdpa} className="fc-btn fc-btn--primary fc-btn--block fc-btn--sm">
                  {captureStatus === "saving" ? "Saving…" : "Track this value"}
                </button>
              </form>
            )}
            {captureStatus === "saved" && <div className="fc-alert fc-alert--ok">Saved. We will update you when the value moves.</div>}
          </div>
        </div>
      )}
    </>
  );
}
