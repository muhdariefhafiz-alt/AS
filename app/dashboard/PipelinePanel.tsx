"use client";

import { useCallback, useEffect, useState } from "react";
import { STAGE_LABEL, DEAL_STAGES, type DealStage } from "../lib/deals";

// The pipeline: every live deal, grouped by the stage it is actually at.
//
// This is the tab that replaced Leads, and the reason the dashboard stopped
// being a drawer of tools. An enquiry, the viewing it produced, the letter of
// intent written after that viewing and the tenancy agreement that follows are
// one piece of work about one flat. They used to live in three tabs with no
// shared key. Here they are one row that opens.

type Viewing = { id: string; property_label: string; viewing_at: string; attendee_name: string; status: string };
type Doc = { id: string; doc_type: string; title: string; status: string; updated_at: string };
type Deal = {
  id: string;
  stage: DealStage;
  property_label: string;
  postal_code: string | null;
  counterparty_name: string | null;
  counterparty_contact: string | null;
  side: string | null;
  rent_or_price: string | null;
  lost_reason: string | null;
  created_at: string;
  updated_at: string;
  viewings: Viewing[];
  documents: Doc[];
  next_action: string;
};

const LIVE_STAGES: DealStage[] = ["enquiry", "viewing", "offer", "agreement"];
const DOC_LABEL: Record<string, string> = { loi: "Letter of intent", tenancy_agreement: "Tenancy agreement" };
const DOC_STATUS: Record<string, string> = { draft: "Draft", finalised: "Ready to sign", sent: "Sent", signed: "Signed" };

function sinceDays(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}
function ageLabel(iso: string): string {
  const d = sinceDays(iso);
  if (d <= 0) return "today";
  if (d === 1) return "1 day";
  return `${d} days`;
}
function when(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-SG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

export default function PipelinePanel({
  onIssueDocument,
  onOpenDocument,
}: {
  onIssueDocument: (docType: string, seed: Record<string, string>, entry: string, fromDocumentId?: string) => void;
  onOpenDocument: (documentId: string) => void;
}) {
  const [deals, setDeals] = useState<Deal[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [busy, setBusy] = useState(false);

  const [failed, setFailed] = useState(false);
  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/deals");
      if (!res.ok) { setFailed(true); setDeals([]); return; }
      const j = await res.json();
      // "No deals yet" is a claim about the agent's work. A failed request is
      // not evidence for it, so a dropped session must never render as an empty
      // pipeline.
      setFailed(false);
      setDeals(Array.isArray(j.deals) ? j.deals : []);
    } catch {
      setFailed(true);
      setDeals([]);
    }
  }, []);
  // Deferred a tick so the async load's state writes are not flagged as a
  // synchronous setState in the effect body (same pattern as DocumentsPanel).
  useEffect(() => { queueMicrotask(() => { load(); }); }, [load]);

  async function startDeal() {
    if (!newLabel.trim() || busy) return;
    setBusy(true);
    const r = await fetch("/api/dashboard/deals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ property_label: newLabel }),
    }).then((x) => x.json()).catch(() => null);
    setBusy(false);
    if (r?.ok) {
      setNewLabel("");
      setAdding(false);
      setOpenId(r.id);
      load();
    }
  }

  async function setStage(id: string, stage: DealStage) {
    setBusy(true);
    await fetch("/api/dashboard/deals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, stage }),
    }).catch(() => {});
    setBusy(false);
    load();
  }

  if (deals === null) {
    return <div className="fc-card" style={{ padding: 18 }}><p className="muted small">Loading your deals…</p></div>;
  }
  if (failed) {
    return (
      <div className="fc-card" style={{ padding: 18 }}>
        <p style={{ fontWeight: 700, margin: 0 }}>We could not load your deals.</p>
        <p className="muted small" style={{ margin: "6px 0 12px" }}>
          Your session may have expired. Reload the page and sign in again.
        </p>
        <button type="button" className="fc-btn fc-btn--quiet fc-btn--sm" onClick={() => location.reload()}>Reload</button>
      </div>
    );
  }

  const live = deals.filter((d) => LIVE_STAGES.includes(d.stage));
  const closed = deals.filter((d) => d.stage === "completed" || d.stage === "lost");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
        <div>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em", margin: 0 }}>
            Your deals
          </h2>
          <p className="muted small" style={{ margin: "3px 0 0" }}>
            Each one is a property you are working. The stage moves itself when you issue a letter of intent or mark an agreement signed.
          </p>
        </div>
        {/* Only rendered when there is already a pipeline. With an empty list
            this button and EmptyPipeline's own CTA were two identical "Start a
            deal" controls 546px apart, and the lower one opened this form
            441px ABOVE the click with no scroll and no focus, so the agent
            tapped and nothing appeared to happen. One deal action per screen. */}
        {deals.length > 0 && (
          <button type="button" className="fc-btn fc-btn--quiet fc-btn--sm" onClick={() => setAdding((v) => !v)}>
            {adding ? "Cancel" : "Start a deal"}
          </button>
        )}
      </div>

      {adding && (
        <div className="fc-card" style={{ padding: 16, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>
          <div className="fc-field" style={{ flex: "1 1 260px" }}>
            <label className="fc-label" htmlFor="fc-new-deal">Which property?</label>
            <input
              id="fc-new-deal"
              className="fc-input"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") startDeal(); }}
              placeholder="Block, street, unit"
            />
          </div>
          <button type="button" className="fc-btn fc-btn--primary fc-btn--sm" onClick={startDeal} disabled={busy || !newLabel.trim()}>
            Start
          </button>
        </div>
      )}

      {!deals.length && !adding && <EmptyPipeline onStart={() => setAdding(true)} />}

      {LIVE_STAGES.map((stage) => {
        const rows = live.filter((d) => d.stage === stage);
        if (!rows.length) return null;
        return (
          <section key={stage}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, fontWeight: 600, letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--slate)", margin: "0 0 8px" }}>
              {STAGE_LABEL[stage]} · {rows.length}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {rows.map((d) => (
                <DealRow
                  key={d.id}
                  deal={d}
                  open={openId === d.id}
                  onToggle={() => setOpenId(openId === d.id ? null : d.id)}
                  onIssueDocument={onIssueDocument}
                  onOpenDocument={onOpenDocument}
                  onSetStage={setStage}
                  busy={busy}
                />
              ))}
            </div>
          </section>
        );
      })}

      {closed.length > 0 && (
        <details>
          <summary className="small" style={{ cursor: "pointer", color: "var(--slate)", fontWeight: 600 }}>
            Closed ({closed.length})
          </summary>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
            {closed.map((d) => (
              <div key={d.id} className="fc-card" style={{ padding: "12px 14px", opacity: 0.75 }}>
                <div style={{ fontWeight: 700, fontSize: 14.5 }}>{d.property_label}</div>
                <p className="muted small" style={{ margin: "2px 0 0" }}>
                  {STAGE_LABEL[d.stage]}{d.lost_reason ? ` · ${d.lost_reason}` : ""}
                </p>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function DealRow({
  deal, open, onToggle, onIssueDocument, onOpenDocument, onSetStage, busy,
}: {
  deal: Deal;
  open: boolean;
  onToggle: () => void;
  onIssueDocument: (docType: string, seed: Record<string, string>, entry: string, fromDocumentId?: string) => void;
  onOpenDocument: (documentId: string) => void;
  onSetStage: (id: string, stage: DealStage) => void;
  busy: boolean;
}) {
  const loi = deal.documents.find((x) => x.doc_type === "loi");
  const ta = deal.documents.find((x) => x.doc_type === "tenancy_agreement");
  const stale = sinceDays(deal.updated_at) >= 14;

  // The primary control is whatever the stage actually needs next, so the agent
  // never has to work out which tool this deal is waiting on.
  function primary() {
    if (deal.stage === "offer" && loi && loi.status !== "draft" && !ta) {
      return { label: "Create the tenancy agreement", run: () => onIssueDocument("tenancy_agreement", {}, "chain", loi.id) };
    }
    if (ta) return { label: "Open the tenancy agreement", run: () => onOpenDocument(ta.id) };
    if (loi) return { label: "Open the letter of intent", run: () => onOpenDocument(loi.id) };
    return {
      label: "Issue a letter of intent",
      run: () => onIssueDocument("loi", { premises_address: deal.property_label, ...(deal.counterparty_name ? { tenant_name: deal.counterparty_name } : {}) }, "viewing_row"),
    };
  }
  const action = primary();

  return (
    <div className="fc-card" style={{ padding: "13px 15px" }}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        style={{ display: "flex", width: "100%", gap: 12, alignItems: "baseline", justifyContent: "space-between", background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}
      >
        <span style={{ minWidth: 0 }}>
          <span style={{ display: "block", fontWeight: 700, fontSize: 15, color: "var(--ink)" }}>{deal.property_label}</span>
          <span className="muted small" style={{ display: "block", marginTop: 2 }}>
            {deal.counterparty_name ? `${deal.counterparty_name} · ` : ""}{deal.next_action}
          </span>
        </span>
        <span className="small" style={{ color: stale ? "var(--warn)" : "var(--slate)", whiteSpace: "nowrap", fontWeight: 600 }}>
          {ageLabel(deal.updated_at)}
        </span>
      </button>

      {open && (
        <div style={{ marginTop: 12, borderTop: "1px solid var(--line)", paddingTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
          {deal.viewings.length > 0 && (
            <div>
              <p className="muted small" style={{ margin: "0 0 4px", fontWeight: 600 }}>Viewings</p>
              {deal.viewings.map((v) => (
                <p key={v.id} className="small" style={{ margin: "2px 0", color: "var(--ink-3)" }}>
                  {when(v.viewing_at)} · {v.attendee_name} · {v.status}
                </p>
              ))}
            </div>
          )}

          {deal.documents.length > 0 && (
            <div>
              <p className="muted small" style={{ margin: "0 0 4px", fontWeight: 600 }}>Documents</p>
              {deal.documents.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => onOpenDocument(doc.id)}
                  className="small"
                  style={{ display: "block", background: "none", border: "none", padding: "2px 0", cursor: "pointer", color: "var(--blue)", fontWeight: 600, textAlign: "left" }}
                >
                  {DOC_LABEL[doc.doc_type] ?? doc.doc_type} · {DOC_STATUS[doc.status] ?? doc.status}
                </button>
              ))}
            </div>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
            <button type="button" className="fc-btn fc-btn--primary fc-btn--sm" onClick={action.run}>
              {action.label}
            </button>
            {deal.stage === "agreement" && (
              <button type="button" className="fc-btn fc-btn--quiet fc-btn--sm" disabled={busy} onClick={() => onSetStage(deal.id, "completed")}>
                Mark completed
              </button>
            )}
            <button
              type="button"
              className="small"
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--slate)", textDecoration: "underline", fontWeight: 600 }}
              disabled={busy}
              onClick={() => { if (confirm("Mark this deal lost? It moves to Closed and stops appearing in your pipeline.")) onSetStage(deal.id, "lost"); }}
            >
              Mark lost
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// No fake sample deals. An empty pipeline explains the loop and offers the two
// real ways to start one.
function EmptyPipeline({ onStart }: { onStart: () => void }) {
  const steps: [DealStage, string][] = [
    ["enquiry", "Someone asks about a property, or you start it yourself."],
    ["viewing", "A viewing is booked. The deal moves here on its own."],
    ["offer", "You issue a letter of intent on your own letterhead."],
    ["agreement", "The tenancy agreement starts from that letter."],
    ["completed", "The lease starts and the deal closes."],
  ];
  return (
    <div className="fc-card" style={{ padding: 20 }}>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, fontWeight: 600, letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--blue)", margin: 0 }}>
        No deals yet
      </p>
      <h3 style={{ fontFamily: "var(--font-serif)", fontSize: 21, fontWeight: 600, letterSpacing: "-0.02em", margin: "8px 0 4px" }}>
        A deal is one property you are working.
      </h3>
      <p className="small" style={{ color: "var(--ink-3)", margin: "0 0 14px", lineHeight: 1.55 }}>
        You will rarely start one by hand. A booked viewing or a letter of intent creates it for you, and everything about that property collects here.
      </p>
      <ol style={{ margin: "0 0 16px", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 7 }}>
        {steps.map(([stage, line]) => (
          <li key={stage} style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, fontWeight: 600, color: "var(--slate)", minWidth: 84 }}>
              {STAGE_LABEL[stage]}
            </span>
            <span className="small" style={{ color: "var(--ink-3)" }}>{line}</span>
          </li>
        ))}
      </ol>
      <button type="button" className="fc-btn fc-btn--primary fc-btn--sm" onClick={onStart}>
        Start a deal
      </button>
    </div>
  );
}

export { DEAL_STAGES };
