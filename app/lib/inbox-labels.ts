import type { SupabaseClient } from "@supabase/supabase-js";

// Per-agent labels on an inbox item (the sg_lead_shortlist row). A controlled
// vocabulary only, no free-tag surface, so labels stay a fast triage tool, not
// a taxonomy to manage. Labels are PRIVATE to the agent: the same lead is
// shortlisted to several agents, so keying on shortlist_id (1:1 with agent+lead)
// keeps one agent's "Hot" from leaking to a competitor. sg_lead_labels is
// service-role only (RLS enabled, no policy); callers pass a supabaseAdmin() client.

export const INBOX_LABELS = ["Hot", "Warm", "Cold", "Follow-up", "Closed"] as const;
export type InboxLabel = (typeof INBOX_LABELS)[number];

export function isInboxLabel(x: unknown): x is InboxLabel {
  return typeof x === "string" && (INBOX_LABELS as readonly string[]).includes(x);
}

// This agent's labels on a shortlist row, ordered by the controlled vocabulary.
export async function listLabels(
  sb: SupabaseClient,
  shortlistId: number,
  agentId: number,
): Promise<InboxLabel[]> {
  const { data } = await sb
    .from("sg_lead_labels")
    .select("label")
    .eq("shortlist_id", shortlistId)
    .eq("agent_id", agentId);
  const set = new Set((data ?? []).map((r) => r.label).filter(isInboxLabel));
  return INBOX_LABELS.filter((l) => set.has(l));
}

// Add a label. Idempotent via the (shortlist_id, label) unique index.
export async function addLabel(
  sb: SupabaseClient,
  shortlistId: number,
  agentId: number,
  label: InboxLabel,
): Promise<void> {
  await sb
    .from("sg_lead_labels")
    .upsert({ shortlist_id: shortlistId, agent_id: agentId, label }, { onConflict: "shortlist_id,label" });
}

export async function removeLabel(
  sb: SupabaseClient,
  shortlistId: number,
  agentId: number,
  label: InboxLabel,
): Promise<void> {
  await sb
    .from("sg_lead_labels")
    .delete()
    .eq("shortlist_id", shortlistId)
    .eq("agent_id", agentId)
    .eq("label", label);
}
