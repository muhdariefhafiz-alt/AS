"use client";

import { useEffect, useState, useCallback } from "react";
import { TENANCY_SECTIONS, type FieldDef, type Section } from "../lib/documents/tenancy";
import { quotaLabel } from "../lib/documents";
import type { Tier } from "../lib/tiers";

// Paperwork: the agent's document system-of-record. Phase 1 = residential
// tenancy agreement (generate -> store). Built to the house standard: fc-scene
// framing, staged reveal, one guided form, a clear "template for your review,
// not legal advice" stance and a post-generate IRAS stamp-duty reminder.

type DocRow = {
  id: string;
  doc_type: string;
  template_key: string;
  title: string;
  status: "draft" | "finalised" | "sent" | "signed" | "void";
  fields?: Record<string, string>;
  updated_at: string;
};
type Meta = { tier: Tier; quota: number | null; used: number; canCreate: boolean };

const STATUS_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  draft: { bg: "var(--cloud)", fg: "var(--slate)", label: "Draft" },
  finalised: { bg: "var(--ok-wash)", fg: "var(--ok)", label: "Ready to sign" },
  sent: { bg: "var(--blue-wash)", fg: "var(--blue-deep)", label: "Sent" },
  signed: { bg: "var(--ok-wash)", fg: "var(--ok)", label: "Signed" },
  void: { bg: "var(--cloud)", fg: "var(--slate)", label: "Void" },
};

export default function DocumentsPanel({ onUpgrade }: { onUpgrade?: () => void }) {
  const [state, setState] = useState<"loading" | "list" | "edit" | "error">("loading");
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [current, setCurrent] = useState<DocRow | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [dirty, setDirty] = useState(false);
  const [titleDirty, setTitleDirty] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/documents");
      if (!res.ok) { setState("error"); return; }
      const d = await res.json();
      setDocs(d.documents ?? []);
      setMeta({ tier: d.tier, quota: d.quota, used: d.used, canCreate: d.canCreate });
      setState((s) => (s === "edit" ? "edit" : "list"));
    } catch { setState("error"); }
  }, []);

  // Deferred a tick so the async load's state writes are not flagged as a
  // synchronous setState in the effect body.
  useEffect(() => { queueMicrotask(() => { load(); }); }, [load]);

  async function createDoc() {
    setBusy("new"); setNotice("");
    try {
      const res = await fetch("/api/dashboard/documents", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docType: "tenancy_agreement" }),
      });
      const d = await res.json();
      if (!res.ok) {
        if (d.upgrade && onUpgrade) { setNotice(d.error); }
        else setNotice(d.error || "Could not start a document.");
        setBusy(null); return;
      }
      openDoc(d.document);
    } catch { setNotice("Connection error."); }
    setBusy(null);
  }

  function openDoc(doc: DocRow) {
    setCurrent(doc);
    setFields(doc.fields ?? {});
    setState("edit");
    setNotice("");
    setDirty(false);
    setTitleDirty(false);
  }

  // Editing a field marks the doc dirty; while the agent has not manually
  // renamed it, the title follows the property address.
  function handleFields(next: Record<string, string>) {
    setFields(next);
    setDirty(true);
    if (!titleDirty) setCurrent((c) => (c ? { ...c, title: titleFrom(next, c.title) } : c));
  }

  async function openExisting(id: string) {
    setBusy(id);
    try {
      const res = await fetch(`/api/dashboard/documents/${id}`);
      const d = await res.json();
      if (res.ok) openDoc(d.document);
    } catch {}
    setBusy(null);
  }

  async function save(status?: "draft" | "finalised"): Promise<boolean> {
    if (!current) return false;
    setBusy("save");
    try {
      const res = await fetch(`/api/dashboard/documents/${current.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields, title: current.title, ...(status ? { status } : {}) }),
      });
      const d = await res.json();
      if (res.ok) { setCurrent(d.document); setDirty(false); setNotice(status === "finalised" ? "Marked ready to sign." : "Saved."); setBusy(null); return true; }
      setNotice(d.error || "Could not save."); setBusy(null); return false;
    } catch { setNotice("Connection error."); setBusy(null); return false; }
  }

  async function previewPdf() {
    if (!current) return;
    const ok = await save();
    if (ok) window.open(`/api/dashboard/documents/${current.id}/pdf`, "_blank", "noopener");
  }

  async function del(id: string) {
    if (!confirm("Delete this document? This cannot be undone.")) return;
    setBusy(id); setNotice("");
    try {
      const res = await fetch(`/api/dashboard/documents/${id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setNotice(d.error || "Could not delete."); }
    } catch { setNotice("Connection error."); }
    setBusy(null);
    if (current?.id === id) { setCurrent(null); setState("list"); }
    load();
  }

  if (state === "loading") return null;

  // ---------- EDIT ----------
  if (state === "edit" && current) {
    return (
      <div className="fc-card fc-hero-in" style={{ padding: 22 }}>
        <button onClick={async () => { if (dirty) await save(); setState("list"); setCurrent(null); load(); }} className="small" style={{ border: "none", background: "none", cursor: "pointer", color: "var(--blue)", fontWeight: 600, padding: 0 }}>
          &larr; All documents
        </button>

        <div className="fc-row" style={{ justifyContent: "space-between", alignItems: "flex-start", marginTop: 12, gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <p className="kicker" style={{ margin: 0 }}>Residential tenancy agreement</p>
            <input
              value={current.title}
              onChange={(e) => { setCurrent({ ...current, title: e.target.value }); setTitleDirty(true); setDirty(true); }}
              className="fc-input"
              style={{ marginTop: 6, fontWeight: 700, fontSize: 16, width: "100%", maxWidth: 420 }}
              aria-label="Document title"
            />
          </div>
          <span className="fc-badge" style={{ background: STATUS_STYLE[current.status].bg, color: STATUS_STYLE[current.status].fg }}>
            {STATUS_STYLE[current.status].label}
          </span>
        </div>

        <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 14 }}>
          {TENANCY_SECTIONS.map((section, si) => (
            <SectionBlock key={section.title} section={section} index={si} fields={fields} setFields={handleFields} />
          ))}
        </div>

        {/* Legal + stamp-duty guidance */}
        <div className="fc-card fc-card--fill" style={{ marginTop: 16, padding: "12px 14px", background: "var(--blue-wash)", borderColor: "transparent" }}>
          <p className="small" style={{ margin: 0, color: "var(--ink-2)" }}>
            <strong>Standard template for your review.</strong> This generates a standard document, not legal advice.
            Have the parties seek independent advice for non-standard terms. After signing, the tenant stamps the
            agreement within 14 days via <a href="https://mytax.iras.gov.sg" target="_blank" rel="noopener noreferrer" style={{ color: "var(--blue)" }}>IRAS e-Stamping</a>.
          </p>
        </div>

        {/* Action bar */}
        <div className="fc-row" style={{ gap: 10, marginTop: 16, flexWrap: "wrap", alignItems: "center" }}>
          <button onClick={() => save()} disabled={busy === "save"} className="fc-btn fc-btn--ghost fc-btn--sm">
            {busy === "save" ? "Saving…" : "Save"}
          </button>
          <button onClick={previewPdf} disabled={busy === "save"} className="fc-btn fc-btn--primary fc-btn--sm fc-btn--hairline">
            Preview &amp; download PDF
          </button>
          {current.status === "draft" ? (
            <button onClick={() => save("finalised")} disabled={busy === "save"} className="fc-btn fc-btn--quiet fc-btn--sm">
              Mark ready to sign
            </button>
          ) : (
            <button onClick={() => save("draft")} disabled={busy === "save"} className="fc-btn fc-btn--quiet fc-btn--sm">
              Back to draft
            </button>
          )}
          {notice && <span className="small" style={{ color: "var(--slate)" }}>{notice}</span>}
        </div>
        {current.status === "draft" && (
          <p className="muted small" style={{ marginTop: 8 }}>The PDF carries a DRAFT watermark until you mark it ready to sign.</p>
        )}
      </div>
    );
  }

  // ---------- LIST ----------
  const quota = meta?.quota;
  const used = meta?.used ?? 0;
  return (
    <div className="fc-card fc-hero-in" style={{ padding: 22 }}>
      <div className="fc-row" style={{ justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
        <p className="kicker" style={{ margin: 0 }}>Paperwork</p>
        {meta && (
          <span className="mono" style={{ fontSize: 11.5, color: "var(--slate)" }}>
            {quota === null ? `${used} this month · ${quotaLabel(meta.tier)}` : `${used} of ${quota} this month`}
          </span>
        )}
      </div>

      {docs.length === 0 ? (
        <div className="fc-scene fc-scene--ink" style={{ marginTop: 14, padding: "clamp(14px,2.4vw,24px)" }}>
          <div className="fc-scene__card" style={{ padding: "clamp(18px,3vw,28px)", textAlign: "center" }}>
            <h3 className="serif" style={{ fontSize: 22, margin: 0 }}>
              Draw up a tenancy agreement <span className="italic-serif">in minutes.</span>
            </h3>
            <p className="muted" style={{ marginTop: 8, fontSize: 14.5, maxWidth: "48ch", marginInline: "auto" }}>
              A standard residential TA, started with your salesperson details and the standard clauses already filled in.
              Fill the property, parties and rent, then download a clean PDF to sign.
            </p>
            <button onClick={createDoc} disabled={busy === "new" || meta?.canCreate === false} className="fc-btn fc-btn--primary fc-btn--hairline" style={{ marginTop: 16 }}>
              {busy === "new" ? "Starting…" : "New tenancy agreement"}
            </button>
            {meta?.canCreate === false && (
              <p className="small" style={{ marginTop: 12, color: "var(--slate)" }}>
                You have used your {quota} this month.{" "}
                {onUpgrade && <button onClick={onUpgrade} className="linklike" style={{ color: "var(--blue)", fontWeight: 600, border: "none", background: "none", cursor: "pointer" }}>Upgrade for more</button>}
              </p>
            )}
            {notice && <p className="small" style={{ marginTop: 10, color: "var(--danger)" }}>{notice}</p>}
          </div>
        </div>
      ) : (
        <>
          <div className="fc-row" style={{ justifyContent: "space-between", alignItems: "center", marginTop: 14, marginBottom: 12 }}>
            <p className="muted small" style={{ margin: 0 }}>Your documents are private and stored to your account.</p>
            <button onClick={createDoc} disabled={busy === "new" || meta?.canCreate === false} className="fc-btn fc-btn--primary fc-btn--sm fc-btn--hairline">
              {busy === "new" ? "Starting…" : "New"}
            </button>
          </div>
          {meta?.canCreate === false && (
            <p className="small" style={{ margin: "0 0 10px", color: "var(--slate)" }}>
              You have used all {quota} this month.{" "}
              {onUpgrade && <button onClick={onUpgrade} className="linklike" style={{ color: "var(--blue)", fontWeight: 600, border: "none", background: "none", cursor: "pointer" }}>Upgrade for more</button>}
            </p>
          )}
          {notice && <p className="small" style={{ margin: "0 0 10px", color: "var(--danger)" }}>{notice}</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {docs.map((d, i) => (
              <div key={d.id} className="fc-card fc-reveal" style={{ ["--reveal-delay" as string]: `${Math.min(i * 0.04, 0.4)}s`, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, background: "#fff" }}>
                <button onClick={() => openExisting(d.id)} style={{ border: "none", background: "none", cursor: "pointer", textAlign: "left", flex: 1, minWidth: 0, padding: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.title}</div>
                  <div className="muted small" style={{ marginTop: 2 }}>Updated {new Date(d.updated_at).toLocaleDateString("en-SG", { day: "numeric", month: "short" })}</div>
                </button>
                <span className="fc-badge" style={{ background: STATUS_STYLE[d.status].bg, color: STATUS_STYLE[d.status].fg, flexShrink: 0 }}>{STATUS_STYLE[d.status].label}</span>
                <div className="fc-row" style={{ gap: 6, flexShrink: 0 }}>
                  <a href={`/api/dashboard/documents/${d.id}/pdf`} target="_blank" rel="noopener noreferrer" className="fc-btn fc-btn--quiet fc-btn--sm" style={{ textDecoration: "none" }}>PDF</a>
                  <button onClick={() => del(d.id)} disabled={busy === d.id} className="fc-btn fc-btn--quiet fc-btn--sm" aria-label="Delete" style={{ color: "var(--danger)" }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
          <p className="mono" style={{ marginTop: 12, fontSize: 11, color: "var(--slate)" }}>
            Standard templates for your review, not legal advice.
          </p>
        </>
      )}
    </div>
  );
}

// Title reflects the property address as it is typed.
function titleFrom(fields: Record<string, string>, fallback: string): string {
  const addr = (fields.premises_address || "").trim();
  return addr ? `TA · ${addr.split(",")[0].slice(0, 48)}` : fallback;
}
function SectionBlock({ section, index, fields, setFields }: { section: Section; index: number; fields: Record<string, string>; setFields: (f: Record<string, string>) => void }) {
  const isAgent = section.fields.some((f) => f.group === "agent");
  const [open, setOpen] = useState(!isAgent);
  const set = (k: string, v: string) => setFields({ ...fields, [k]: v });

  return (
    <div className="fc-card fc-reveal" style={{ ["--reveal-delay" as string]: `${Math.min(index * 0.05, 0.4)}s`, padding: "16px 18px", background: "#fff" }}>
      <button onClick={() => setOpen((o) => !o)} style={{ border: "none", background: "none", cursor: "pointer", padding: 0, width: "100%", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>
          <span className="kicker">{section.title}</span>
          {section.note && <span className="muted small" style={{ display: "block", marginTop: 2, fontWeight: 400 }}>{section.note}</span>}
        </span>
        <span className="mono" style={{ color: "var(--slate)", fontSize: 13 }}>{open ? "–" : "+"}</span>
      </button>
      {open && (
        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          {section.fields.map((f) => {
            if (f.showIf && (fields[f.showIf.key] || "") !== f.showIf.equals) return null;
            return <Field key={f.key} def={f} value={fields[f.key] ?? f.default ?? ""} onChange={(v) => set(f.key, v)} />;
          })}
        </div>
      )}
    </div>
  );
}

function Field({ def, value, onChange }: { def: FieldDef; value: string; onChange: (v: string) => void }) {
  const span2 = def.colSpan === 2 ? { gridColumn: "1 / -1" } : {};
  const labelEl = (
    <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: "var(--slate)", marginBottom: 4 }}>
      {def.label}{def.required && <span style={{ color: "var(--danger)" }}> *</span>}
    </label>
  );
  const hint = def.hint ? <p className="muted" style={{ margin: "4px 0 0", fontSize: 11.5 }}>{def.hint}</p> : null;

  if (def.type === "checkbox") {
    const on = value === "true";
    return (
      <div style={span2}>
        <button type="button" onClick={() => onChange(on ? "false" : "true")} className="fc-row" style={{ gap: 10, alignItems: "center", border: "none", background: "none", cursor: "pointer", padding: 0 }}>
          <span style={{ width: 38, height: 22, borderRadius: 999, background: on ? "var(--blue)" : "var(--line-2)", position: "relative", transition: "background .2s", flexShrink: 0 }}>
            <span style={{ position: "absolute", top: 2, left: on ? 18 : 2, width: 18, height: 18, borderRadius: 999, background: "#fff", transition: "left .2s" }} />
          </span>
          <span style={{ fontSize: 13.5, fontWeight: 600 }}>{def.label}</span>
        </button>
        {hint}
      </div>
    );
  }

  return (
    <div style={span2}>
      {labelEl}
      {def.type === "textarea" ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={def.placeholder} className="fc-textarea" style={{ width: "100%", minHeight: 64, fontSize: 13.5 }} />
      ) : def.type === "select" ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} className="fc-input" style={{ width: "100%", fontSize: 13.5 }}>
          <option value="">Select…</option>
          {(def.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : def.type === "money" ? (
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--slate)", fontSize: 13 }}>S$</span>
          <input value={value} onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" placeholder={def.placeholder} className="fc-input" style={{ width: "100%", fontSize: 13.5, paddingLeft: 30 }} />
        </div>
      ) : (
        <input
          type={def.type === "date" ? "date" : def.type === "number" ? "number" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={def.placeholder}
          className="fc-input"
          style={{ width: "100%", fontSize: 13.5 }}
        />
      )}
      {hint}
    </div>
  );
}
