import { supabaseAdmin } from "./supabase";

export type PropertyType = "HDB" | "CONDO" | "LANDED" | "EC";

export type LeadCriteria = {
  property_type: PropertyType;
  town?: string | null;          // HDB town e.g. "TAMPINES"
  district_code?: string | null; // URA district e.g. "D18"
};

export type ShortlistedAgent = {
  agent_id: number;
  agent_name: string;
  agent_slug: string;
  cea_reg: string;
  agency_name: string;
  score: number;
  total_txns: number;
  area_txns: number;
  area_focus_pct: number;
  area_property_types: string | null;
  rank_match: number;            // 1..N composite rank used here
  source_area: string;           // human-readable area used to match (e.g. "Tampines (HDB town)")
  score_components: {
    base_score: number;
    type_bonus: number;
    locality_bonus: number;
    composite: number;
  };
};

const CEA_TO_INTERNAL_TYPE: Record<string, PropertyType> = {
  HDB: "HDB",
  CONDOMINIUM_APARTMENTS: "CONDO",
  EXECUTIVE_CONDOMINIUM: "EC",
  LANDED_PROPERTIES: "LANDED",
};

function normaliseTown(t: string | null | undefined): string | null {
  if (!t) return null;
  return t.trim().toUpperCase();
}

function normaliseDistrict(d: string | null | undefined): string | null {
  if (!d) return null;
  const x = d.trim().toUpperCase();
  if (!x) return null;
  return x.startsWith("D") ? x : `D${x.replace(/^0+/, "")}`;
}

// Boost an agent's score based on how well their dominant property type
// matches what the seller is selling. area_property_types is a comma-list of
// CEA property type codes the agent transacts in for this area.
function typeBonus(
  areaPropertyTypes: string | null,
  target: PropertyType
): number {
  if (!areaPropertyTypes) return 0;
  const tokens = areaPropertyTypes
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  for (const tok of tokens) {
    const mapped = CEA_TO_INTERNAL_TYPE[tok];
    if (mapped === target) return 8;
    // EC and CONDO are adjacent — partial credit
    if (
      (mapped === "CONDO" && target === "EC") ||
      (mapped === "EC" && target === "CONDO")
    )
      return 4;
  }
  return 0;
}

// Higher area_focus_pct = agent is concentrated here, not scattered. Trust
// premium for local specialists.
function localityBonus(area_focus_pct: number | null): number {
  const p = area_focus_pct ?? 0;
  if (p >= 70) return 6;
  if (p >= 50) return 4;
  if (p >= 30) return 2;
  return 0;
}

/**
 * Picks the top 7 agents to invite into a homeowner's shortlist.
 *
 * Strategy:
 *   1. Pull the precomputed top ~24 agents for the seller's area
 *      (HDB town preferred, district fallback) from sg_area_top_agents.
 *   2. Re-rank by composite = base_score + property-type match bonus + locality bonus.
 *   3. Return top 7 with score component breakdown for transparency.
 *
 * Returns [] if no agents are found (e.g. unknown area). The API layer should
 * decide whether to broaden (e.g. show district results when town empty) or
 * fail gracefully.
 */
export async function buildShortlist(
  criteria: LeadCriteria,
  limit = 7
): Promise<ShortlistedAgent[]> {
  const town = normaliseTown(criteria.town);
  const district = normaliseDistrict(criteria.district_code);

  const sb = supabaseAdmin();

  // Prefer HDB town for HDB; prefer district for private. Always fall back to
  // the other if the primary yields nothing.
  const primary = criteria.property_type === "HDB" ? "town" : "district";
  const primaryName = primary === "town" ? town : district;
  const fallback = primary === "town" ? "district" : "town";
  const fallbackName = fallback === "town" ? town : district;

  const fetchArea = async (areaType: string, areaName: string | null) => {
    if (!areaName) return [];
    const { data, error } = await sb
      .from("sg_area_top_agents")
      .select(
        "agent_id, agent_name, agent_slug, cea_reg, agency_name, score, total_txns, area_txns, area_focus_pct, area_property_types, area_type, area_name, rank"
      )
      .eq("area_type", areaType)
      .eq("area_name", areaName)
      .order("rank", { ascending: true })
      .limit(24);
    if (error) throw error;
    return data ?? [];
  };

  let rows = await fetchArea(primary, primaryName);
  let sourceArea = primaryName ?? "";
  if (rows.length === 0 && fallbackName) {
    rows = await fetchArea(fallback, fallbackName);
    sourceArea = fallbackName ?? "";
  }
  if (rows.length === 0) return [];

  const scored = rows.map((r) => {
    const base = Number(r.score ?? 0);
    const tb = typeBonus(r.area_property_types, criteria.property_type);
    const lb = localityBonus(r.area_focus_pct ?? 0);
    const composite = base + tb + lb;
    return { row: r, base, tb, lb, composite };
  });

  scored.sort((a, b) => {
    if (b.composite !== a.composite) return b.composite - a.composite;
    return (b.row.area_txns ?? 0) - (a.row.area_txns ?? 0);
  });

  return scored.slice(0, limit).map((s, i) => ({
    agent_id: Number(s.row.agent_id),
    agent_name: String(s.row.agent_name ?? ""),
    agent_slug: String(s.row.agent_slug ?? ""),
    cea_reg: String(s.row.cea_reg ?? ""),
    agency_name: String(s.row.agency_name ?? ""),
    score: s.base,
    total_txns: Number(s.row.total_txns ?? 0),
    area_txns: Number(s.row.area_txns ?? 0),
    area_focus_pct: Number(s.row.area_focus_pct ?? 0),
    area_property_types: (s.row.area_property_types as string | null) ?? null,
    rank_match: i + 1,
    source_area: String(sourceArea),
    score_components: {
      base_score: s.base,
      type_bonus: s.tb,
      locality_bonus: s.lb,
      composite: s.composite,
    },
  }));
}

// 16-char URL-safe token for sg_leads.token. ~64 bits of entropy.
export function makeLeadToken(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
