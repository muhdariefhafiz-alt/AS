import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { getAgentSession } from "../../../lib/agent-auth";
import { DOCUMENT_QUOTA, docTypeByKey, availableDocTypes } from "../../../lib/documents";
import { buildPrefill } from "../../../lib/documents/prefill";
import { LOI_TO_TENANCY } from "../../../lib/documents/loi";
import { logPaperwork, logPaperworkChained, logPaperworkSetup } from "../../../lib/documents/activation";
import type { DocFields } from "../../../lib/documents/schema";
import type { Tier } from "../../../lib/tiers";

// Paperwork documents CRUD for the agent dashboard. Service-role writes after
// the fc_agent session check (the dashboard is claimed-agents only, so the
// tool is never exposed to an unidentified agent). Administrative SaaS only:
// nothing here touches score, rank or lead flow. Quota = non-void documents
// created in the trailing 30 days (delete reclaims). Party PII lives in these
// rows + the private agent-documents bucket, never public.
//
// Document TYPE behaviour is never branched on here: it comes from the registry
// (lib/documents/index.ts), so a new template needs no change to this route.

const LIST_COLS = "id, doc_type, template_key, title, status, linked_document_id, updated_at, created_at";
const WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

async function meta(agentId: number) {
  const sb = supabaseAdmin();
  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  const [{ data: agent }, { count }] = await Promise.all([
    sb.from("sg_agents").select("subscription_tier, is_sandbox").eq("id", agentId).single(),
    sb.from("sg_documents").select("id", { count: "exact", head: true }).eq("agent_id", agentId).neq("status", "void").gte("created_at", since),
  ]);
  const tier = (agent?.subscription_tier ?? "free") as Tier;
  const quota = DOCUMENT_QUOTA[tier] ?? DOCUMENT_QUOTA.free;
  const used = count ?? 0;
  return { tier, quota, used, canCreate: used < quota, isSandbox: agent?.is_sandbox === true };
}

export async function GET(req: Request) {
  const session = await getAgentSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const sb = supabaseAdmin();
  // Home's first-run card reads the list to decide whether to show itself.
  // Seeing a card about the tool is not opening the tool, so it must not count
  // as a view.
  const source = new URL(req.url).searchParams.get("source") ?? "tab";
  const [{ data: documents }, m, { data: agent }] = await Promise.all([
    sb.from("sg_documents").select(LIST_COLS).eq("agent_id", session.agentId).order("updated_at", { ascending: false }),
    meta(session.agentId),
    sb.from("sg_agents").select("name, cea_registration").eq("id", session.agentId).single(),
  ]);

  // Opening the tool with a renderable letterhead is the Setup moment; the view
  // event carries the entry point so we can see which surface actually works.
  if (!m.isSandbox && !session.impersonatedBy) {
    await Promise.all([
      source === "home"
        ? Promise.resolve()
        : logPaperwork(sb, session.agentId, "paperwork_view", { documents: documents?.length ?? 0, source }),
      logPaperworkSetup(sb, session.agentId, {
        hasName: Boolean((agent?.name ?? "").trim()),
        hasCea: Boolean((agent?.cea_registration ?? "").trim()),
      }),
    ]);
  }

  return NextResponse.json({
    documents: documents ?? [],
    tier: m.tier,
    quota: m.quota === Number.POSITIVE_INFINITY ? null : m.quota,
    used: m.used,
    canCreate: m.canCreate,
    // The registry drives the picker. Functions are stripped by JSON, so the
    // panel imports the same registry directly for schemas and titles.
    docTypes: availableDocTypes().map((d) => ({ key: d.key, label: d.label, blurb: d.blurb, minutes: d.minutes })),
  });
}

export async function POST(req: Request) {
  const session = await getAgentSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (session.impersonatedBy) {
    return NextResponse.json({ error: "Document actions are disabled during admin impersonation." }, { status: 403 });
  }
  const sb = supabaseAdmin();

  const body = (await req.json().catch(() => ({}))) as {
    docType?: string;
    fromDocumentId?: string;
    seed?: Record<string, string>;
  };
  const dt = body.docType ? docTypeByKey(body.docType) : undefined;
  if (!dt || !dt.available) {
    return NextResponse.json({ error: "Unknown document type." }, { status: 400 });
  }

  const m = await meta(session.agentId);
  if (!m.canCreate) {
    // Log the block: this is the only way to tell "no demand" apart from "we
    // stopped them".
    if (!m.isSandbox) await logPaperwork(sb, session.agentId, "paperwork_quota_blocked", { tier: m.tier, doc_type: dt.key });
    return NextResponse.json(
      { error: `You have used all ${m.quota} documents on the ${m.tier} plan this month.`, upgrade: true },
      { status: 403 }
    );
  }

  const { data: agent } = await sb
    .from("sg_agents")
    .select("id, name, marketing_name, marketing_name_status, cea_registration, agency_name, whatsapp, claimed_email")
    .eq("id", session.agentId)
    .single();
  if (!agent) return NextResponse.json({ error: "No profile." }, { status: 404 });

  const fields = buildPrefill(agent, dt.key);

  // Context from the surface that started the document (e.g. the property on a
  // viewing the agent just held). Whitelisted against this type's schema.
  if (body.seed && typeof body.seed === "object") {
    const allowedSeed = new Set(dt.fieldKeys);
    for (const [k, v] of Object.entries(body.seed)) {
      if (!allowedSeed.has(k)) continue;
      const clean = String(v ?? "").slice(0, 4000).trim();
      if (clean) fields[k] = clean;
    }
  }

  // Chaining: carry a previous document's shared facts into this one. Only keys
  // that mean the same thing in both templates move across (LOI_TO_TENANCY);
  // deposits in transit, the letter's own deadline and the agency's protections
  // deliberately do not.
  let chainedFrom: { docType: string; carried: number } | null = null;
  let linkedId: string | null = null;
  if (body.fromDocumentId) {
    const { data: src } = await sb
      .from("sg_documents")
      .select("id, doc_type, fields")
      .eq("id", body.fromDocumentId)
      .eq("agent_id", session.agentId)
      .maybeSingle();
    if (!src) return NextResponse.json({ error: "Source document not found." }, { status: 404 });
    const map = src.doc_type === "loi" && dt.key === "tenancy_agreement" ? LOI_TO_TENANCY : null;
    if (!map) return NextResponse.json({ error: "Those document types do not chain." }, { status: 400 });

    const srcFields = (src.fields ?? {}) as DocFields;
    let carried = 0;
    const allowed = new Set(dt.fieldKeys);
    for (const [from, to] of Object.entries(map)) {
      const v = (srcFields[from] ?? "").trim();
      if (!v || !allowed.has(to)) continue;
      fields[to] = v;
      carried += 1;
    }
    chainedFrom = { docType: src.doc_type, carried };
    linkedId = src.id;
  }

  const title = dt.title(fields);

  const { data: doc, error } = await sb
    .from("sg_documents")
    .insert({
      agent_id: session.agentId,
      doc_type: dt.key,
      template_key: dt.templateKey,
      title,
      status: "draft",
      fields,
      linked_document_id: linkedId,
    })
    .select("id, doc_type, template_key, title, status, fields, linked_document_id, updated_at, created_at")
    .single();
  if (error || !doc) {
    console.error("[documents] create failed", error);
    return NextResponse.json({ error: "Could not create document." }, { status: 500 });
  }

  await sb.from("sg_document_events").insert({
    document_id: doc.id,
    event: "created",
    actor: session.email,
    metadata: chainedFrom ? { chained_from: linkedId, fields_carried: chainedFrom.carried } : null,
  });
  if (!m.isSandbox) {
    await logPaperwork(sb, session.agentId, "paperwork_started", {
      doc_type: dt.key,
      template_key: dt.templateKey,
      chained: Boolean(chainedFrom),
    });
    if (chainedFrom) {
      await logPaperworkChained(sb, {
        agentId: session.agentId,
        fromDocType: chainedFrom.docType,
        toDocType: dt.key,
        fieldsCarried: chainedFrom.carried,
        documentId: doc.id,
      });
    }
  }

  return NextResponse.json({ document: doc, carried: chainedFrom?.carried ?? 0 });
}
