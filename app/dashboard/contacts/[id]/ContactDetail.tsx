"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DraftReply from "../../DraftReply";
import AgentProof, { type Proof } from "./AgentProof";
import Timeline, { type TimelineItem } from "./Timeline";
import ContactHeader from "./ContactHeader";
import { INBOX_LABELS, type InboxLabel } from "../../../lib/inbox-labels";

export type Lead = {
  id: number;
  property_type: string;
  town: string | null;
  district_code: string | null;
  bedrooms: number | null;
  est_value_low: number | null;
  est_value_high: number | null;
  timeline: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
};

export type Shortlist = {
  id: number;
  status: string;
  invited_at: string | null;
  quoted_at: string | null;
  picked_at: string | null;
  first_reply_at: string | null;
};

type Props = {
  shortlist: Shortlist;
  lead: Lead;
  proof: Proof;
  timeline: TimelineItem[];
  labels: InboxLabel[];
};

export default function ContactDetail({ shortlist, lead, proof, timeline: initialTimeline, labels: initialLabels }: Props) {
  const router = useRouter();
  const [labels, setLabels] = useState<InboxLabel[]>(initialLabels);
  const [timeline, setTimeline] = useState<TimelineItem[]>(initialTimeline);
  const [note, setNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [busyLabel, setBusyLabel] = useState<InboxLabel | null>(null);

  // router.refresh() re-runs the server component and passes fresh props, but
  // React keeps useState across a refresh. Re-sync so a "Mark as replied" (which
  // adds the reply milestone server-side) and any newly-arrived inbound email
  // actually appear. The server is the source of truth; persisted notes come
  // back in initialTimeline, so this does not lose them.
  useEffect(() => {
    setTimeline(initialTimeline);
  }, [initialTimeline]);
  useEffect(() => {
    setLabels(initialLabels);
  }, [initialLabels]);

  async function toggleLabel(label: InboxLabel) {
    const active = labels.includes(label);
    const next = active ? labels.filter((l) => l !== label) : [...labels, label];
    setLabels(next); // optimistic
    setBusyLabel(label);
    try {
      const res = await fetch("/api/dashboard/labels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shortlist_id: shortlist.id, label, action: active ? "remove" : "add" }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(j.labels)) setLabels(j.labels);
    } catch {
      setLabels(labels); // revert
    } finally {
      setBusyLabel(null);
    }
  }

  async function saveNote() {
    const text = note.trim();
    if (!text || savingNote) return;
    setSavingNote(true);
    try {
      const res = await fetch("/api/dashboard/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shortlist_id: shortlist.id, text }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j.event) {
        setTimeline((t) =>
          [
            {
              id: `ev-${j.event.id}`,
              event_type: "agent_note",
              at: j.event.created_at as string,
              meta: j.event.meta as Record<string, unknown>,
            },
            ...t,
          ].sort((a, b) => new Date(b.at ?? 0).getTime() - new Date(a.at ?? 0).getTime()),
        );
        setNote("");
      }
    } finally {
      setSavingNote(false);
    }
  }

  function onReplied() {
    // The header stamped first_reply_at server-side; refresh to reflect it in
    // the timeline + reply-timing line.
    router.refresh();
  }

  return (
    <div style={{ background: "var(--cloud)", minHeight: "100vh" }}>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "var(--paper)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <div style={{ maxWidth: 920, margin: "0 auto", padding: "14px 20px" }}>
          <Link href="/dashboard?tab=leads" className="fc-btn fc-btn--quiet fc-btn--sm">
            ← Back to inbox
          </Link>
        </div>
      </div>

      <main style={{ maxWidth: 920, margin: "0 auto", padding: "24px 20px", display: "grid", gap: 20 }}>
        <ContactHeader
          lead={lead}
          shortlist={shortlist}
          labels={labels}
          allLabels={INBOX_LABELS}
          busyLabel={busyLabel}
          onToggleLabel={toggleLabel}
          onReplied={onReplied}
        />

        <AgentProof proof={proof} propertyType={lead.property_type} />

        {/* Draft a first reply, grounded in the record (free allowance metered
            server-side). The agent edits and sends via their own channel. */}
        <section className="fc-card fc-card--pad">
          <div className="kicker" style={{ marginBottom: 8 }}>Reply</div>
          <DraftReply shortlistId={shortlist.id} />
        </section>

        <section className="fc-card fc-card--pad">
          <div className="kicker" style={{ marginBottom: 10 }}>Timeline</div>

          {/* Private note composer. Lands in the timeline as an agent_note. */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <input
              className="fc-input"
              style={{ flex: 1 }}
              placeholder="Add a private note (only you can see this)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveNote();
              }}
              maxLength={2000}
            />
            <button
              type="button"
              className="fc-btn fc-btn--ink fc-btn--sm"
              onClick={saveNote}
              disabled={!note.trim() || savingNote}
            >
              {savingNote ? "Saving…" : "Add note"}
            </button>
          </div>

          <Timeline items={timeline} />
        </section>
      </main>
    </div>
  );
}
