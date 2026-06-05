// AVM (Automated Valuation Model) for the "what's my home worth" front door.
//
// Deliberately a RANGE, never a single number. An off-by-10% point estimate
// anchors the seller low and disappoints; a band with a stated confidence is
// honest about what public comp data can and can't tell you.
//
// HDB: percentile band from sg_hdb_transactions (town + flat_type, last 12mo).
// Private: project-level band from sg_projects (median/min/max already rolled
// up per development).

import { supabase } from "./supabase";
import { HDB_FLAT_TYPES, type HdbFlatType, isValidHdbFlatType } from "./mop";

export { HDB_FLAT_TYPES, isValidHdbFlatType };
export type { HdbFlatType };

export type Confidence = "high" | "medium" | "low";

export type AvmRange = {
  low: number;
  mid: number;
  high: number;
  comp_count: number;
  confidence: Confidence;
  window_months: number;
  recent: RecentComp[];
};

export type RecentComp = {
  label: string; // e.g. "Blk 123, 12-15 floor" or "Mar 2026"
  price: number;
  detail: string; // e.g. "4 ROOM · 92 sqm" or "1,140 sqf"
};

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function confidenceFor(n: number): Confidence {
  if (n >= 30) return "high";
  if (n >= 10) return "medium";
  return "low";
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function monthsBack(n: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const dt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    out.push(`${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}`);
  }
  return out;
}

export async function hdbValuation(
  town: string,
  flatType: HdbFlatType,
  blockHint?: string | null
): Promise<AvmRange | null> {
  const windowMonths = 12;
  const months = monthsBack(windowMonths);
  let q = supabase
    .from("sg_hdb_transactions")
    .select("resale_price, month, block, street_name, storey_range, floor_area_sqm, flat_type")
    .eq("town", town.toUpperCase())
    .eq("flat_type", flatType)
    .in("month", months)
    .order("month", { ascending: false })
    .limit(3000);
  // If the seller gave a block, narrow to same block for a tighter band.
  if (blockHint && /^\d+[a-z]?$/i.test(blockHint.trim())) {
    q = q.eq("block", blockHint.trim().toUpperCase());
  }
  const { data } = await q;
  let rows = data ?? [];

  // If a block filter left us with too few comps, fall back to town-wide.
  if (blockHint && rows.length < 5) {
    const { data: wide } = await supabase
      .from("sg_hdb_transactions")
      .select("resale_price, month, block, street_name, storey_range, floor_area_sqm, flat_type")
      .eq("town", town.toUpperCase())
      .eq("flat_type", flatType)
      .in("month", months)
      .order("month", { ascending: false })
      .limit(3000);
    rows = wide ?? [];
  }

  const prices = rows
    .map((r) => Number(r.resale_price))
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);
  if (prices.length < 3) return null;

  const recent: RecentComp[] = rows
    .slice(0, 5)
    .map((r) => ({
      label: r.block ? `Blk ${r.block} ${r.street_name ?? ""}`.trim() : (r.month ?? ""),
      price: Number(r.resale_price),
      detail: [
        r.flat_type,
        r.floor_area_sqm ? `${Math.round(Number(r.floor_area_sqm))} sqm` : null,
        r.storey_range ? `${r.storey_range} floor` : null,
      ]
        .filter(Boolean)
        .join(" · "),
    }))
    .filter((c) => c.price > 0);

  return {
    low: Math.round(percentile(prices, 0.25)),
    mid: Math.round(percentile(prices, 0.5)),
    high: Math.round(percentile(prices, 0.75)),
    comp_count: prices.length,
    confidence: confidenceFor(prices.length),
    window_months: windowMonths,
    recent,
  };
}

export async function privateValuation(
  projectSlug: string
): Promise<(AvmRange & { project_name: string; district: string | null }) | null> {
  const { data: project } = await supabase
    .from("sg_projects")
    .select("name, slug, district, txn_count, median_price, min_price, max_price")
    .eq("slug", projectSlug)
    .single();
  if (!project || !project.median_price) return null;

  const median = Number(project.median_price);
  const min = Number(project.min_price ?? median * 0.8);
  const max = Number(project.max_price ?? median * 1.2);
  const compCount = Number(project.txn_count ?? 0);

  // Pull a handful of recent comps for the development.
  const { data: txns } = await supabase
    .from("sg_private_transactions")
    .select("price, contract_date, area_sqm, floor_range")
    .eq("project", project.name)
    .order("contract_date", { ascending: false })
    .limit(5);
  const recent: RecentComp[] = (txns ?? [])
    .map((t) => ({
      label: mmyyLabel(t.contract_date as string),
      price: Number(t.price),
      detail: [
        t.area_sqm ? `${Math.round(Number(t.area_sqm))} sqm` : null,
        t.floor_range ? `${t.floor_range} floor` : null,
      ]
        .filter(Boolean)
        .join(" · "),
    }))
    .filter((c) => c.price > 0);

  // Band: blend project min/max with a tighter ±8% around median so the range
  // isn't dominated by a single penthouse outlier.
  const low = Math.round(Math.max(min, median * 0.9));
  const high = Math.round(Math.min(max, median * 1.12));

  return {
    low,
    mid: Math.round(median),
    high,
    comp_count: compCount,
    confidence: confidenceFor(compCount),
    window_months: 12,
    recent,
    project_name: project.name,
    district: project.district ?? null,
  };
}

function mmyyLabel(mmyy: string | null): string {
  if (!mmyy || mmyy.length !== 4) return mmyy ?? "";
  const mm = mmyy.slice(0, 2);
  const yy = mmyy.slice(2);
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const mi = parseInt(mm, 10) - 1;
  return `${months[mi] ?? mm} 20${yy}`;
}

export function makeAvmToken(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
