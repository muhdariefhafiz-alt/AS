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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE, changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE}/property-agents`, changeFrequency: "weekly", priority: 0.95 },
    // lawyers coming-soon page: noindex, excluded from sitemap until launch
    { url: `${BASE}/about`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/privacy`, changeFrequency: "monthly", priority: 0.3 },
  ];

  const districtPages: MetadataRoute.Sitemap = districts.map(d => ({
    url: `${BASE}/property-agents/district/${d.slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));

  const hdbPages: MetadataRoute.Sitemap = HDB_TOWNS.map(t => ({
    url: `${BASE}/property-agents/hdb/${t.slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));

  const agencyPages: MetadataRoute.Sitemap = agencies.map(a => ({
    url: `${BASE}/property-agents/agency/${a.slug}`,
    changeFrequency: "weekly" as const,
    priority: a.agent_count >= 1000 ? 0.8 : 0.7,
  }));

  const scoredAgents = (agentsRes.data ?? []).filter(a =>
    (a.score && Number(a.score) >= 1) || (a.google_review_count ?? 0) > 0 || (a.transaction_count ?? 0) > 0
  ).slice(0, 10000);
  const agentPages: MetadataRoute.Sitemap = scoredAgents.map(a => ({
    url: `${BASE}/property-agents/agent/${a.slug}`,
    changeFrequency: "weekly" as const,
    priority: Number(a.score) >= 70 ? 0.7 : 0.6,
  }));

  const projectPages: MetadataRoute.Sitemap = (projectsRes.data ?? []).filter(p => (p.txn_count ?? 0) >= 20).map(p => ({
    url: `${BASE}/property-agents/development/${p.slug}`,
    changeFrequency: "weekly" as const,
    priority: (p.txn_count ?? 0) >= 200 ? 0.8 : 0.7,
  }));

  const bestAgentDistrictPages: MetadataRoute.Sitemap = BEST_AGENT_AREAS.map(slug => ({
    url: `${BASE}/property-agents/best/${slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.85,
  }));

  const bestAgentHdbPages: MetadataRoute.Sitemap = HDB_TOWNS.map(t => ({
    url: `${BASE}/property-agents/best/hdb/${t.slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.85,
  }));

  return [...staticPages, ...districtPages, ...hdbPages, ...bestAgentDistrictPages, ...bestAgentHdbPages, ...agencyPages, ...agentPages, ...projectPages];
}
