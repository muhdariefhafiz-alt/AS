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

// --- HDB town x flat-type segment pages (deeper than town level) ---

export const HDB_FLAT_TYPES = [
  { name: "2 ROOM", slug: "2-room", label: "2-Room" },
  { name: "3 ROOM", slug: "3-room", label: "3-Room" },
  { name: "4 ROOM", slug: "4-room", label: "4-Room" },
  { name: "5 ROOM", slug: "5-room", label: "5-Room" },
  { name: "EXECUTIVE", slug: "executive", label: "Executive" },
] as const;

export function flatTypeFromSlug(slug: string): (typeof HDB_FLAT_TYPES)[number] | undefined {
  return HDB_FLAT_TYPES.find((f) => f.slug === slug);
}

export type HdbSegmentSummary = {
  txns: number;
  median_price: number;
  min_price: number;
  max_price: number;
  median_psm: number;
  avg_sqm: number;
};
export type SegStorey = { storey_range: string; median_price: number; txns: number };
export type SegLease = { era: string; median_psm: number; txns: number };
export type SegModel = { flat_model: string; median_price: number; txns: number };
export type SegBlock = { block: string; street_name: string; median_price: number; txns: number };

export type HdbSegmentData = {
  summary: HdbSegmentSummary;
  storey: SegStorey[];
  lease: SegLease[];
  models: SegModel[];
  blocks: SegBlock[];
};

// Single RPC round-trip. Returns null when the segment has no rows so the page
// can 404 rather than render an empty shell. Deliberately no time-series: the
// 2025 ingestion window is partially populated, so a monthly trend line would
// misrepresent the market. Everything here is cross-sectional over the real
// recent-transaction sample.
export async function getHdbSegmentData(
  townName: string,
  flatType: string,
): Promise<HdbSegmentData | null> {
  const { data } = await supabase.rpc("get_hdb_segment_stats", { t_name: townName, f_type: flatType });
  const d = data as HdbSegmentData | null;
  if (!d || !d.summary || !d.summary.txns) return null;
  return {
    summary: d.summary,
    storey: d.storey ?? [],
    lease: d.lease ?? [],
    models: d.models ?? [],
    blocks: d.blocks ?? [],
  };
}

export type HdbSegmentParam = {
  townSlug: string;
  flatSlug: string;
  townName: string;
  flatType: string;
  flatLabel: string;
  txns: number;
  median: number;
};

// The density-gated set of segments that get their own page (>= 150 txns / 24mo).
export async function getQualifyingHdbSegments(): Promise<HdbSegmentParam[]> {
  const { data } = await supabase.rpc("get_hdb_qualifying_segments", { min_n: 150 });
  const out: HdbSegmentParam[] = [];
  for (const r of (data ?? []) as Array<{ town: string; flat_type: string; txns: number; median_price: number }>) {
    const town = HDB_TOWNS.find((t) => t.name === r.town);
    const flat = HDB_FLAT_TYPES.find((f) => f.name === r.flat_type);
    if (!town || !flat) continue;
    out.push({
      townSlug: town.slug,
      flatSlug: flat.slug,
      townName: town.name,
      flatType: flat.name,
      flatLabel: flat.label,
      txns: Number(r.txns),
      median: Number(r.median_price),
    });
  }
  return out;
}
