import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase";
import { getAgentSession } from "../../../../lib/agent-auth";
import { DOCUMENT_QUOTA, docTypeByKey, isEditable } from "../../../../lib/documents";
import { logPaperworkFinalised, logPaperworkStatus } from "../../../../lib/documents/activation";
import type { DocFields } from "../../../../lib/documents/schema";
import type { Tier } from "../../../../lib/tiers";

// Single-document read / update / delete. Every call re-checks row ownership
// against the session's agentId; a document can only ever be touched by the
// agent who owns it.
//
// LIFECYCLE. draft is the only editable state: once an agent marks a document
// ready to sign, its content stops moving under them, and "Back to draft" is
// the explicit way to change something. sent and signed are self-reported by
// the agent (Phase 2c drives them from real signatures instead); they are the
// only signal that a document actually left the building.

type Props = { params: Promise<{ id: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Allowed status moves. Forward progress plus a single-step undo for a
// misclick; anything else goes through void.
const TRANSITIONS: Record<string, string[]> = {
  draft: ["finalised", "void"],
  finalised: ["draft", "sent", "void"],
  sent: ["finalised", "signed", "void"],
  signed: ["sent", "void"],
  void: ["draft", "finalised"],
};

async function ownDoc(agentId: number, id: string) {
  if (!UUID.test(id)) return null;
  const { data } = await supabaseAdmin()
    .from("sg_documents")
    .select("id, agent_id, doc_type, template_key, title, status, fields, pdf_path, linked_document_id, updated_at, created_at")
    .eq("id", id)
    .eq("agent_id", agentId)
    .maybeSingle();
  return data ?? null;
}

export async function GET(_req: Request, { params }: Props) {
  const session = await getAgentSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { id } = await params;
  const doc = await ownDoc(session.agentId, id);
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ document: doc });
}

export async function PATCH(req: Request, { params }: Props) {
  const session = await getAgentSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (session.impersonatedBy) {
    return NextResponse.json({ error: "Document actions are disabled during admin impersonation." }, { status: 403 });
  }
  const { id } = await params;
  const doc = await ownDoc(session.agentId, id);
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const dt = docTypeByKey(doc.doc_type);
  if (!dt) return NextResponse.json({ error: "Unknown document type." }, { status: 400 });

  const body = (await req.json().catch(() => ({}))) as { fields?: DocFields; title?: string; status?: string };
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const wantsContentChange = Boolean(body.fields) || typeof body.title === "string";

  // Content is frozen outside draft. Saving while the client still thinks the
  // document is editable must not silently no-op, so it is an explicit error.
  if (wantsContentChange && !isEditable(doc.status)) {
    return NextResponse.json(
      { error: "This document is no longer a draft. Move it back to draft to change it.", locked: true },
      { status: 409 }
    );
  }

  if (body.fields && typeof body.fields === "object") {
    // Whitelist against THIS document type's schema; coerce everything to
    // trimmed strings so stored `fields` can never carry unexpected shapes
    // into the renderer.
    const allowed = new Set(dt.fieldKeys);
    const merged: DocFields = { ...(doc.fields as DocFields) };
    for (const [k, v] of Object.entries(body.fields)) {
      if (!allowed.has(k)) continue;
      merged[k] = typeof v === "boolean" ? (v ? "true" : "false") : String(v ?? "").slice(0, 4000).trim();
    }
    update.fields = merged;
  }
  if (typeof body.title === "string" && body.title.trim()) update.title = body.title.trim().slice(0, 160);

  if (body.status && body.status !== doc.status) {
    const allowedNext = TRANSITIONS[doc.status] ?? [];
    if (!allowedNext.includes(body.status)) {
      return NextResponse.json({ error: `Cannot move a ${doc.status} document to ${body.status}.` }, { status: 400 });
    }
    // Un-voiding a document re-enters the live count, so it must respect the
    // same monthly cap the create path enforces (else void/create/un-void
    // would let an agent hold more live documents than their tier allows).
    if (doc.status === "void") {
      const sb = supabaseAdmin();
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const [{ data: agent }, { count }] = await Promise.all([
        sb.from("sg_agents").select("subscription_tier").eq("id", session.agentId).single(),
        sb.from("sg_documents").select("id", { count: "exact", head: true }).eq("agent_id", session.agentId).neq("status", "void").gte("created_at", since),
      ]);
      const tier = (agent?.subscription_tier ?? "free") as Tier;
      const quota = DOCUMENT_QUOTA[tier] ?? DOCUMENT_QUOTA.free;
      if ((count ?? 0) >= quota) {
        return NextResponse.json({ error: "Reactivating this document would exceed your monthly limit.", upgrade: true }, { status: 403 });
      }
    }
    update.status = body.status;
  }

  const { data, error } = await supabaseAdmin()
    .from("sg_documents")
    .update(update)
    .eq("id", id)
    .eq("agent_id", session.agentId)
    .select("id, doc_type, template_key, title, status, fields, linked_document_id, updated_at, created_at")
    .single();
  if (error || !data) {
    console.error("[documents] save failed", error);
    return NextResponse.json({ error: "Could not save." }, { status: 500 });
  }

  const sb = supabaseAdmin();
  const nextStatus = typeof update.status === "string" ? update.status : null;
  // The document's own audit trail always records what happened. The FUNNEL is
  // the operator's read of real agent behaviour, so sandbox accounts stay out
  // of it: a test document must never move an activation metric.
  const { data: owner } = await sb.from("sg_agents").select("is_sandbox").eq("id", session.agentId).single();
  const countable = owner?.is_sandbox !== true;

  if (nextStatus) {
    await sb.from("sg_document_events").insert({
      document_id: id,
      event: nextStatus === "void" ? "voided" : nextStatus,
      actor: session.email,
      metadata: { from: doc.status },
    });
    if (countable) {
      await logPaperworkStatus(sb, {
        agentId: session.agentId,
        documentId: id,
        docType: doc.doc_type,
        from: doc.status,
        to: nextStatus,
      });
      if (nextStatus === "finalised" && doc.status !== "finalised") {
        await logPaperworkFinalised(sb, {
          agentId: session.agentId,
          documentId: id,
          docType: doc.doc_type,
          fields: (data.fields ?? null) as DocFields | null,
        });
      }
    }
  } else if (update.fields) {
    await sb.from("sg_document_events").insert({ document_id: id, event: "edited", actor: session.email });
  }

  return NextResponse.json({ document: data });
}

export async function DELETE(_req: Request, { params }: Props) {
  const session = await getAgentSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (session.impersonatedBy) {
    return NextResponse.json({ error: "Document actions are disabled during admin impersonation." }, { status: 403 });
  }
  const { id } = await params;
  const doc = await ownDoc(session.agentId, id);
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // A document the agent reports as signed is a record of a real transaction:
  // deleting it would destroy its event trail with it. Void keeps the record
  // and frees the quota slot.
  if (doc.status === "signed") {
    return NextResponse.json(
      { error: "A signed document cannot be deleted. Mark it void instead: the record stays, the slot is freed." },
      { status: 409 }
    );
  }

  const sb = supabaseAdmin();
  // Remove the stored PDF first (best effort), then the row (events cascade).
  if (doc.pdf_path) await sb.storage.from("agent-documents").remove([doc.pdf_path]).catch(() => {});
  const { error } = await sb.from("sg_documents").delete().eq("id", id).eq("agent_id", session.agentId);
  if (error) return NextResponse.json({ error: "Could not delete." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
