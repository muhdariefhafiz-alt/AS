import type { SupabaseClient } from "@supabase/supabase-js";

// Paperwork activation instrumentation. SERVER ONLY (never imported by the
// registry, which the dashboard bundles).
//
// Mirrors lib/inbox-activation.ts: Setup / Aha / Habit are logged at most once
// per agent so funnel rates measure against the claimed-agent denominator, and
// every occurrence event carries doc_type so per-template adoption is readable.
//
// Frequency reality check: an agent papers a rental deal a few times a month,
// so Habit is scored over 60 days across DISTINCT properties. A 14-day window
// (right for lead replies) would report false negatives forever here.

const HABIT_WINDOW_MS = 60 * 24 * 60 * 60 * 1000;

async function hasFunnelEvent(sb: SupabaseClient, agentId: number, event: string): Promise<boolean> {
  const { count } = await sb
    .from("sg_funnel_events")
    .select("id", { count: "exact", head: true })
    .eq("agent_id", agentId)
    .eq("event", event);
  return (count ?? 0) > 0;
}

export async function logPaperwork(
  sb: SupabaseClient,
  agentId: number,
  event: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  try {
    await sb.from("sg_funnel_events").insert({
      event,
      agent_id: agentId,
      source: "dashboard",
      page_path: "/dashboard",
      metadata,
    });
  } catch (e) {
    console.error("[paperwork-activation] log failed", event, e);
  }
}

async function logOnce(
  sb: SupabaseClient,
  agentId: number,
  event: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  if (await hasFunnelEvent(sb, agentId, event)) return;
  await logPaperwork(sb, agentId, event, metadata);
}

// SETUP: the letterhead is renderable, i.e. the agent's profile carries the
// name and CEA registration every template prints. Logged once, the first time
// they open the tool with a usable letterhead.
export async function logPaperworkSetup(
  sb: SupabaseClient,
  agentId: number,
  opts: { hasName: boolean; hasCea: boolean }
): Promise<void> {
  try {
    if (!opts.hasName || !opts.hasCea) return;
    await logOnce(sb, agentId, "paperwork_setup", {});
  } catch (e) {
    console.error("[paperwork-activation] setup failed", e);
  }
}

// A document is only "real" once it names a property and a counterparty. That
// distinction is what stops a poked-at empty draft from counting as activation.
export function isRealDocument(fields: Record<string, string> | null | undefined): boolean {
  const f = fields ?? {};
  const address = (f.premises_address ?? "").trim();
  const party = (f.tenant_name ?? "").trim() || (f.landlord_name ?? "").trim();
  return address.length > 2 && party.length > 1;
}

function propertyKey(fields: Record<string, string> | null | undefined): string {
  return ((fields ?? {}).premises_address ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// FINALISED: the Aha and Habit signal. Aha = the first document that reaches
// finalised with a real property and counterparty. Habit = 3 finalised
// documents across 2+ distinct properties inside 60 days.
export async function logPaperworkFinalised(
  sb: SupabaseClient,
  opts: { agentId: number; documentId: string; docType: string; fields: Record<string, string> | null }
): Promise<void> {
  const { agentId, documentId, docType, fields } = opts;
  try {
    const real = isRealDocument(fields);
    await logPaperwork(sb, agentId, "paperwork_finalised", { doc_type: docType, document_id: documentId, real });
    if (!real) return;

    await logOnce(sb, agentId, "paperwork_aha", { doc_type: docType, document_id: documentId });

    if (!(await hasFunnelEvent(sb, agentId, "paperwork_habit"))) {
      const since = new Date(Date.now() - HABIT_WINDOW_MS).toISOString();
      const { data } = await sb
        .from("sg_documents")
        .select("id, fields")
        .eq("agent_id", agentId)
        .in("status", ["finalised", "sent", "signed"])
        .gte("updated_at", since);
      const rows = (data ?? []).filter((r) => isRealDocument(r.fields as Record<string, string>));
      const properties = new Set(rows.map((r) => propertyKey(r.fields as Record<string, string>)).filter(Boolean));
      if (rows.length >= 3 && properties.size >= 2) {
        await logPaperwork(sb, agentId, "paperwork_habit", {
          finalised_60d: rows.length,
          distinct_properties: properties.size,
        });
      }
    }
  } catch (e) {
    console.error("[paperwork-activation] finalised failed", e);
  }
}

// CHAIN: the retention loop. The second document in a deal costs the agent
// almost nothing, which is the whole bet of this phase, so its first use is
// worth an idempotent milestone alongside the per-occurrence event.
export async function logPaperworkChained(
  sb: SupabaseClient,
  opts: { agentId: number; fromDocType: string; toDocType: string; fieldsCarried: number; documentId: string }
): Promise<void> {
  try {
    await logPaperwork(sb, opts.agentId, "paperwork_chained", {
      from_doc_type: opts.fromDocType,
      doc_type: opts.toDocType,
      fields_carried: opts.fieldsCarried,
      document_id: opts.documentId,
    });
    await logOnce(sb, opts.agentId, "paperwork_chain_aha", { from_doc_type: opts.fromDocType, doc_type: opts.toDocType });
  } catch (e) {
    console.error("[paperwork-activation] chained failed", e);
  }
}

// STATUS: sent / signed are self-reported by the agent. They are the only
// signal that a document left the building, which is the counter-metric that
// tells us whether we built a real tool or a toy that gets poked once.
export async function logPaperworkStatus(
  sb: SupabaseClient,
  opts: { agentId: number; documentId: string; docType: string; from: string; to: string }
): Promise<void> {
  try {
    await logPaperwork(sb, opts.agentId, "paperwork_status_changed", {
      document_id: opts.documentId,
      doc_type: opts.docType,
      from: opts.from,
      to: opts.to,
    });
    if (opts.to === "sent") await logOnce(sb, opts.agentId, "paperwork_first_sent", { doc_type: opts.docType });
    if (opts.to === "signed") await logOnce(sb, opts.agentId, "paperwork_first_signed", { doc_type: opts.docType });
  } catch (e) {
    console.error("[paperwork-activation] status failed", e);
  }
}
