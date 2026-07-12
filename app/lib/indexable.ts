import { supabase } from "./supabase";

// Single source of truth for which agent pages we actively push to Google.
//
// Two DISTINCT concepts, deliberately kept apart:
//  - INDEXABLE (this file): the data-dense set we put in the sitemap and ask
//    Google to prioritise crawling. Scoped tight so crawl budget is not spent
//    re-crawling ~18k near-duplicate thin pages. Today: score present AND
//    (>=30 recorded CEA transactions OR claimed). ~12,000 agents.
//  - "isThin" noindex (in the agent page): a MUCH narrower rule that only
//    noindexes genuinely empty pages (no score, no rating, no txns, unclaimed).
//    We do NOT noindex the 1-30 txn middle tail: those still rank for the
//    agent's own name and convert (22.8% CTR), so removing them from the index
//    would throw away live traffic. Not-in-sitemap != noindex.

export const AGENT_INDEX_MIN_TXNS = 30;
// 1000, not larger: PostgREST caps a single select at 1000 rows by default, so a
// shard reads exactly one .range() page. A bigger shard would silently truncate
// (verified: a 5000-span range returned only 1000 URLs). ~12k indexable = 13 shards.
export const AGENT_SITEMAP_SHARD_SIZE = 1000;

// TS predicate (page-level). Mirror of the SQL filter below so the two cannot drift.
export function isAgentIndexable(a: {
  score: unknown;
  transaction_count: number | null;
  claimed?: boolean | null;
}): boolean {
  return (
    a.score != null &&
    (((a.transaction_count ?? 0) >= AGENT_INDEX_MIN_TXNS) || a.claimed === true)
  );
}

// PostgREST `.or()` clause for the SQL side. Use with `.not("score","is",null)`
// so the two sides (this + isAgentIndexable) cannot drift. Both sitemap and
// count call sites apply the identical pair.
export const AGENT_INDEXABLE_OR = `transaction_count.gte.${AGENT_INDEX_MIN_TXNS},claimed.eq.true`;

export async function countIndexableAgents(): Promise<number> {
  const { count } = await supabase
    .from("sg_agents")
    .select("id", { count: "exact", head: true })
    .not("score", "is", null)
    .or(AGENT_INDEXABLE_OR);
  return count ?? 0;
}

export function agentSitemapShardCount(indexableCount: number): number {
  return Math.max(1, Math.ceil(indexableCount / AGENT_SITEMAP_SHARD_SIZE));
}
