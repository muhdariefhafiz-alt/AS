import type { MetadataRoute } from "next";
import { supabase } from "../lib/supabase";
import {
  AGENT_INDEXABLE_OR,
  AGENT_SITEMAP_SHARD_SIZE,
  agentSitemapShardCount,
  countIndexableAgents,
} from "../lib/indexable";

const BASE = "https://fair-comparisons.com";

// Sharded sitemap for the data-dense agent set (score present AND >=30 CEA
// transactions OR claimed). Serves at /property-agents/sitemap/[id].xml in
// production. Replaces the old root-sitemap 10,000-agent cap: the full ~12k
// indexable set now gets crawl priority, paged 5,000 per shard.
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

  const { data } = await supabase
    .from("sg_agents")
    .select("slug, score")
    .not("score", "is", null)
    .or(AGENT_INDEXABLE_OR)
    .order("score", { ascending: false, nullsFirst: false })
    .range(from, to);

  return (data ?? []).map((a) => ({
    url: `${BASE}/property-agents/agent/${a.slug}`,
    changeFrequency: "weekly" as const,
    priority: Number(a.score) >= 70 ? 0.7 : 0.6,
  }));
}
