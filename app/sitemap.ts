import { supabase } from "./lib/supabase";
import { HDB_TOWNS, getQualifyingHdbSegments } from "./lib/hdbData";
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
  // Agents are served from the sharded app/property-agents/sitemap.ts (the full
  // data-dense set, uncapped) rather than the old 10k slice here.
  const [districtsRes, agenciesRes, projectsRes, hdbSegments] = await Promise.all([
    supabase.from("sg_districts").select("slug").not("slug", "is", null),
    supabase.from("sg_agencies").select("slug, agent_count, google_review_count, score").order("agent_count", { ascending: false }).limit(5000),
    supabase.from("sg_projects").select("slug, txn_count").order("txn_count", { ascending: false }).limit(5000),
    getQualifyingHdbSegments(),
  ]);

  const districts = districtsRes.data ?? [];
  const agencies = (agenciesRes.data ?? []).filter(a =>
    (a.score && Number(a.score) >= 20) || (a.google_review_count ?? 0) >= 5 || a.agent_count >= 50
  );

  const budgetSlugs = ["under-500k", "500k-to-800k", "800k-to-1m", "1m-to-1-5m", "1-5m-to-2m", "2m-to-3m", "3m-to-5m", "5m-to-10m", "above-10m"];
  const typeSlugs = ["hdb", "condo", "landed", "executive-condo", "apartment", "rental"];

  // District comparison pairs
  // district-compare / hdb-compare are noindexed (low-demand town/district
  // permutations), so they are intentionally excluded from the sitemap.
  // Agency comparisons stay (high-intent brand queries like "PropNex vs ERA").

  return [
    // === HIGH PRIORITY: Core pages (lastModified = today because daily cron revalidates) ===
    { url: BASE, lastModified: today(), changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE}/sell`, lastModified: today(), changeFrequency: "weekly", priority: 0.95 },
    { url: `${BASE}/tools`, lastModified: today(), changeFrequency: "weekly", priority: 0.85 },
    { url: `${BASE}/tools/affordability-calculator`, lastModified: today(), changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE}/tools/mop-tracker`, lastModified: today(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/tools/valuation`, lastModified: today(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/tools/commission-calculator`, lastModified: today(), changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE}/tools/stamp-duty-calculator`, lastModified: today(), changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE}/tools/cea-advertising-checker`, lastModified: today(), changeFrequency: "monthly", priority: 0.85 },
    { url: `${BASE}/tools/net-proceeds-calculator`, lastModified: today(), changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE}/property-agents`, lastModified: today(), changeFrequency: "daily", priority: 0.95 },
    { url: `${BASE}/property-agents/agencies`, lastModified: today(), changeFrequency: "weekly", priority: 0.85 },
    { url: `${BASE}/property-agents/check`, lastModified: today(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/insights`, lastModified: today(), changeFrequency: "weekly", priority: 0.85 },
    { url: `${BASE}/insights/million-dollar-hdb`, lastModified: today(), changeFrequency: "weekly", priority: 0.85 },
    { url: `${BASE}/insights/freehold-premium`, lastModified: today(), changeFrequency: "monthly", priority: 0.85 },
    { url: `${BASE}/insights/top-agents-2026`, lastModified: today(), changeFrequency: "daily", priority: 0.95 },
    { url: `${BASE}/insights/property-agent-statistics-singapore`, lastModified: today(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/insights/property-agent-league-tables-singapore`, lastModified: today(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/insights/best-property-agency-singapore`, lastModified: today(), changeFrequency: "weekly", priority: 0.9 },
    // === Guides ===
    { url: `${BASE}/guides`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/guides/how-to-choose-property-agent`, changeFrequency: "monthly", priority: 0.85 },
    { url: `${BASE}/guides/how-to-check-property-agent-record`, changeFrequency: "monthly", priority: 0.85 },
    { url: `${BASE}/guides/hdb-resale-process`, changeFrequency: "monthly", priority: 0.85 },
    { url: `${BASE}/guides/property-agent-commission`, changeFrequency: "monthly", priority: 0.85 },
    { url: `${BASE}/guides/condo-vs-hdb-investment`, changeFrequency: "monthly", priority: 0.85 },
    { url: `${BASE}/guides/property-agent-vs-diy`, changeFrequency: "monthly", priority: 0.85 },

    { url: `${BASE}/for-agents`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/for-agents/propertyguru-alternative`, lastModified: today(), changeFrequency: "monthly", priority: 0.85 },
    { url: `${BASE}/for-agents/propkaki-alternative`, lastModified: today(), changeFrequency: "monthly", priority: 0.85 },
    { url: `${BASE}/for-agents/lead-generation`, lastModified: today(), changeFrequency: "monthly", priority: 0.85 },
    { url: `${BASE}/about`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/how-we-score`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/independent`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/trust`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/contact`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE}/privacy`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE}/terms`, changeFrequency: "monthly", priority: 0.3 },

    // === Districts + HDB towns (revalidated daily) ===
    ...districts.map(d => ({ url: `${BASE}/property-agents/district/${d.slug}`, lastModified: today(), changeFrequency: "daily" as const, priority: 0.9 })),
    ...HDB_TOWNS.map(t => ({ url: `${BASE}/property-agents/hdb/${t.slug}`, lastModified: today(), changeFrequency: "daily" as const, priority: 0.9 })),
    // HDB town x flat-type segment pages (density-gated >= 150 txns/24mo)
    ...hdbSegments.map(s => ({ url: `${BASE}/property-agents/hdb/${s.townSlug}/${s.flatSlug}`, lastModified: today(), changeFrequency: "weekly" as const, priority: 0.8 })),

    // === Sell-by-area landing pages (seller funnel SEO) ===
    ...HDB_TOWNS.map(t => ({ url: `${BASE}/sell/hdb/${t.slug}`, lastModified: today(), changeFrequency: "weekly" as const, priority: 0.85 })),
    ...districts.map(d => ({ url: `${BASE}/sell/condo/${d.slug}`, lastModified: today(), changeFrequency: "weekly" as const, priority: 0.85 })),

    // === Best agent pages (revalidated daily - key SEO pages) ===
    ...BEST_AGENT_AREAS.map(slug => ({ url: `${BASE}/property-agents/best/${slug}`, lastModified: today(), changeFrequency: "daily" as const, priority: 0.85 })),
    ...HDB_TOWNS.map(t => ({ url: `${BASE}/property-agents/best/hdb/${t.slug}`, lastModified: today(), changeFrequency: "daily" as const, priority: 0.85 })),
    ...budgetSlugs.map(slug => ({ url: `${BASE}/property-agents/budget/${slug}`, lastModified: today(), changeFrequency: "weekly" as const, priority: 0.8 })),
    ...typeSlugs.map(slug => ({ url: `${BASE}/property-agents/best-by-type/${slug}`, lastModified: today(), changeFrequency: "daily" as const, priority: 0.85 })),
    ...[2020, 2021, 2022, 2023, 2024, 2025].map(y => ({ url: `${BASE}/property-agents/market/${y}`, changeFrequency: "monthly" as const, priority: 0.8 })),

    // === Comparisons (agency only; district/hdb compare are noindexed) ===
    // Agency comparisons (high-intent: "PropNex vs ERA", "Huttons vs OrangeTee")
    ...(() => {
      const agencySlugs = ["propnex-realty-pte-ltd", "era-realty-network-pte-ltd", "huttons-asia-pte-ltd", "orangetee-tie-pte-ltd", "sri-pte-ltd", "c-h-properties-pte-ltd", "sn-real-estate-pte-ltd", "century-21-pte-ltd", "knight-frank-pte-ltd", "plb-realty-pte-ltd", "cbre-pte-ltd", "realstar-premier-group-private-limited", "mindlink-groups-pte-ltd", "jones-lang-lasalle-property-consultants-pte-ltd"];
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

    // === Agents === (served from the sharded app/property-agents/sitemap.ts)

    // === Developments ===
    ...(projectsRes.data ?? []).filter(p => (p.txn_count ?? 0) >= 20).map(p => ({ url: `${BASE}/property-agents/development/${p.slug}`, changeFrequency: "weekly" as const, priority: (p.txn_count ?? 0) >= 200 ? 0.8 : 0.7 })),
  ];
}
