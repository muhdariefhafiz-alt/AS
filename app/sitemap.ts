import { supabase } from "./lib/supabase";
import type { MetadataRoute } from "next";

const BASE = "https://agentscan.sg";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [districtsRes, agenciesRes] = await Promise.all([
    supabase.from("sg_districts").select("slug").not("slug", "is", null),
    supabase.from("sg_agencies").select("slug, agent_count, google_review_count, score").order("agent_count", { ascending: false }).limit(5000),
  ]);

  const districts = districtsRes.data ?? [];
  const agencies = (agenciesRes.data ?? []).filter(a =>
    (a.score && Number(a.score) >= 20) || (a.google_review_count ?? 0) >= 5 || a.agent_count >= 50
  );

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE, changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE}/agencies`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/about`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE}/privacy`, changeFrequency: "monthly", priority: 0.3 },
  ];

  const districtPages: MetadataRoute.Sitemap = districts.map(d => ({
    url: `${BASE}/district/${d.slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const agencyPages: MetadataRoute.Sitemap = agencies.map(a => ({
    url: `${BASE}/agency/${a.slug}`,
    changeFrequency: "weekly" as const,
    priority: a.agent_count >= 1000 ? 0.8 : 0.7,
  }));

  return [...staticPages, ...districtPages, ...agencyPages];
}
