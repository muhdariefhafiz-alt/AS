// MOP (Minimum Occupation Period) lookup for HDB owners.
//
// Inputs are deliberately fuzzy: SG owners remember "around CNY 2021" not
// the exact key collection date. We accept month + year only and treat the
// 1st of the chosen month as the assumed key-collection date.
//
// Standard MOP = 5 years from key collection. New BTOs from Aug 2024 onward
// are 5 years for most schemes (Plus and Prime are higher); we don't model
// those variants in v1 — show the 5y date and let the owner override later.

import { supabase } from "./supabase";

export const HDB_FLAT_TYPES = [
  "2 ROOM",
  "3 ROOM",
  "4 ROOM",
  "5 ROOM",
  "EXECUTIVE",
] as const;

export type HdbFlatType = (typeof HDB_FLAT_TYPES)[number];

export type MopInput = {
  town: string;
  flat_type: HdbFlatType;
  key_collection_year: number;   // e.g. 2021
  key_collection_month: number;  // 1..12
};

export type MopResult = {
  // MOP-derived
  key_collection_date: string;          // ISO date, first of the month
  mop_date: string;                     // ISO date
  months_to_mop: number;                // negative if past MOP
  mop_status: "before_mop" | "past_mop";
  // Market context
  median_resale_price: number | null;   // last 180 days, matching town+flat_type
  comp_count: number;                   // how many comps used
  price_window_months: number;          // 6
  // Agent preview
  top_agents: TopAgentPreview[];
};

export type TopAgentPreview = {
  agent_id: number;
  agent_name: string;
  agent_slug: string | null;
  agency_name: string;
  score: number;
  area_txns: number;
};

export function clampMonth(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.min(12, Math.max(1, Math.round(n)));
}

export function clampYear(n: number): number {
  const now = new Date().getUTCFullYear();
  if (!Number.isFinite(n)) return now - 5;
  // BTOs delivered 2001 onwards are the realistic range.
  return Math.min(now + 1, Math.max(2001, Math.round(n)));
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function computeMopDate(input: MopInput): {
  key_collection_date: string;
  mop_date: string;
} {
  const y = clampYear(input.key_collection_year);
  const m = clampMonth(input.key_collection_month);
  const key = new Date(Date.UTC(y, m - 1, 1));
  const mop = new Date(Date.UTC(y + 5, m - 1, 1));
  return {
    key_collection_date: key.toISOString().slice(0, 10),
    mop_date: mop.toISOString().slice(0, 10),
  };
}

export function monthsBetween(a: Date, b: Date): number {
  return (
    (b.getUTCFullYear() - a.getUTCFullYear()) * 12 +
    (b.getUTCMonth() - a.getUTCMonth())
  );
}

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

// Pull last 6 months of sg_hdb_transactions for the town+flat_type and
// return the median resale_price + count. We use 6 months (not 3) because
// at the edge of HDB towns the monthly count can be small.
async function recentMedian(
  town: string,
  flat_type: HdbFlatType,
  windowMonths = 6
): Promise<{ median: number | null; count: number }> {
  const sb = supabase;
  const now = new Date();
  const cutoff = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - windowMonths, 1)
  );
  const cutoffStr = `${cutoff.getUTCFullYear()}-${pad2(cutoff.getUTCMonth() + 1)}`;
  const { data } = await sb
    .from("sg_hdb_transactions")
    .select("resale_price, month")
    .eq("town", town)
    .eq("flat_type", flat_type)
    .gte("month", cutoffStr)
    .limit(2000);
  const prices = (data ?? [])
    .map((r) => Number(r.resale_price))
    .filter((n) => Number.isFinite(n) && n > 0);
  return { median: median(prices), count: prices.length };
}

async function topAgents(town: string): Promise<TopAgentPreview[]> {
  const sb = supabase;
  const { data } = await sb
    .from("sg_area_top_agents")
    .select(
      "agent_id, agent_name, agent_slug, agency_name, score, area_txns, area_property_types"
    )
    .eq("area_type", "town")
    .eq("area_name", town.toUpperCase())
    .order("rank", { ascending: true })
    .limit(8);
  return (data ?? [])
    .filter((r) => {
      // Only show agents who actually do HDB in this town.
      const types = (r.area_property_types ?? "").toUpperCase();
      return types.includes("HDB");
    })
    .slice(0, 3)
    .map((r) => ({
      agent_id: Number(r.agent_id),
      agent_name: String(r.agent_name ?? ""),
      agent_slug: (r.agent_slug as string | null) ?? null,
      agency_name: String(r.agency_name ?? ""),
      score: Number(r.score ?? 0),
      area_txns: Number(r.area_txns ?? 0),
    }));
}

export async function lookupMop(input: MopInput): Promise<MopResult> {
  const { key_collection_date, mop_date } = computeMopDate(input);
  const now = new Date();
  const mopDateObj = new Date(mop_date + "T00:00:00Z");
  const months_to_mop = monthsBetween(now, mopDateObj);

  const [{ median: medianPrice, count }, agents] = await Promise.all([
    recentMedian(input.town, input.flat_type),
    topAgents(input.town),
  ]);

  return {
    key_collection_date,
    mop_date,
    months_to_mop,
    mop_status: months_to_mop > 0 ? "before_mop" : "past_mop",
    median_resale_price: medianPrice,
    comp_count: count,
    price_window_months: 6,
    top_agents: agents,
  };
}

export function makeMopToken(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function isValidHdbFlatType(s: unknown): s is HdbFlatType {
  return typeof s === "string" && (HDB_FLAT_TYPES as readonly string[]).includes(s);
}
