import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase";
import { getAgentSession } from "../../../../lib/agent-auth";
import { TENANCY_FIELD_KEYS, type DocFields } from "../../../../lib/documents/tenancy";
import { DOCUMENT_QUOTA } from "../../../../lib/documents";
import type { Tier } from "../../../../lib/tiers";

// Single-document read / update / delete. Every call re-checks row ownership
// against the session's agentId; a document can only ever be touched by the
// agent who owns it.

type Props = { params: Promise<{ id: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function ownDoc(agentId: number, id: string) {
  if (!UUID.test(id)) return null;
  const { data } = await supabaseAdmin()
    .from("sg_documents")
    .select("id, agent_id, doc_type, template_key, title, status, fields, pdf_path, updated_at, created_at")
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

  const body = (await req.json().catch(() => ({}))) as { fields?: DocFields; title?: string; status?: string };
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.fields && typeof body.fields === "object") {
    // Whitelist known field keys; coerce everything to trimmed strings so the
    // stored `fields` can never carry unexpected shapes into the renderer.
    const merged: DocFields = { ...(doc.fields as DocFields) };
    for (const [k, v] of Object.entries(body.fields)) {
      if (!TENANCY_FIELD_KEYS.includes(k)) continue;
      merged[k] = typeof v === "boolean" ? (v ? "true" : "false") : String(v ?? "").slice(0, 4000).trim();
    }
    update.fields = merged;
  }
  if (typeof body.title === "string" && body.title.trim()) update.title = body.title.trim().slice(0, 160);
  if (body.status && ["draft", "finalised", "void"].includes(body.status)) {
    // Un-voiding a document re-enters the live count, so it must respect the
    // same monthly cap the create path enforces (else void/create/un-void
    // would let an agent hold more live documents than their tier allows).
    if (doc.status === "void" && body.status !== "void") {
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
    .select("id, doc_type, template_key, title, status, fields, updated_at, created_at")
    .single();
  if (error || !data) return NextResponse.json({ error: "Could not save." }, { status: 500 });

  if (body.status === "finalised" && doc.status !== "finalised") {
    await supabaseAdmin().from("sg_document_events").insert({ document_id: id, event: "finalised", actor: session.email });
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

  const sb = supabaseAdmin();
  // Remove the stored PDF first (best effort), then the row (events cascade).
  if (doc.pdf_path) await sb.storage.from("agent-documents").remove([doc.pdf_path]).catch(() => {});
  const { error } = await sb.from("sg_documents").delete().eq("id", id).eq("agent_id", session.agentId);
  if (error) return NextResponse.json({ error: "Could not delete." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
