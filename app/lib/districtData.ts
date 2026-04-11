import { supabase } from "./supabase";

// --- Types ---

export type PropertyTypeStats = {
  property_type: string;
  txns: number;
  avg_price: number;
  median_price: number;
  min_price: number;
  max_price: number;
};

export type TopProject = {
  project: string;
  street: string;
  txns: number;
  avg_price: number;
  median_price: number;
};

export type RentalProject = {
  project: string;
  avg_rent_psf: number;
  periods: number;
};

export type ActiveAgent = {
  agent_name: string;
  agent_license: string;
  agency_name: string | null;
  listings: number;
  avg_price: number;
};

export type Amenity = {
  name: string;
  type: string;
  latitude: number;
  longitude: number;
};

export type TenureAnalysis = {
  tenure_type: string;
  txns: number;
  avg_price: number;
  median_price: number;
  price_per_sqm: number;
};

export type FloorPremium = {
  floor_range: string;
  txns: number;
  median_price: number;
};

export type PsfAnalysis = {
  property_type: string;
  txns: number;
  median_psf: number;
  median_price: number;
};

export type DistrictComparison = {
  district: string;
  district_name: string;
  median_price: number;
  txns: number;
};

export type DistrictMarketData = {
  totalTxns: number;
  avgPrice: number;
  medianPrice: number;
  minPrice: number;
  maxPrice: number;
  propertyTypes: PropertyTypeStats[];
  topProjects: TopProject[];
  rentalData: RentalProject[];
  avgRentPsf: number | null;
  tenureAnalysis: TenureAnalysis[];
  floorPremium: FloorPremium[];
  psfAnalysis: PsfAnalysis[];
  districtComparison: DistrictComparison[];
  activeAgents: ActiveAgent[];
  amenities: { schools: Amenity[]; mrt: Amenity[] };
  sgMedianPrice: number;
};

// --- Data Fetchers ---

/**
 * Fetches all market data for a district in parallel.
 * districtNum is the zero-padded district number (e.g. "09", "19")
 */
export async function getDistrictMarketData(
  districtCode: string, // e.g. "D09"
): Promise<DistrictMarketData> {
  const districtNum = districtCode.replace("D", "").padStart(2, "0");

  const [
    propertyTypesResult,
    topProjectsResult,
    rentalResult,
    agentsResult,
    amenitiesResult,
    sgMedianResult,
    tenureResult,
    floorResult,
    psfResult,
    compResult,
  ] = await Promise.all([
    supabase.rpc("get_district_property_types", { d_code: districtNum }),
    supabase.rpc("get_district_top_projects", { d_code: districtNum }),
    supabase.rpc("get_district_rental_data", { d_code: districtNum }),
    supabase
      .from("sg_listings")
      .select("agent_name, agent_license, agency_name, price")
      .eq("district_code", districtCode)
      .not("agent_license", "is", null),
    supabase
      .from("sg_amenities")
      .select("name, type, latitude, longitude")
      .eq("district", districtCode),
    supabase.rpc("get_sg_median_condo_price"),
    supabase.rpc("get_district_tenure_analysis", { d_code: districtNum }),
    supabase.rpc("get_district_floor_premium", { d_code: districtNum }),
    supabase.rpc("get_district_psf_analysis", { d_code: districtNum }),
    supabase.rpc("get_district_comparison", { d_code: districtNum }),
  ]);

  // Process property types
  const propertyTypes: PropertyTypeStats[] = (propertyTypesResult.data ?? []).map((r: Record<string, unknown>) => ({
    property_type: String(r.property_type),
    txns: Number(r.txns),
    avg_price: Number(r.avg_price),
    median_price: Number(r.median_price),
    min_price: Number(r.min_price),
    max_price: Number(r.max_price),
  }));

  const totalTxns = propertyTypes.reduce((s, t) => s + t.txns, 0);
  const condoTypes = propertyTypes.filter(
    (t) => t.property_type === "Apartment" || t.property_type === "Condominium"
  );
  const condoMedian =
    condoTypes.length > 0
      ? condoTypes.reduce((s, t) => s + t.median_price * t.txns, 0) /
        condoTypes.reduce((s, t) => s + t.txns, 0)
      : 0;

  // Process top projects
  const topProjects: TopProject[] = (topProjectsResult.data ?? []).map((r: Record<string, unknown>) => ({
    project: String(r.project),
    street: String(r.street),
    txns: Number(r.txns),
    avg_price: Number(r.avg_price),
    median_price: Number(r.median_price),
  }));

  // Process rental data
  const rentalData: RentalProject[] = (rentalResult.data ?? []).map((r: Record<string, unknown>) => ({
    project: String(r.project),
    avg_rent_psf: Number(r.avg_rent_psf),
    periods: Number(r.periods),
  }));
  const avgRentPsf =
    rentalData.length > 0
      ? rentalData.reduce((s, r) => s + r.avg_rent_psf, 0) / rentalData.length
      : null;

  // Process active agents (aggregate by agent)
  const agentMap = new Map<string, ActiveAgent>();
  for (const row of agentsResult.data ?? []) {
    const key = row.agent_license;
    if (!key) continue;
    const existing = agentMap.get(key);
    if (existing) {
      existing.listings += 1;
      existing.avg_price = (existing.avg_price * (existing.listings - 1) + Number(row.price)) / existing.listings;
    } else {
      agentMap.set(key, {
        agent_name: row.agent_name,
        agent_license: row.agent_license,
        agency_name: row.agency_name,
        listings: 1,
        avg_price: Number(row.price),
      });
    }
  }
  const activeAgents = Array.from(agentMap.values())
    .sort((a, b) => b.listings - a.listings)
    .slice(0, 15);

  // Process amenities
  const allAmenities = amenitiesResult.data ?? [];
  const schools = allAmenities.filter((a: { type: string }) => a.type === "school");
  const mrt = allAmenities.filter((a: { type: string }) => a.type === "mrt");

  const sgMedian = sgMedianResult.data?.[0]?.median ?? 1_720_000;

  const tenureAnalysis: TenureAnalysis[] = (tenureResult.data ?? []).map((r: Record<string, unknown>) => ({
    tenure_type: String(r.tenure_type),
    txns: Number(r.txns),
    avg_price: Number(r.avg_price),
    median_price: Number(r.median_price),
    price_per_sqm: Number(r.price_per_sqm),
  }));

  const floorPremium: FloorPremium[] = (floorResult.data ?? []).map((r: Record<string, unknown>) => ({
    floor_range: String(r.floor_range),
    txns: Number(r.txns),
    median_price: Number(r.median_price),
  }));

  const psfAnalysis: PsfAnalysis[] = (psfResult.data ?? []).map((r: Record<string, unknown>) => ({
    property_type: String(r.property_type),
    txns: Number(r.txns),
    median_psf: Number(r.median_psf),
    median_price: Number(r.median_price),
  }));

  const districtComparison: DistrictComparison[] = (compResult.data ?? []).map((r: Record<string, unknown>) => ({
    district: String(r.district),
    district_name: String(r.district_name).split(",")[0].trim(),
    median_price: Number(r.median_price),
    txns: Number(r.txns),
  }));

  return {
    totalTxns,
    avgPrice: condoMedian || propertyTypes[0]?.avg_price || 0,
    medianPrice: condoMedian || propertyTypes[0]?.median_price || 0,
    minPrice: Math.min(...propertyTypes.map((t) => t.min_price).filter(Boolean)),
    maxPrice: Math.max(...propertyTypes.map((t) => t.max_price).filter(Boolean)),
    propertyTypes,
    topProjects,
    rentalData,
    avgRentPsf,
    tenureAnalysis,
    floorPremium,
    psfAnalysis,
    districtComparison,
    activeAgents,
    amenities: { schools, mrt },
    sgMedianPrice: Number(sgMedian),
  };
}
