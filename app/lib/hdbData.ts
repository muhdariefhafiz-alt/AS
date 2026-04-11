import { supabase } from "./supabase";

export type HdbFlatStats = {
  flat_type: string;
  txns: number;
  avg_price: number;
  median_price: number;
  min_price: number;
  max_price: number;
};

export type HdbStreet = {
  street_name: string;
  txns: number;
  avg_price: number;
  median_price: number;
};

export type HdbPriceTrend = {
  year_month: string;
  txns: number;
  median_price: number;
};

export type StoreyPremium = {
  storey_range: string;
  txns: number;
  median_price: number;
};

export type LeaseEra = {
  era: string;
  txns: number;
  avg_price: number;
  avg_sqm: number;
  price_per_sqm: number;
};

export type FlatModel = {
  flat_model: string;
  txns: number;
  avg_price: number;
  price_per_sqm: number;
};

export type TownComparison = {
  town: string;
  median_price: number;
  txns: number;
};

export type HdbTownData = {
  totalTxns: number;
  avgPrice: number;
  medianPrice: number;
  minPrice: number;
  maxPrice: number;
  flatTypes: HdbFlatStats[];
  topStreets: HdbStreet[];
  priceTrend: HdbPriceTrend[];
  storeyPremium: StoreyPremium[];
  leaseAnalysis: LeaseEra[];
  flatModels: FlatModel[];
  townComparison: TownComparison[];
  sgMedianHdb: number;
  activeAgents: Array<{
    agent_name: string;
    agent_license: string;
    agency_name: string | null;
    listings: number;
  }>;
};

// All 26 HDB towns with slugs
export const HDB_TOWNS = [
  { name: "ANG MO KIO", slug: "ang-mo-kio" },
  { name: "BEDOK", slug: "bedok" },
  { name: "BISHAN", slug: "bishan" },
  { name: "BUKIT BATOK", slug: "bukit-batok" },
  { name: "BUKIT MERAH", slug: "bukit-merah" },
  { name: "BUKIT PANJANG", slug: "bukit-panjang" },
  { name: "BUKIT TIMAH", slug: "bukit-timah" },
  { name: "CENTRAL AREA", slug: "central-area" },
  { name: "CHOA CHU KANG", slug: "choa-chu-kang" },
  { name: "CLEMENTI", slug: "clementi" },
  { name: "GEYLANG", slug: "geylang" },
  { name: "HOUGANG", slug: "hougang" },
  { name: "JURONG EAST", slug: "jurong-east" },
  { name: "JURONG WEST", slug: "jurong-west" },
  { name: "KALLANG/WHAMPOA", slug: "kallang-whampoa" },
  { name: "MARINE PARADE", slug: "marine-parade" },
  { name: "PASIR RIS", slug: "pasir-ris" },
  { name: "PUNGGOL", slug: "punggol" },
  { name: "QUEENSTOWN", slug: "queenstown" },
  { name: "SEMBAWANG", slug: "sembawang" },
  { name: "SENGKANG", slug: "sengkang" },
  { name: "SERANGOON", slug: "serangoon" },
  { name: "TAMPINES", slug: "tampines" },
  { name: "TOA PAYOH", slug: "toa-payoh" },
  { name: "WOODLANDS", slug: "woodlands" },
  { name: "YISHUN", slug: "yishun" },
] as const;

export function townFromSlug(slug: string): (typeof HDB_TOWNS)[number] | undefined {
  return HDB_TOWNS.find((t) => t.slug === slug);
}

export function townDisplayName(name: string): string {
  return name
    .split(/[\s/]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ")
    .replace("Ang Mo Kio", "Ang Mo Kio")
    .replace("Choa Chu Kang", "Choa Chu Kang")
    .replace("Toa Payoh", "Toa Payoh")
    .replace("Kallang/whampoa", "Kallang/Whampoa")
    .replace("Kallang Whampoa", "Kallang/Whampoa");
}

export async function getHdbTownData(townName: string): Promise<HdbTownData> {
  const [flatTypesRes, streetsRes, trendRes, sgMedianRes, agentsRes, storeyRes, leaseRes, modelRes, compRes] = await Promise.all([
    supabase.rpc("get_hdb_town_stats", { t_name: townName }),
    supabase.rpc("get_hdb_town_streets", { t_name: townName }),
    supabase.rpc("get_hdb_town_price_trend", { t_name: townName }),
    supabase.rpc("get_sg_median_hdb_price"),
    supabase
      .from("sg_listings")
      .select("agent_name, agent_license, agency_name")
      .eq("property_type", "HDB")
      .not("agent_license", "is", null),
    supabase.rpc("get_hdb_town_storey_premium", { t_name: townName }),
    supabase.rpc("get_hdb_town_lease_analysis", { t_name: townName }),
    supabase.rpc("get_hdb_town_flat_models", { t_name: townName }),
    supabase.rpc("get_hdb_town_comparison", { t_name: townName }),
  ]);

  const flatTypes: HdbFlatStats[] = (flatTypesRes.data ?? []).map((r: Record<string, unknown>) => ({
    flat_type: String(r.flat_type),
    txns: Number(r.txns),
    avg_price: Number(r.avg_price),
    median_price: Number(r.median_price),
    min_price: Number(r.min_price),
    max_price: Number(r.max_price),
  }));

  const totalTxns = flatTypes.reduce((s, t) => s + t.txns, 0);
  const allMedians = flatTypes.filter((t) => t.median_price > 0);
  const weightedMedian =
    allMedians.length > 0
      ? allMedians.reduce((s, t) => s + t.median_price * t.txns, 0) /
        allMedians.reduce((s, t) => s + t.txns, 0)
      : 0;

  const topStreets: HdbStreet[] = (streetsRes.data ?? []).map((r: Record<string, unknown>) => ({
    street_name: String(r.street_name),
    txns: Number(r.txns),
    avg_price: Number(r.avg_price),
    median_price: Number(r.median_price),
  }));

  const priceTrend: HdbPriceTrend[] = (trendRes.data ?? []).map((r: Record<string, unknown>) => ({
    year_month: String(r.year_month),
    txns: Number(r.txns),
    median_price: Number(r.median_price),
  }));

  // Aggregate agents
  const agentMap = new Map<string, { agent_name: string; agent_license: string; agency_name: string | null; listings: number }>();
  for (const row of agentsRes.data ?? []) {
    const key = row.agent_license;
    if (!key) continue;
    const existing = agentMap.get(key);
    if (existing) {
      existing.listings += 1;
    } else {
      agentMap.set(key, {
        agent_name: row.agent_name,
        agent_license: row.agent_license,
        agency_name: row.agency_name,
        listings: 1,
      });
    }
  }

  const storeyPremium: StoreyPremium[] = (storeyRes.data ?? []).map((r: Record<string, unknown>) => ({
    storey_range: String(r.storey_range),
    txns: Number(r.txns),
    median_price: Number(r.median_price),
  }));

  const leaseAnalysis: LeaseEra[] = (leaseRes.data ?? []).map((r: Record<string, unknown>) => ({
    era: String(r.era),
    txns: Number(r.txns),
    avg_price: Number(r.avg_price),
    avg_sqm: Number(r.avg_sqm),
    price_per_sqm: Number(r.price_per_sqm),
  }));

  const flatModels: FlatModel[] = (modelRes.data ?? []).map((r: Record<string, unknown>) => ({
    flat_model: String(r.flat_model),
    txns: Number(r.txns),
    avg_price: Number(r.avg_price),
    price_per_sqm: Number(r.price_per_sqm),
  }));

  const townComparison: TownComparison[] = (compRes.data ?? []).map((r: Record<string, unknown>) => ({
    town: String(r.town),
    median_price: Number(r.median_price),
    txns: Number(r.txns),
  }));

  return {
    totalTxns,
    avgPrice: weightedMedian,
    medianPrice: weightedMedian,
    minPrice: Math.min(...flatTypes.map((t) => t.min_price).filter(Boolean)),
    maxPrice: Math.max(...flatTypes.map((t) => t.max_price).filter(Boolean)),
    flatTypes,
    topStreets,
    priceTrend,
    storeyPremium,
    leaseAnalysis,
    flatModels,
    townComparison,
    sgMedianHdb: Number(sgMedianRes.data?.[0]?.median ?? 500_000),
    activeAgents: Array.from(agentMap.values())
      .sort((a, b) => b.listings - a.listings)
      .slice(0, 10),
  };
}
