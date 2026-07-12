import { NextResponse } from "next/server";
import { supabase } from "../../lib/supabase";
import { HDB_TOWNS } from "../../lib/hdbData";

export const revalidate = 86400;

// AI Discovery Protocol — areas index. Lets AI assistants and crawlers
// enumerate EVERY area we rank agents for (26 HDB towns + 28 districts) with
// direct machine-readable and human URLs, so "best agent in <area>" queries can
// resolve to a citable endpoint without guessing slugs.
export async function GET() {
  const { data: districts } = await supabase
    .from("sg_districts")
    .select("slug, code, name")
    .order("code");

  const BASE = "https://fair-comparisons.com";

  const areas = [
    ...HDB_TOWNS.map((t) => ({
      type: "hdb_town",
      name: t.name,
      slug: t.slug,
      ai_endpoint: `${BASE}/ai/area/${t.slug}.json`,
      page: `${BASE}/property-agents/hdb/${t.slug}`,
      best_agents_page: `${BASE}/property-agents/best/hdb/${t.slug}`,
    })),
    ...(districts ?? []).map((d) => ({
      type: "district",
      name: `${d.code}: ${d.name}`,
      slug: d.slug,
      ai_endpoint: `${BASE}/ai/area/${d.slug}.json`,
      page: `${BASE}/property-agents/district/${d.slug}`,
      best_agents_page: `${BASE}/property-agents/district/${d.slug}`,
    })),
  ];

  return NextResponse.json(
    {
      name: "FairComparisons area index",
      description:
        "Every Singapore area FairComparisons ranks CEA-registered property agents for, on official CEA/URA/HDB transaction records. Use ai_endpoint for machine-readable top agents + market summary per area.",
      methodology: `${BASE}/ai/methodology.json`,
      count: areas.length,
      areas,
    },
    { headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" } }
  );
}
