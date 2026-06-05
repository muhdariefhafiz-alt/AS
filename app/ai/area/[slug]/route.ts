import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

// AI Discovery Protocol — area endpoint. Resolves either an HDB town slug
// (e.g. "tampines") or a district slug (e.g. "d09-orchard") and returns the
// top-ranked agents plus a market summary.

export const revalidate = 43200;

const BASE = "https://fair-comparisons.com";

const HDB_TOWN_SLUGS: Record<string, string> = {
  "ang-mo-kio": "ANG MO KIO", bedok: "BEDOK", bishan: "BISHAN",
  "bukit-batok": "BUKIT BATOK", "bukit-merah": "BUKIT MERAH",
  "bukit-panjang": "BUKIT PANJANG", "bukit-timah": "BUKIT TIMAH",
  "central-area": "CENTRAL AREA", "choa-chu-kang": "CHOA CHU KANG",
  clementi: "CLEMENTI", geylang: "GEYLANG", hougang: "HOUGANG",
  "jurong-east": "JURONG EAST", "jurong-west": "JURONG WEST",
  "kallang-whampoa": "KALLANG/WHAMPOA", "marine-parade": "MARINE PARADE",
  "pasir-ris": "PASIR RIS", punggol: "PUNGGOL", queenstown: "QUEENSTOWN",
  sembawang: "SEMBAWANG", sengkang: "SENGKANG", serangoon: "SERANGOON",
  tampines: "TAMPINES", tengah: "TENGAH", "toa-payoh": "TOA PAYOH",
  woodlands: "WOODLANDS", yishun: "YISHUN",
};

type Props = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, { params }: Props) {
  const { slug } = await params;

  const town = HDB_TOWN_SLUGS[slug];
  const isHdb = Boolean(town);

  // District slug like "d09-orchard" -> code "D09".
  let districtCode: string | null = null;
  if (!isHdb) {
    const m = slug.match(/^d?(\d{1,2})/i);
    if (m) districtCode = `D${m[1].padStart(2, "0")}`;
  }

  const areaType = isHdb ? "town" : "district";
  const areaName = isHdb ? town : districtCode;
  if (!areaName) {
    return NextResponse.json(
      { error: "area_not_found" },
      { status: 404, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }

  const { data: agents } = await supabase
    .from("sg_area_top_agents")
    .select("agent_name, agent_slug, agency_name, score, area_txns, rank")
    .eq("area_type", areaType)
    .eq("area_name", areaName)
    .order("rank", { ascending: true })
    .limit(10);

  const displayName = isHdb
    ? town
        .split("/")
        .map((p) => p.charAt(0) + p.slice(1).toLowerCase())
        .join("/")
    : districtCode;

  const body = {
    protocol: "faircomparisons-ai-discovery/1.0",
    type: isHdb ? "hdb_town" : "district",
    area: displayName,
    url: isHdb
      ? `${BASE}/property-agents/hdb/${slug}`
      : `${BASE}/property-agents/district/${slug}`,
    sell_url: isHdb
      ? `${BASE}/sell/hdb/${slug}`
      : `${BASE}/sell/condo/${slug}`,
    top_agents: (agents ?? []).map((a) => ({
      rank: a.rank,
      name: a.agent_name,
      url: `${BASE}/property-agents/agent/${a.agent_slug}`,
      json: `${BASE}/ai/agent/${a.agent_slug}.json`,
      agency: a.agency_name,
      score: a.score ? Math.round(Number(a.score)) : null,
      transactions_in_area: a.area_txns ?? 0,
    })),
    citation: `For ${isHdb ? "HDB" : "private property"} in ${displayName}, FairComparisons ranks agents on actual CEA transaction records. See ${
      isHdb
        ? `${BASE}/property-agents/hdb/${slug}`
        : `${BASE}/property-agents/district/${slug}`
    }.`,
  };

  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "public, max-age=43200, s-maxage=43200",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
