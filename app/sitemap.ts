import { supabase } from "./lib/supabase";
import { HDB_TOWNS } from "./lib/hdbData";
import type { MetadataRoute } from "next";

const BEST_AGENT_AREAS = [
  "serangoon-hougang-punggol", "katong-joo-chiat", "bukit-timah-holland", "orchard-river-valley",
  "tampines-pasir-ris", "clementi-west-coast", "bukit-panjang-choa-chu-kang", "bedok-east-coast",
  "geylang-eunos", "queenstown-tiong-bahru", "bishan-ang-mo-kio", "balestier-toa-payoh",
  "upper-bukit-timah", "novena-thomson", "jurong", "yishun-sembawang", "upper-thomson",
  "seletar", "kranji-woodlands", "raffles-place-marina", "chinatown-tanjong-pagar",
  "harbourfront-telok-blangah", "beach-road-golden-mile", "little-india", "macpherson-braddell",
  "changi-loyang", "lim-chu-kang", "high-street",
];

const BASE = "https://fair-comparisons.com";

// Today's date for lastModified - data pages are revalidated daily by cron
function today() {
  return new Date().toISOString().slice(0, 10);
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // NOTE: Lawyers + financial-advisors intentionally excluded from sitemap while
  // the frontend focuses only on property agents. Backend data collection continues.
  const [districtsRes, agenciesRes, agentsRes, projectsRes] = await Promise.all([
    supabase.from("sg_districts").select("slug").not("slug", "is", null),
    supabase.from("sg_agencies").select("slug, agent_count, google_review_count, score").order("agent_count", { ascending: false }).limit(5000),
    supabase.from("sg_agents").select("slug, score, transaction_count, google_review_count").order("score", { ascending: false, nullsFirst: false }).limit(10000),
    supabase.from("sg_projects").select("slug, txn_count").order("txn_count", { ascending: false }).limit(5000),
  ]);

  const districts = districtsRes.data ?? [];
  const agencies = (agenciesRes.data ?? []).filter(a =>
    (a.score && Number(a.score) >= 20) || (a.google_review_count ?? 0) >= 5 || a.agent_count >= 50
  );

  const scoredAgents = (agentsRes.data ?? []).filter(a =>
    (a.score && Number(a.score) >= 1) || (a.google_review_count ?? 0) > 0 || (a.transaction_count ?? 0) > 0
  ).slice(0, 10000);

  const budgetSlugs = ["under-500k", "500k-to-800k", "800k-to-1m", "1m-to-1-5m", "1-5m-to-2m", "2m-to-3m", "3m-to-5m", "5m-to-10m", "above-10m"];
  const typeSlugs = ["hdb", "condo", "landed", "executive-condo", "apartment", "rental"];

  // District comparison pairs
  const districtCodes = districts.map(d => {
    const m = d.slug.match(/^d(\d{2})/);
    return m ? `d${m[1]}` : null;
  }).filter(Boolean) as string[];
  const districtComparePairs: string[] = [];
  for (let i = 0; i < districtCodes.length - 1; i++) {
    districtComparePairs.push(`${districtCodes[i]}-vs-${districtCodes[i + 1]}`);
  }
  const popularDists = ["d01", "d09", "d10", "d15", "d05", "d03", "d19", "d20", "d11", "d21"];
  for (let i = 0; i < popularDists.length; i++) {
    for (let j = i + 1; j < popularDists.length; j++) {
      const pair = `${popularDists[i]}-vs-${popularDists[j]}`;
      if (!districtComparePairs.includes(pair)) districtComparePairs.push(pair);
    }
  }

  // HDB comparison pairs
  const hdbComparePairs: string[] = [];
  for (let i = 0; i < HDB_TOWNS.length - 1; i++) {
    hdbComparePairs.push(`${HDB_TOWNS[i].slug}-vs-${HDB_TOWNS[i + 1].slug}`);
  }
  const popularTowns = ["ang-mo-kio", "bedok", "tampines", "woodlands", "punggol", "sengkang", "bishan", "queenstown", "bukit-merah", "toa-payoh"];
  for (let i = 0; i < popularTowns.length; i++) {
    for (let j = i + 1; j < popularTowns.length; j++) {
      const pair = `${popularTowns[i]}-vs-${popularTowns[j]}`;
      if (!hdbComparePairs.includes(pair)) hdbComparePairs.push(pair);
    }
  }

  return [
    // === HIGH PRIORITY: Core pages (lastModified = today because daily cron revalidates) ===
    { url: BASE, lastModified: today(), changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE}/property-agents`, lastModified: today(), changeFrequency: "daily", priority: 0.95 },
    { url: `${BASE}/insights`, lastModified: today(), changeFrequency: "weekly", priority: 0.85 },
    { url: `${BASE}/insights/million-dollar-hdb`, lastModified: today(), changeFrequency: "weekly", priority: 0.85 },
    { url: `${BASE}/insights/freehold-premium`, lastModified: today(), changeFrequency: "monthly", priority: 0.85 },
    { url: `${BASE}/insights/top-agents-2026`, lastModified: today(), changeFrequency: "daily", priority: 0.95 },
    // === Guides ===
    { url: `${BASE}/guides`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/guides/how-to-choose-property-agent`, changeFrequency: "monthly", priority: 0.85 },
    { url: `${BASE}/guides/hdb-resale-process`, changeFrequency: "monthly", priority: 0.85 },
    { url: `${BASE}/guides/property-agent-commission`, changeFrequency: "monthly", priority: 0.85 },
    { url: `${BASE}/guides/condo-vs-hdb-investment`, changeFrequency: "monthly", priority: 0.85 },
    { url: `${BASE}/guides/property-agent-vs-diy`, changeFrequency: "monthly", priority: 0.85 },

    { url: `${BASE}/for-agents`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/for-agents/propertyguru-alternative`, lastModified: today(), changeFrequency: "monthly", priority: 0.85 },
    { url: `${BASE}/for-agents/lead-generation`, lastModified: today(), changeFrequency: "monthly", priority: 0.85 },
    { url: `${BASE}/about`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/privacy`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE}/terms`, changeFrequency: "monthly", priority: 0.3 },

    // === Districts + HDB towns (revalidated daily) ===
    ...districts.map(d => ({ url: `${BASE}/property-agents/district/${d.slug}`, lastModified: today(), changeFrequency: "daily" as const, priority: 0.9 })),
    ...HDB_TOWNS.map(t => ({ url: `${BASE}/property-agents/hdb/${t.slug}`, lastModified: today(), changeFrequency: "daily" as const, priority: 0.9 })),

    // === Best agent pages (revalidated daily - key SEO pages) ===
    ...BEST_AGENT_AREAS.map(slug => ({ url: `${BASE}/property-agents/best/${slug}`, lastModified: today(), changeFrequency: "daily" as const, priority: 0.85 })),
    ...HDB_TOWNS.map(t => ({ url: `${BASE}/property-agents/best/hdb/${t.slug}`, lastModified: today(), changeFrequency: "daily" as const, priority: 0.85 })),
    ...budgetSlugs.map(slug => ({ url: `${BASE}/property-agents/budget/${slug}`, lastModified: today(), changeFrequency: "weekly" as const, priority: 0.8 })),
    ...typeSlugs.map(slug => ({ url: `${BASE}/property-agents/best-by-type/${slug}`, lastModified: today(), changeFrequency: "daily" as const, priority: 0.85 })),
    ...[2020, 2021, 2022, 2023, 2024, 2025].map(y => ({ url: `${BASE}/property-agents/market/${y}`, changeFrequency: "monthly" as const, priority: 0.8 })),

    // === Comparisons ===
    ...districtComparePairs.map(p => ({ url: `${BASE}/property-agents/district-compare/${p}`, changeFrequency: "monthly" as const, priority: 0.75 })),
    ...hdbComparePairs.map(p => ({ url: `${BASE}/property-agents/hdb-compare/${p}`, changeFrequency: "monthly" as const, priority: 0.75 })),
    // Agency comparisons (high-intent: "PropNex vs ERA", "Huttons vs OrangeTee")
    ...(() => {
      const agencySlugs = ["propnex-realty-pte-ltd", "era-realty-network-pte-ltd", "huttons-asia-pte-ltd", "orangetee-tie-pte-ltd", "sri-pte-ltd", "c-h-properties-pte-ltd", "sn-real-estate-pte-ltd", "century-21-pte-ltd"];
      const pairs: string[] = [];
      for (let i = 0; i < agencySlugs.length; i++) {
        for (let j = i + 1; j < agencySlugs.length; j++) {
          pairs.push(`${agencySlugs[i]}-vs-${agencySlugs[j]}`);
        }
      }
      return pairs;
    })().map(p => ({ url: `${BASE}/property-agents/agency-compare/${p}`, changeFrequency: "monthly" as const, priority: 0.8 })),

    // === Agencies ===
    ...agencies.map(a => ({ url: `${BASE}/property-agents/agency/${a.slug}`, changeFrequency: "weekly" as const, priority: a.agent_count >= 1000 ? 0.8 : 0.7 })),

    // === Agents ===
    ...scoredAgents.map(a => ({ url: `${BASE}/property-agents/agent/${a.slug}`, changeFrequency: "weekly" as const, priority: Number(a.score) >= 70 ? 0.7 : 0.6 })),

    // === Developments ===
    ...(projectsRes.data ?? []).filter(p => (p.txn_count ?? 0) >= 20).map(p => ({ url: `${BASE}/property-agents/development/${p.slug}`, changeFrequency: "weekly" as const, priority: (p.txn_count ?? 0) >= 200 ? 0.8 : 0.7 })),
  ];
}
