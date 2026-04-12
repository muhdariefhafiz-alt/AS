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

// Sitemap sections: core, agents, developments, lawyers, comparisons
export async function generateSitemaps() {
  return [
    { id: "core" },
    { id: "agents" },
    { id: "developments" },
    { id: "lawyers" },
    { id: "comparisons" },
  ];
}

export default async function sitemap(props: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  const id = await props.id;

  switch (id) {
    case "core":
      return getCorePages();
    case "agents":
      return getAgentPages();
    case "developments":
      return getDevelopmentPages();
    case "lawyers":
      return getLawyerPages();
    case "comparisons":
      return getComparisonPages();
    default:
      return [];
  }
}

async function getCorePages(): Promise<MetadataRoute.Sitemap> {
  const [districtsRes, agenciesRes] = await Promise.all([
    supabase.from("sg_districts").select("slug").not("slug", "is", null),
    supabase.from("sg_agencies").select("slug, agent_count, google_review_count, score").order("agent_count", { ascending: false }).limit(5000),
  ]);

  const districts = districtsRes.data ?? [];
  const agencies = (agenciesRes.data ?? []).filter(a =>
    (a.score && Number(a.score) >= 20) || (a.google_review_count ?? 0) >= 5 || a.agent_count >= 50
  );

  const budgetSlugs = ["under-500k", "500k-to-800k", "800k-to-1m", "1m-to-1-5m", "1-5m-to-2m", "2m-to-3m", "3m-to-5m", "5m-to-10m", "above-10m"];
  const typeSlugs = ["hdb", "condo", "landed", "executive-condo", "apartment", "rental"];

  return [
    // Static pages
    { url: BASE, changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE}/property-agents`, changeFrequency: "weekly", priority: 0.95 },
    { url: `${BASE}/lawyers`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/for-agents`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/about`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/privacy`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE}/terms`, changeFrequency: "monthly", priority: 0.3 },
    // Insights
    { url: `${BASE}/insights`, changeFrequency: "weekly", priority: 0.85 },
    { url: `${BASE}/insights/million-dollar-hdb`, changeFrequency: "monthly", priority: 0.85 },
    { url: `${BASE}/insights/freehold-premium`, changeFrequency: "monthly", priority: 0.85 },
    { url: `${BASE}/insights/court-case-statistics`, changeFrequency: "monthly", priority: 0.8 },
    // Districts
    ...districts.map(d => ({ url: `${BASE}/property-agents/district/${d.slug}`, changeFrequency: "weekly" as const, priority: 0.9 })),
    // HDB towns
    ...HDB_TOWNS.map(t => ({ url: `${BASE}/property-agents/hdb/${t.slug}`, changeFrequency: "weekly" as const, priority: 0.9 })),
    // Best agent pages
    ...BEST_AGENT_AREAS.map(slug => ({ url: `${BASE}/property-agents/best/${slug}`, changeFrequency: "weekly" as const, priority: 0.85 })),
    ...HDB_TOWNS.map(t => ({ url: `${BASE}/property-agents/best/hdb/${t.slug}`, changeFrequency: "weekly" as const, priority: 0.85 })),
    // Budget + type pages
    ...budgetSlugs.map(slug => ({ url: `${BASE}/property-agents/budget/${slug}`, changeFrequency: "monthly" as const, priority: 0.8 })),
    ...typeSlugs.map(slug => ({ url: `${BASE}/property-agents/best-by-type/${slug}`, changeFrequency: "weekly" as const, priority: 0.85 })),
    // Market year pages
    ...[2020, 2021, 2022, 2023, 2024, 2025].map(y => ({ url: `${BASE}/property-agents/market/${y}`, changeFrequency: "monthly" as const, priority: 0.8 })),
    // Agency pages
    ...agencies.map(a => ({ url: `${BASE}/property-agents/agency/${a.slug}`, changeFrequency: "weekly" as const, priority: a.agent_count >= 1000 ? 0.8 : 0.7 })),
  ];
}

async function getAgentPages(): Promise<MetadataRoute.Sitemap> {
  const { data } = await supabase
    .from("sg_agents")
    .select("slug, score, transaction_count, google_review_count")
    .order("score", { ascending: false, nullsFirst: false })
    .limit(10000);

  const agents = (data ?? []).filter(a =>
    (a.score && Number(a.score) >= 1) || (a.google_review_count ?? 0) > 0 || (a.transaction_count ?? 0) > 0
  ).slice(0, 10000);

  return agents.map(a => ({
    url: `${BASE}/property-agents/agent/${a.slug}`,
    changeFrequency: "weekly" as const,
    priority: Number(a.score) >= 70 ? 0.7 : 0.6,
  }));
}

async function getDevelopmentPages(): Promise<MetadataRoute.Sitemap> {
  const { data } = await supabase
    .from("sg_projects")
    .select("slug, txn_count")
    .order("txn_count", { ascending: false })
    .limit(5000);

  return (data ?? []).filter(p => (p.txn_count ?? 0) >= 20).map(p => ({
    url: `${BASE}/property-agents/development/${p.slug}`,
    changeFrequency: "weekly" as const,
    priority: (p.txn_count ?? 0) >= 200 ? 0.8 : 0.7,
  }));
}

async function getLawyerPages(): Promise<MetadataRoute.Sitemap> {
  const [lawyersRes, firmsRes, areasRes] = await Promise.all([
    supabase.from("sg_lawyers").select("slug, case_count").gte("case_count", 3).order("case_count", { ascending: false }).limit(5000),
    supabase.from("sg_law_firms").select("slug, case_count").gte("case_count", 5).order("case_count", { ascending: false }).limit(1000),
    supabase.from("sg_practice_areas").select("slug, case_count").gte("case_count", 10).order("case_count", { ascending: false }).limit(200),
  ]);

  return [
    ...(lawyersRes.data ?? []).map(l => ({ url: `${BASE}/lawyers/${l.slug}`, changeFrequency: "monthly" as const, priority: (l.case_count ?? 0) >= 20 ? 0.7 : 0.6 })),
    ...(firmsRes.data ?? []).map(f => ({ url: `${BASE}/lawyers/firm/${f.slug}`, changeFrequency: "monthly" as const, priority: (f.case_count ?? 0) >= 50 ? 0.7 : 0.6 })),
    ...(areasRes.data ?? []).map(a => ({ url: `${BASE}/lawyers/practice/${a.slug}`, changeFrequency: "monthly" as const, priority: 0.7 })),
  ];
}

async function getComparisonPages(): Promise<MetadataRoute.Sitemap> {
  const { data: districts } = await supabase.from("sg_districts").select("slug").not("slug", "is", null);
  const districtCodes = (districts ?? []).map(d => {
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
    ...districtComparePairs.map(p => ({ url: `${BASE}/property-agents/district-compare/${p}`, changeFrequency: "monthly" as const, priority: 0.75 })),
    ...hdbComparePairs.map(p => ({ url: `${BASE}/property-agents/hdb-compare/${p}`, changeFrequency: "monthly" as const, priority: 0.75 })),
  ];
}
