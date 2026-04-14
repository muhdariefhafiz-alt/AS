import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const BASE = "https://fair-comparisons.com";

/**
 * RSS feed of top agent rankings.
 * Auto-updates from live data. Can be consumed by social media tools,
 * RSS readers, or IFTTT/Zapier for automated distribution.
 */
export async function GET() {
  const { data: topAgents } = await supabase
    .from("sg_agents")
    .select("name, slug, agency_name, score, transaction_count, primary_area")
    .not("score", "is", null)
    .order("score", { ascending: false })
    .limit(20);

  const { data: recentClaims } = await supabase
    .from("sg_agents")
    .select("name, slug, agency_name, score")
    .eq("claimed", true)
    .order("updated_at", { ascending: false })
    .limit(5);

  const now = new Date().toUTCString();
  const agents = topAgents ?? [];
  const claims = recentClaims ?? [];

  const items = [
    // Top agents as feed items
    ...agents.map(
      (a, i) => `
    <item>
      <title>#${i + 1} ${a.name} - AgentScore ${Math.round(Number(a.score))} (${a.agency_name})</title>
      <link>${BASE}/property-agents/agent/${a.slug}?utm_source=rss</link>
      <description>${a.name} from ${a.agency_name} ranks #${i + 1} in Singapore with an AgentScore of ${Math.round(Number(a.score))} based on ${a.transaction_count} CEA transactions.${a.primary_area ? ` Primary area: ${a.primary_area}.` : ""}</description>
      <guid isPermaLink="false">top-agent-${a.slug}-${new Date().toISOString().slice(0, 7)}</guid>
      <pubDate>${now}</pubDate>
      <category>Top Agents</category>
    </item>`
    ),
    // Recently claimed profiles
    ...claims.map(
      (a) => `
    <item>
      <title>${a.name} claimed their FairComparisons profile (Score: ${Math.round(Number(a.score))})</title>
      <link>${BASE}/property-agents/agent/${a.slug}?utm_source=rss</link>
      <description>${a.name} from ${a.agency_name} has verified and claimed their agent profile on FairComparisons. View their full transaction history and contact details.</description>
      <guid isPermaLink="false">claimed-${a.slug}</guid>
      <pubDate>${now}</pubDate>
      <category>Claimed Profiles</category>
    </item>`
    ),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>FairComparisons - Singapore Property Agent Rankings</title>
  <link>${BASE}</link>
  <description>Top property agents in Singapore ranked by AgentScore. Updated from CEA transaction data. Independent, data-driven rankings.</description>
  <language>en-sg</language>
  <lastBuildDate>${now}</lastBuildDate>
  <atom:link href="${BASE}/api/feed" rel="self" type="application/rss+xml"/>
  <image>
    <url>${BASE}/og-image.png</url>
    <title>FairComparisons</title>
    <link>${BASE}</link>
  </image>
  ${items.join("\n")}
</channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
