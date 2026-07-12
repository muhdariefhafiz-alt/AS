import type { MetadataRoute } from "next";
import { countIndexableAgents, agentSitemapShardCount } from "./lib/indexable";

const BASE = "https://fair-comparisons.com";

export default async function robots(): Promise<MetadataRoute.Robots> {
  // The agent set is a sharded route sitemap (app/property-agents/sitemap.ts);
  // list every shard URL so Google discovers all of them, not just the root.
  const shards = agentSitemapShardCount(await countIndexableAgents());
  const agentSitemaps = Array.from(
    { length: shards },
    (_, id) => `${BASE}/property-agents/sitemap/${id}.xml`
  );
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/property-agents/", "/insights/", "/guides/", "/for-agents/"],
        // Off-mission sections (lawyers, financial advisors, court stats) are kept
        // crawlable ON PURPOSE so Googlebot can read their noindex (set in each
        // section layout) and drop them from the index. A robots Disallow would
        // block crawl and the noindex would never be seen, leaving them indexed.
        // Keeps the domain's topical signal tight on property agents.
        disallow: ["/api/", "/admin", "/search", "/claim"],
      },
      // AI crawlers, explicitly allowed. Training bots (GPTBot, ClaudeBot,
      // CCBot, Google-Extended) get the site into model knowledge; the
      // search/citation bots (OAI-SearchBot, ChatGPT-User, Claude-SearchBot,
      // Claude-User, PerplexityBot) are what actually fetch pages when an
      // assistant CITES a source, blocking those means zero citations.
      { userAgent: "GPTBot", allow: "/" },
      { userAgent: "OAI-SearchBot", allow: "/" },
      { userAgent: "ChatGPT-User", allow: "/" },
      { userAgent: "ClaudeBot", allow: "/" },
      { userAgent: "Claude-SearchBot", allow: "/" },
      { userAgent: "Claude-User", allow: "/" },
      { userAgent: "PerplexityBot", allow: "/" },
      { userAgent: "Perplexity-User", allow: "/" },
      { userAgent: "Google-Extended", allow: "/" },
      { userAgent: "CCBot", allow: "/" },
      { userAgent: "Applebot", allow: "/" },
      { userAgent: "Applebot-Extended", allow: "/" },
    ],
    sitemap: [`${BASE}/sitemap.xml`, ...agentSitemaps],
  };
}
