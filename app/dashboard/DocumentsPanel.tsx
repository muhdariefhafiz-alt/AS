"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { availableDocTypes, docTypeByKey, isEditable, quotaLabel, type DocTypeMeta } from "../lib/documents";
import type { FieldDef, Section } from "../lib/documents/schema";
import type { Tier } from "../lib/tiers";

// Paperwork: the agent's document system-of-record.
//
// Everything type-specific comes from the registry (lib/documents/index.ts):
// the picker, the form schema, the editor eyebrow, the guidance note, the empty
// state and the chain offer. Adding a template must never mean editing this
// file.
//
// The deal is a chain, not a document: an LOI that becomes a tenancy agreement
// in one tap is the reason to type the property and parties here rather than in
// a free template elsewhere.

type DocRow = {
  id: string;
  doc_type: string;
  template_key: string;
  title: string;
  status: "draft" | "finalised" | "sent" | "signed" | "void";
  fields?: Record<string, string>;
  linked_document_id?: string | null;
  updated_at: string;
};
type Meta = { tier: Tier; quota: number | null; used: number; canCreate: boolean };

const STATUS_STYLE: Record<string, { bg: string; fg: string; label: string }> = {
  draft: { bg: "var(--cloud)", fg: "var(--slate)", label: "Draft" },
  finalised: { bg: "var(--ok-wash)", fg: "var(--ok)", label: "Ready to sign" },
  sent: { bg: "var(--blue-wash)", fg: "var(--blue-deep)", label: "Sent out" },
  signed: { bg: "var(--ok-wash)", fg: "var(--ok)", label: "Signed" },
  void: { bg: "var(--cloud)", fg: "var(--slate)", label: "Void" },
};

// What the agent can do next, by state. Mirrors the server's transition map.
const NEXT_ACTION: Record<string, { status: DocRow["status"]; label: string } | null> = {
  draft: { status: "finalised", label: "Mark ready to sign" },
  finalised: { status: "sent", label: "Mark as sent out" },
  sent: { status: "signed", label: "Mark as signed" },
  signed: null,
  void: null,
};

export type AutoStart = { type: string; seed?: Record<string, string>; entry?: string };

export default function DocumentsPanel({ onUpgrade, autoStart, onAutoStartConsumed }: { onUpgrade?: () => void; autoStart?: AutoStart; onAutoStartConsumed?: () => void }) {
  const [state, setState] = useState<"loading" | "list" | "picker" | "edit" | "error">("loading");
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [current, setCurrent] = useState<DocRow | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [dirty, setDirty] = useState(false);
  const [titleDirty, setTitleDirty] = useState(false);
  const [chainNote, setChainNote] = useState("");
  const autoStarted = useRef(false);

  const types = availableDocTypes();
  const currentType: DocTypeMeta | undefined = current ? docTypeByKey(current.doc_type) : undefined;
  const editable = current ? isEditable(current.status) : false;

  const firstLoad = useRef(true);
  const load = useCallback(async () => {
    try {
      const first = firstLoad.current;
      firstLoad.current = false;
      const res = await fetch(`/api/dashboard/documents?source=tab${first ? "&first=1" : ""}`);
      if (!res.ok) { setState("error"); return; }
      const d = await res.json();
      setDocs(d.documents ?? []);
      setMeta({ tier: d.tier, quota: d.quota, used: d.used, canCreate: d.canCreate });
      setState((s) => (s === "edit" ? "edit" : s === "picker" ? "picker" : "list"));
    } catch { setState("error"); }
  }, []);

  // Deferred a tick so the async load's state writes are not flagged as a
  // synchronous setState in the effect body.
  useEffect(() => { queueMicrotask(() => { load(); }); }, [load]);

  // The dashboard unmounts this panel on a tab switch, so unsaved edits would
  // vanish silently. Track the latest editable state after each render and
  // flush it on the way out.
  const pending = useRef<{ id: string; fields: Record<string, string>; title: string } | null>(null);
  useEffect(() => {
    pending.current = current && editable && dirty ? { id: current.id, fields, title: current.title } : null;
  });
  useEffect(() => {
    return () => {
      const p = pending.current;
      if (!p) return;
      const body = JSON.stringify({ fields: p.fields, title: p.title });
      // keepalive so the write survives the unmount / navigation.
      fetch(`/api/dashboard/documents/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {});
    };
  }, []);

  const openDoc = useCallback((doc: DocRow) => {
    setCurrent(doc);
    setFields(doc.fields ?? {});
    setState("edit");
    setNotice("");
    setChainNote("");
    setDirty(false);
    setTitleDirty(false);
  }, []);

  const createDoc = useCallback(async (docType: string, fromDocumentId?: string, seed?: Record<string, string>, entry?: string) => {
    setBusy("new"); setNotice("");
    try {
      const res = await fetch("/api/dashboard/documents", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docType, ...(fromDocumentId ? { fromDocumentId } : {}), ...(seed ? { seed } : {}), source: entry ?? "picker" }),
      });
      const d = await res.json();
      if (!res.ok) {
        setNotice(d.error || "Could not start a document.");
        setBusy(null);
        setState("list");
        return;
      }
      openDoc(d.document);
      if (d.carried > 0) setChainNote(`${d.carried} details carried over. Check them, then add anything new.`);
    } catch { setNotice("Connection error."); }
    setBusy(null);
  }, [openDoc]);

  // Deep link from elsewhere in the dashboard (the Today hero, a viewing row):
  // land the agent inside a started document, not on an empty list.
  useEffect(() => {
    if (!autoStart || autoStarted.current || state === "loading") return;
    if (!docTypeByKey(autoStart.type)?.available) return;
    autoStarted.current = true;
    // Tell the parent immediately: this panel unmounts on every tab switch, so
    // a trigger left set would create a fresh blank document (and burn a quota
    // slot) each time the agent comes back to the tab.
    onAutoStartConsumed?.();
    queueMicrotask(() => { createDoc(autoStart.type, undefined, autoStart.seed, autoStart.entry ?? "deep_link"); });
  }, [autoStart, state, createDoc, onAutoStartConsumed]);

  // Editing a field marks the doc dirty; while the agent has not manually
  // renamed it, the title follows the property address.
  function handleFields(next: Record<string, string>) {
    setFields(next);
    setDirty(true);
    if (!titleDirty && currentType) {
      const t = currentType.title(next);
      setCurrent((c) => (c ? { ...c, title: t } : c));
    }
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

  async function save(status?: DocRow["status"]): Promise<boolean> {
    if (!current) return false;
    setBusy("save");
    try {
      // Content only travels while the document is a draft; a status-only move
      // must not resend fields the server would reject.
      const payload = editable
        ? { fields, title: current.title, ...(status ? { status } : {}) }
        : { ...(status ? { status } : {}) };
      const res = await fetch(`/api/dashboard/documents/${current.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (res.ok) {
        setCurrent(d.document);
        setFields(d.document.fields ?? fields);
        setDirty(false);
        setNotice(status ? STATUS_NOTICE[status] ?? "Saved." : "Saved.");
        setBusy(null);
        return true;
      }
      setNotice(d.error || "Could not save."); setBusy(null); return false;
    } catch { setNotice("Connection error."); setBusy(null); return false; }
  }

  async function previewPdf() {
    if (!current) return;
    if (editable && dirty) {
      const ok = await save();
      if (!ok) return;
    }
    window.open(`/api/dashboard/documents/${current.id}/pdf`, "_blank", "noopener");
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
  if (state === "edit" && current && currentType) {
    const next = NEXT_ACTION[current.status];
    const chain = currentType.chain;
    const chainTarget = chain ? docTypeByKey(chain.to) : undefined;
    const showChain = Boolean(chain && chainTarget?.available && current.status !== "draft" && current.status !== "void");

    return (
      <div className="fc-card fc-hero-in" style={{ padding: 22 }}>
        <button onClick={async () => { if (dirty && editable) await save(); setState("list"); setCurrent(null); load(); }} className="small" style={{ border: "none", background: "none", cursor: "pointer", color: "var(--blue)", fontWeight: 600, padding: 0 }}>
          &larr; All documents
        </button>

        <div className="fc-row" style={{ justifyContent: "space-between", alignItems: "flex-start", marginTop: 12, gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <p className="kicker" style={{ margin: 0 }}>{currentType.kicker}</p>
            <input
              value={current.title}
              onChange={(e) => { setCurrent({ ...current, title: e.target.value }); setTitleDirty(true); setDirty(true); }}
              className="fc-input"
              disabled={!editable}
              style={{ marginTop: 6, fontWeight: 700, fontSize: 16, width: "100%", maxWidth: 420 }}
              aria-label="Document title"
            />
          </div>
          <span className="fc-badge" style={{ background: STATUS_STYLE[current.status].bg, color: STATUS_STYLE[current.status].fg }}>
            {STATUS_STYLE[current.status].label}
          </span>
        </div>

        {chainNote && (
          <div className="fc-card fc-card--fill fc-pop-in" style={{ marginTop: 14, padding: "12px 14px", background: "var(--ok-wash)", borderColor: "transparent" }}>
            <p className="small" style={{ margin: 0, color: "var(--ink-2)" }}><strong>Carried over.</strong> {chainNote}</p>
          </div>
        )}

        {!editable && (
          <div className="fc-card fc-card--fill" style={{ marginTop: 14, padding: "12px 14px", background: "var(--cloud)", borderColor: "transparent" }}>
            <p className="small" style={{ margin: 0, color: "var(--ink-2)" }}>
              This document is {STATUS_STYLE[current.status].label.toLowerCase()}, so its contents are locked.
              {current.status !== "signed" && current.status !== "void" ? " Move it back to draft to change anything." : ""}
            </p>
          </div>
        )}

        <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 14 }}>
          {currentType.sections.map((section, si) => (
            <SectionBlock key={section.title} section={section} index={si} fields={fields} setFields={handleFields} readOnly={!editable} />
          ))}
        </div>

        {/* Per-type guidance: what this document is and is not. */}
        <div className="fc-card fc-card--fill" style={{ marginTop: 16, padding: "12px 14px", background: "var(--blue-wash)", borderColor: "transparent" }}>
          <p className="small" style={{ margin: 0, color: "var(--ink-2)" }}>
            <strong>{currentType.guidance.strong}</strong>{" "}
            {currentType.guidance.link
              ? (() => {
                  const [before, after] = currentType.guidance.body.split(currentType.guidance.link.label);
                  return (
                    <>
                      {before}
                      <a href={currentType.guidance.link.href} target="_blank" rel="noopener noreferrer" style={{ color: "var(--blue)" }}>
                        {currentType.guidance.link.label}
                      </a>
                      {after ?? ""}
                    </>
                  );
                })()
              : currentType.guidance.body}
          </p>
        </div>

        {/* Action bar */}
        <div className="fc-row" style={{ gap: 10, marginTop: 16, flexWrap: "wrap", alignItems: "center" }}>
          {editable && (
            <button onClick={() => save()} disabled={busy === "save"} className="fc-btn fc-btn--ghost fc-btn--sm">
              {busy === "save" ? "Saving…" : "Save"}
            </button>
          )}
          <button onClick={previewPdf} disabled={busy === "save"} className="fc-btn fc-btn--primary fc-btn--sm fc-btn--hairline">
            Preview &amp; download PDF
          </button>
          {next && (
            <button onClick={() => save(next.status)} disabled={busy === "save"} className="fc-btn fc-btn--quiet fc-btn--sm">
              {next.label}
            </button>
          )}
          {!editable && current.status !== "signed" && current.status !== "void" && (
            <button onClick={() => save("draft")} disabled={busy === "save"} className="fc-btn fc-btn--quiet fc-btn--sm">
              Back to draft
            </button>
          )}
          {notice && <span className="small" style={{ color: "var(--slate)" }}>{notice}</span>}
        </div>
        {current.status === "draft" && (
          <p className="muted small" style={{ marginTop: 8 }}>The PDF carries a DRAFT watermark until you mark it ready to sign.</p>
        )}

        {/* The chain: the next document in the deal, pre-filled from this one. */}
        {showChain && chain && chainTarget && (
          <div className="fc-scene fc-scene--mint" style={{ marginTop: 18, padding: "clamp(12px,2vw,18px)" }}>
            <div className="fc-scene__card" style={{ padding: "16px 18px" }}>
              <p className="kicker" style={{ margin: 0 }}>Next in this deal</p>
              <h3 className="serif" style={{ fontSize: 18, margin: "6px 0 0" }}>
                {chain.label} <span className="italic-serif">without retyping.</span>
              </h3>
              <p className="muted small" style={{ marginTop: 6, maxWidth: "52ch" }}>{chain.hint}</p>
              <button
                onClick={() => createDoc(chain.to, current.id, undefined, "chain")}
                disabled={busy === "new" || meta?.canCreate === false}
                className="fc-btn fc-btn--primary fc-btn--sm fc-btn--hairline"
                style={{ marginTop: 12 }}
              >
                {busy === "new" ? "Starting…" : `Start the ${chainTarget.label.toLowerCase()}`}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---------- PICKER ----------
  if (state === "picker") {
    return (
      <div className="fc-card fc-hero-in" style={{ padding: 22 }}>
        <button onClick={() => setState("list")} className="small" style={{ border: "none", background: "none", cursor: "pointer", color: "var(--blue)", fontWeight: 600, padding: 0 }}>
          &larr; All documents
        </button>
        <p className="kicker" style={{ margin: "12px 0 0" }}>New document</p>
        <h3 className="serif" style={{ fontSize: 20, margin: "6px 0 0" }}>What are you drawing up?</h3>
        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 12 }}>
          {types.map((t, i) => (
            <button
              key={t.key}
              onClick={() => createDoc(t.key)}
              disabled={busy === "new"}
              className="fc-card fc-reveal"
              style={{ ["--reveal-delay" as string]: `${i * 0.05}s`, padding: 16, textAlign: "left", cursor: "pointer", background: "#fff" }}
            >
              <div style={{ fontWeight: 700, fontSize: 15 }}>{t.label}</div>
              <div className="muted small" style={{ marginTop: 4 }}>{t.blurb}</div>
              <div className="small" style={{ marginTop: 10, color: "var(--blue)", fontWeight: 600 }}>
                {busy === "new" ? "Starting…" : `Start · ${t.minutes}`}
              </div>
            </button>
          ))}
        </div>
        {notice && <p className="small" style={{ marginTop: 12, color: "var(--danger)" }}>{notice}</p>}
      </div>
    );
  }

  // ---------- LIST ----------
  const quota = meta?.quota;
  const used = meta?.used ?? 0;
  const lead = types[0];
  return (
    <div className="fc-card fc-hero-in" style={{ padding: 22 }}>
      <div className="fc-row" style={{ justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
        <p className="kicker" style={{ margin: 0 }}>Paperwork</p>
        {meta && (
          <span className="mono" style={{ fontSize: 11.5, color: "var(--slate)" }}>
            {quota === null ? `${used} in the last 30 days · ${quotaLabel(meta.tier)}` : `${used} of ${quota} in the last 30 days`}
          </span>
        )}
      </div>

      {docs.length === 0 ? (
        <div className="fc-scene fc-scene--ink" style={{ marginTop: 14, padding: "clamp(14px,2.4vw,24px)" }}>
          <div className="fc-scene__card" style={{ padding: "clamp(18px,3vw,28px)", textAlign: "center" }}>
            <h3 className="serif" style={{ fontSize: 22, margin: 0 }}>
              {lead.empty.headline} <span className="italic-serif">{lead.empty.em}</span>
            </h3>
            <p className="muted" style={{ marginTop: 8, fontSize: 14.5, maxWidth: "48ch", marginInline: "auto" }}>
              {lead.empty.body}
            </p>
            <div className="fc-row" style={{ gap: 10, marginTop: 16, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={() => createDoc(lead.key, undefined, undefined, "empty_state")} disabled={busy === "new" || meta?.canCreate === false} className="fc-btn fc-btn--primary fc-btn--hairline">
                {busy === "new" ? "Starting…" : lead.empty.cta}
              </button>
              {types.length > 1 && (
                <button onClick={() => setState("picker")} className="fc-btn fc-btn--quiet">Other documents</button>
              )}
            </div>
            <p className="muted small" style={{ marginTop: 12 }}>
              Your details and CEA registration are already in it. One deal, one chain: the tenancy agreement fills itself from the letter of intent.
            </p>
            {meta?.canCreate === false && (
              <p className="small" style={{ marginTop: 12, color: "var(--slate)" }}>
                You have used your {quota} for the last 30 days.{" "}
                {onUpgrade && <button onClick={onUpgrade} className="linklike" style={{ color: "var(--blue)", fontWeight: 600, border: "none", background: "none", cursor: "pointer" }}>Upgrade for more</button>}
              </p>
            )}
            {notice && <p className="small" style={{ marginTop: 10, color: "var(--danger)" }}>{notice}</p>}
          </div>
        </div>
      ) : (
        <>
          <div className="fc-row" style={{ justifyContent: "space-between", alignItems: "center", marginTop: 14, marginBottom: 12, gap: 8, flexWrap: "wrap" }}>
            <p className="muted small" style={{ margin: 0 }}>Your documents are private and stored to your account.</p>
            <button onClick={() => setState("picker")} disabled={meta?.canCreate === false} className="fc-btn fc-btn--primary fc-btn--sm fc-btn--hairline">
              New document
            </button>
          </div>
          {meta?.canCreate === false && (
            <p className="small" style={{ margin: "0 0 10px", color: "var(--slate)" }}>
              You have used all {quota} for the last 30 days.{" "}
              {onUpgrade && <button onClick={onUpgrade} className="linklike" style={{ color: "var(--blue)", fontWeight: 600, border: "none", background: "none", cursor: "pointer" }}>Upgrade for more</button>}
            </p>
          )}
          {notice && <p className="small" style={{ margin: "0 0 10px", color: "var(--danger)" }}>{notice}</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {docs.map((d, i) => (
              <div key={d.id} className="fc-card fc-reveal" style={{ ["--reveal-delay" as string]: `${Math.min(i * 0.04, 0.4)}s`, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, background: "#fff" }}>
                <button onClick={() => openExisting(d.id)} style={{ border: "none", background: "none", cursor: "pointer", textAlign: "left", flex: 1, minWidth: 0, padding: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.title}</div>
                  <div className="muted small" style={{ marginTop: 2 }}>
                    {docTypeByKey(d.doc_type)?.label ?? "Document"}
                    {d.linked_document_id ? " · from the letter of intent" : ""}
                    {" · updated "}
                    {new Date(d.updated_at).toLocaleDateString("en-SG", { day: "numeric", month: "short" })}
                  </div>
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

const STATUS_NOTICE: Record<string, string> = {
  finalised: "Marked ready to sign.",
  sent: "Marked as sent out.",
  signed: "Marked as signed. The next document in the deal is below.",
  draft: "Back to draft. You can edit it again.",
  void: "Voided.",
};

function SectionBlock({ section, index, fields, setFields, readOnly }: { section: Section; index: number; fields: Record<string, string>; setFields: (f: Record<string, string>) => void; readOnly?: boolean }) {
  const collapsed = section.fields.some((f) => f.group === "agent" || f.group === "advanced");
  const [open, setOpen] = useState(!collapsed);
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
            if (f.showIf && (fields[f.showIf.key] ?? "") !== f.showIf.equals) return null;
            return <Field key={f.key} def={f} value={fields[f.key] ?? f.default ?? ""} onChange={(v) => set(f.key, v)} readOnly={readOnly} />;
          })}
        </div>
      )}
    </div>
  );
}

function Field({ def, value, onChange, readOnly }: { def: FieldDef; value: string; onChange: (v: string) => void; readOnly?: boolean }) {
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
        <button type="button" disabled={readOnly} onClick={() => onChange(on ? "false" : "true")} className="fc-row" style={{ gap: 10, alignItems: "center", border: "none", background: "none", cursor: readOnly ? "default" : "pointer", padding: 0, opacity: readOnly ? 0.7 : 1, textAlign: "left" }}>
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
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={def.placeholder} disabled={readOnly} className="fc-textarea" style={{ width: "100%", minHeight: 64, fontSize: 13.5 }} />
      ) : def.type === "select" ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} disabled={readOnly} className="fc-input" style={{ width: "100%", fontSize: 13.5 }}>
          <option value="">Select…</option>
          {(def.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : def.type === "money" ? (
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--slate)", fontSize: 13 }}>S$</span>
          <input value={value} onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" placeholder={def.placeholder} disabled={readOnly} className="fc-input" style={{ width: "100%", fontSize: 13.5, paddingLeft: 30 }} />
        </div>
      ) : (
        <input
          type={def.type === "date" ? "date" : def.type === "number" ? "number" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={def.placeholder}
          disabled={readOnly}
          className="fc-input"
          style={{ width: "100%", fontSize: 13.5 }}
        />
      )}
      {hint}
    </div>
  );
}
