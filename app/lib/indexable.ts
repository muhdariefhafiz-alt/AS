import { supabase } from "./supabase";

// Single source of truth for which agent pages we actively push to Google.
//
// Two DISTINCT concepts, deliberately kept apart:
//  - SITEMAP UNIVERSE (this file): every scored agent (~29,700 of 38,110).
//    Until Jul 2026 the sitemap was scoped to the dense tier only (score AND
//    >=30 txns OR claimed, ~12k) to protect crawl budget, which left the
//    ~17.7k middle tail (1-29 txns) with NO discovery path at all: not in
//    any sitemap and barely internally linked. Those pages rank for the
//    agent's own name and convert (22.8% CTR), and since the capture layer
//    (Quick Answers + verdict content) they are differentiated pages, so
//    exclusion cost real traffic. Tiering is now expressed through
//    <priority> (dense 0.7/0.6, tail 0.4) instead of through exclusion.
//  - "isThin" noindex (in the agent page): unchanged. Only genuinely empty
//    pages (no score, no rating, no txns, unclaimed; ~8.4k) are noindexed.
//    Thin pages have no score, so the score-not-null universe filter below
//    keeps the sitemap and the noindex rule consistent by construction:
//    nothing we submit to Google carries a noindex.

export const AGENT_INDEX_MIN_TXNS = 30; // dense-tier threshold (priority signal)
// 1000, not larger: PostgREST caps a single select at 1000 rows by default, so a
// shard reads exactly one .range() page. A bigger shard would silently truncate
// (verified: a 5000-span range returned only 1000 URLs). ~29.7k universe = 30 shards.
export const AGENT_SITEMAP_SHARD_SIZE = 1000;

// Crawl-path directory (/property-agents/directory/[page]): page size for the
// A-to-Z listing that gives every universe page an internal link at depth 2
// from the sitewide footer. 250 rows stays far under the PostgREST 1000-row cap.
export const AGENT_DIRECTORY_PAGE_SIZE = 250;

// Sitemap <priority> per agent. Dense tier (>=30 recorded CEA transactions or
// claimed) keeps its historical 0.7/0.6 split; the middle tail gets 0.4 so
// Google still sees a clear crawl ordering across the widened universe.
export function agentSitemapPriority(a: {
  score: unknown;
  transaction_count: number | null;
  claimed?: boolean | null;
}): number {
  const dense = (a.transaction_count ?? 0) >= AGENT_INDEX_MIN_TXNS || a.claimed === true;
  if (!dense) return 0.4;
  return Number(a.score) >= 70 ? 0.7 : 0.6;
}

// The full sitemap universe: every scored agent. Shared by the sharded
// sitemap, robots.ts (shard listing), the root sitemap (directory pages) and
// the crawl directory itself, so the surfaces can never disagree on coverage.
export async function countIndexableAgents(): Promise<number> {
  const { count } = await supabase
    .from("sg_agents")
    .select("id", { count: "exact", head: true })
    .not("score", "is", null);
  return count ?? 0;
}

export function agentSitemapShardCount(indexableCount: number): number {
  return Math.max(1, Math.ceil(indexableCount / AGENT_SITEMAP_SHARD_SIZE));
}

export function agentDirectoryPageCount(indexableCount: number): number {
  return Math.max(1, Math.ceil(indexableCount / AGENT_DIRECTORY_PAGE_SIZE));
}
