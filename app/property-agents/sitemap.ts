import type { MetadataRoute } from "next";
import { supabase } from "../lib/supabase";
import {
  AGENT_SITEMAP_SHARD_SIZE,
  agentSitemapPriority,
  agentSitemapShardCount,
  countIndexableAgents,
} from "../lib/indexable";

const BASE = "https://fair-comparisons.com";

// Sharded sitemap for the full scored-agent universe (~29.7k pages; the ~8.4k
// pages with no score are noindexed by the agent page and stay out). Serves at
// /property-agents/sitemap/[id].xml in production. Tiering lives in <priority>
// (dense 0.7/0.6, middle tail 0.4), not in exclusion; see app/lib/indexable.ts.
//
// Next 16: generateSitemaps returns [{id}], and the sitemap function receives
// id as a Promise<string> (per node_modules/next/dist/docs generate-sitemaps.md
// + version-16 upgrade guide).
export async function generateSitemaps(): Promise<{ id: number }[]> {
  const count = await countIndexableAgents();
  const shards = agentSitemapShardCount(count);
  return Array.from({ length: shards }, (_, id) => ({ id }));
}

export default async function sitemap({
  id,
}: {
  id: Promise<string>;
}): Promise<MetadataRoute.Sitemap> {
  const shard = Number(await id);
  const from = shard * AGENT_SITEMAP_SHARD_SIZE;
  const to = from + AGENT_SITEMAP_SHARD_SIZE - 1;

  // The id tiebreak keeps .range() paging deterministic: scores tie often
  // (the scale compresses around 80), and without a total order the same row
  // could appear in two shards or fall between them.
  const { data } = await supabase
    .from("sg_agents")
    .select("slug, score, transaction_count, claimed")
    .not("score", "is", null)
    .not("slug", "is", null)
    .order("score", { ascending: false, nullsFirst: false })
    .order("id", { ascending: true })
    .range(from, to);

  return (data ?? []).map((a) => ({
    url: `${BASE}/property-agents/agent/${a.slug}`,
    changeFrequency: "weekly" as const,
    priority: agentSitemapPriority(a),
  }));
}
