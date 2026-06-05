import { NextResponse } from "next/server";
import { supabase } from "../../lib/supabase";
import { areaByDistrictCode, areaShortName } from "../../lib/areas";
import { getDistrictMarketData } from "../../lib/districtData";

/**
 * GET /api/area-preview?district=D15
 *
 * Powers the postal-code search result: real top-ranked agents (from
 * sg_area_top_agents) + real market medians (from URA/HDB data) for a URA
 * district. Everything returned is sourced; nothing is fabricated. If a block
 * cannot be sourced it is omitted (null) rather than invented.
 */
export const revalidate = 43200; // 12h

type TopAgent = {
  name: string;
  agency: string | null;
  areaTxns: number;
  score: number | null;
  saleShare: number | null;
  slug: string | null;
  rank: number;
};

export async function GET(req: Request) {
  const code = (new URL(req.url).searchParams.get("district") || "").toUpperCase();
  const area = areaByDistrictCode(code);
  if (!area) {
    return NextResponse.json({ error: "Unknown district" }, { status: 404 });
  }

  // District display name + slug (for the headline + the district page link).
  const { data: district } = await supabase
    .from("sg_districts")
    .select("code, name, slug")
    .eq("code", code)
    .single();

  // Top-ranked agents in this area + how many are ranked here. Real data.
  const [agentsRes, countRes] = await Promise.all([
    supabase
      .from("sg_area_top_agents")
      .select("agent_name, agent_slug, agency_name, score, area_txns, sale_share, rank")
      .eq("area_type", "district")
      .eq("area_name", area.name)
      .order("rank", { ascending: true })
      .limit(3),
    supabase
      .from("sg_area_top_agents")
      .select("id", { count: "exact", head: true })
      .eq("area_type", "district")
      .eq("area_name", area.name),
  ]);

  const topAgents: TopAgent[] = (agentsRes.data ?? []).map((a) => ({
    name: a.agent_name,
    agency: a.agency_name,
    areaTxns: a.area_txns ?? 0,
    score: a.score != null ? Math.round(Number(a.score)) : null,
    saleShare: a.sale_share != null ? Number(a.sale_share) : null,
    slug: a.agent_slug,
    rank: a.rank,
  }));

  // Market medians. Heavier (several RPCs); best-effort so a slow/missing
  // stat never blocks the result or invents a number.
  let market: { medianPrice: number; totalTxns: number } | null = null;
  try {
    const m = await getDistrictMarketData(code);
    if (m && (m.medianPrice > 0 || m.totalTxns > 0)) {
      market = { medianPrice: m.medianPrice, totalTxns: m.totalTxns };
    }
  } catch {
    market = null;
  }

  return NextResponse.json({
    district: {
      code,
      name: district?.name ?? area.name,
      shortName: areaShortName(district?.name ?? area.name),
      slug: district?.slug ?? null,
    },
    bestSlug: area.slug,
    agentCount: countRes.count ?? topAgents.length,
    topAgents,
    market,
  });
}
