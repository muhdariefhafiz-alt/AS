import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { getAgentSession } from "../../../lib/agent-auth";
import { DOCUMENT_QUOTA, docTypeByKey, availableDocTypes } from "../../../lib/documents";
import { buildPrefill } from "../../../lib/documents/prefill";
import { tenancyTitle } from "../../../lib/documents/tenancy";
import type { Tier } from "../../../lib/tiers";

// Paperwork documents CRUD for the agent dashboard. Service-role writes after
// the fc_agent session check (the dashboard is claimed-agents only, so the
// tool is never exposed to an unidentified agent). Administrative SaaS only:
// nothing here touches score, rank or lead flow. Quota = non-void documents
// created in the trailing 30 days (delete reclaims). Party PII lives in these
// rows + the private agent-documents bucket, never public.

const LIST_COLS = "id, doc_type, template_key, title, status, updated_at, created_at";
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

export async function GET() {
  const session = await getAgentSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const sb = supabaseAdmin();
  const [{ data: documents }, m] = await Promise.all([
    sb.from("sg_documents").select(LIST_COLS).eq("agent_id", session.agentId).order("updated_at", { ascending: false }),
    meta(session.agentId),
  ]);
  return NextResponse.json({
    documents: documents ?? [],
    tier: m.tier,
    quota: m.quota === Number.POSITIVE_INFINITY ? null : m.quota,
    used: m.used,
    canCreate: m.canCreate,
    docTypes: availableDocTypes(),
  });
}

export async function POST(req: Request) {
  const session = await getAgentSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (session.impersonatedBy) {
    return NextResponse.json({ error: "Document actions are disabled during admin impersonation." }, { status: 403 });
  }
  const sb = supabaseAdmin();

  const body = (await req.json().catch(() => ({}))) as { docType?: string };
  const dt = body.docType ? docTypeByKey(body.docType) : undefined;
  if (!dt || !dt.available) {
    return NextResponse.json({ error: "Unknown document type." }, { status: 400 });
  }

  const m = await meta(session.agentId);
  if (!m.canCreate) {
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

  const fields = buildPrefill(agent);
  const title = tenancyTitle(fields);

  const { data: doc, error } = await sb
    .from("sg_documents")
    .insert({ agent_id: session.agentId, doc_type: dt.key, template_key: dt.templateKey, title, status: "draft", fields })
    .select("id, doc_type, template_key, title, status, fields, updated_at, created_at")
    .single();
  if (error || !doc) return NextResponse.json({ error: "Could not create document." }, { status: 500 });

  await sb.from("sg_document_events").insert({ document_id: doc.id, event: "created", actor: session.email });
  if (!m.isSandbox) {
    await sb.from("sg_funnel_events").insert({ event: "paperwork_started", agent_id: session.agentId, metadata: { doc_type: dt.key } });
  }

  return NextResponse.json({ document: doc });
}
