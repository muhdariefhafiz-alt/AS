import type { SupabaseClient } from "@supabase/supabase-js";

// Free/paid line for the inbox. The ONLY metered action is AI-draft generation
// (the thing that costs Anthropic tokens). The base inbox, the money-at-risk
// sort, the seller's first reply, and AgentScore/ranking are never gated; that
// would break the two-sided loop and the "rankings cannot be bought" promise.
// Paid tiers (verified and up, see app/lib/tiers.ts) get unlimited drafts.

export const FREE_DRAFTS_PER_MONTH = 2;

// The dashboard funnel event logged once per successful AI draft.
export const DRAFT_EVENT = "inbox_draft_generated";

// First instant of the current month in Singapore time, as an ISO UTC string.
// SGT is a fixed UTC+8 (no DST). We shift `now` into SGT wall-clock to read the
// correct SGT month even when the UTC clock is still in the previous month, then
// map that SGT month-start back to a UTC instant for the created_at comparison.
export function sgtMonthStartIso(now: Date = new Date()): string {
  const sgtWall = new Date(now.getTime() + 8 * 3600 * 1000);
  const y = sgtWall.getUTCFullYear();
  const m = sgtWall.getUTCMonth();
  return new Date(Date.UTC(y, m, 1) - 8 * 3600 * 1000).toISOString();
}

// Count AI drafts this agent generated this SGT month.
export async function countDraftsThisMonth(sb: SupabaseClient, agentId: number): Promise<number> {
  const { count } = await sb
    .from("sg_funnel_events")
    .select("id", { count: "exact", head: true })
    .eq("agent_id", agentId)
    .eq("event", DRAFT_EVENT)
    .gte("created_at", sgtMonthStartIso());
  return count ?? 0;
}
