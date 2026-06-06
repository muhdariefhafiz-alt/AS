// Generates genuinely unique, data-driven landing copy for the sell-by-area
// SEO pages (/sell/hdb/[town], /sell/condo/[district]).
//
// Constraint (project rule): NO templated duplicate content. Every page's
// narrative must read differently AND carry real, area-specific numbers. We
// achieve that by (1) pulling real stats per area, and (2) selecting sentence
// frames by a stable hash of the area name so phrasing varies area to area.

import { supabase } from "./supabase";

export type AreaStats = {
  median: number | null;
  count12mo: number;
  topSegment: string | null; // e.g. "4 ROOM" or "The Sail @ Marina Bay"
  yoyPct: number | null; // year-over-year median change
  recent: { label: string; price: number; detail: string }[];
};

function fmtSgd(n: number): string {
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency: "SGD",
    maximumFractionDigits: 0,
  }).format(n);
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function monthsBack(n: number, offset = 0): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = offset; i < offset + n; i++) {
    const dt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    out.push(`${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}`);
  }
  return out;
}

export async function hdbAreaStats(town: string): Promise<AreaStats> {
  const last12 = monthsBack(12);
  const prev12 = monthsBack(12, 12);
  const [{ data: recent }, { data: prior }] = await Promise.all([
    supabase
      .from("sg_hdb_transactions")
      .select("resale_price, flat_type, block, street_name, storey_range, floor_area_sqm, month")
      .eq("town", town.toUpperCase())
      .in("month", last12)
      .order("month", { ascending: false })
      .limit(3000),
    supabase
      .from("sg_hdb_transactions")
      .select("resale_price")
      .eq("town", town.toUpperCase())
      .in("month", prev12)
      .limit(3000),
  ]);

  const rows = recent ?? [];
  const prices = rows.map((r) => Number(r.resale_price)).filter((n) => n > 0);
  const med = median(prices);
  const priorMed = median((prior ?? []).map((r) => Number(r.resale_price)).filter((n) => n > 0));
  const yoy = med && priorMed ? ((med - priorMed) / priorMed) * 100 : null;

  // Top flat type by count
  const typeCounts = new Map<string, number>();
  for (const r of rows) {
    const t = r.flat_type ?? "";
    if (t) typeCounts.set(t, (typeCounts.get(t) ?? 0) + 1);
  }
  const topSegment =
    [...typeCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return {
    median: med,
    count12mo: prices.length,
    topSegment,
    yoyPct: yoy,
    recent: rows.slice(0, 6).map((r) => ({
      label: r.block ? `Blk ${r.block} ${r.street_name ?? ""}`.trim() : (r.month ?? ""),
      price: Number(r.resale_price),
      detail: [
        r.flat_type,
        r.floor_area_sqm ? `${Math.round(Number(r.floor_area_sqm))} sqm` : null,
        r.storey_range ? `${r.storey_range} floor` : null,
      ]
        .filter(Boolean)
        .join(" · "),
    })),
  };
}

export async function privateAreaStats(districtNum: string): Promise<AreaStats> {
  const { data: txns } = await supabase
    .from("sg_private_transactions")
    .select("price, project, contract_date, area_sqm, floor_range")
    .eq("district", districtNum)
    .order("contract_date", { ascending: false })
    .limit(3000);
  const rows = txns ?? [];
  const prices = rows.map((r) => Number(r.price)).filter((n) => n > 0);
  const med = median(prices);

  const projCounts = new Map<string, number>();
  for (const r of rows) {
    const p = r.project ?? "";
    if (p) projCounts.set(p, (projCounts.get(p) ?? 0) + 1);
  }
  const topSegment =
    [...projCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  return {
    median: med,
    count12mo: prices.length,
    topSegment,
    yoyPct: null,
    recent: rows.slice(0, 6).map((r) => ({
      label: r.project ?? "",
      price: Number(r.price),
      detail: [
        r.area_sqm ? `${Math.round(Number(r.area_sqm))} sqm` : null,
        r.floor_range ? `${r.floor_range} floor` : null,
      ]
        .filter(Boolean)
        .join(" · "),
    })),
  };
}

// Produces 2-3 unique paragraphs. Frame selection is seeded by area name so
// two areas with similar stats still read differently.
export function buildNarrative(
  areaLabel: string,
  propertyLabel: string,
  stats: AreaStats
): string[] {
  const seed = hash(areaLabel);
  const paras: string[] = [];

  const medianStr = stats.median ? fmtSgd(stats.median) : null;

  // Opening frame (4 variants)
  const openers = [
    medianStr
      ? `Over the last 12 months, ${stats.count12mo} ${propertyLabel} changed hands in ${areaLabel}, with a median price around ${medianStr}.`
      : `${areaLabel} is an active ${propertyLabel} market, though recent transaction volume here is thin.`,
    medianStr
      ? `If you own a ${propertyLabel} in ${areaLabel}, recent sales put the median at roughly ${medianStr} across ${stats.count12mo} completed transactions in the past year.`
      : `Selling a ${propertyLabel} in ${areaLabel} starts with knowing who actually closes deals here.`,
    medianStr
      ? `${areaLabel} has seen ${stats.count12mo} ${propertyLabel} sales in the past year, clustering around a ${medianStr} median.`
      : `The ${propertyLabel} market in ${areaLabel} rewards sellers who pick an agent on track record, not on the highest valuation pitch.`,
    medianStr
      ? `Thinking of selling your ${propertyLabel} in ${areaLabel}? The last year's ${stats.count12mo} sales here centred on about ${medianStr}.`
      : `Pricing a ${propertyLabel} in ${areaLabel} well means working from real recent sales, not a hopeful number.`,
  ];
  paras.push(openers[seed % openers.length]);

  // Trend / segment frame
  if (stats.yoyPct !== null) {
    const dir = stats.yoyPct >= 0 ? "up" : "down";
    const trendFrames = [
      `Prices here are ${dir} about ${Math.abs(stats.yoyPct).toFixed(1)}% year on year, so timing and pricing strategy matter more than usual.`,
      `The median has moved ${dir} roughly ${Math.abs(stats.yoyPct).toFixed(1)}% versus the prior year, which shapes how aggressively you should price.`,
      `Year on year the ${areaLabel} median is ${dir} ${Math.abs(stats.yoyPct).toFixed(1)}%, a signal worth factoring into your listing price.`,
    ];
    paras.push(trendFrames[seed % trendFrames.length]);
  }

  if (stats.topSegment) {
    const segFrames = [
      `The most-traded segment lately is ${stats.topSegment} — agents who specialise in it tend to price and market it best.`,
      `${stats.topSegment} is the busiest segment here right now, so an agent with a deep ${areaLabel} ${stats.topSegment} record is worth shortlisting.`,
      `Most recent activity sits in the ${stats.topSegment} segment; look for agents whose track record concentrates there.`,
    ];
    paras.push(segFrames[(seed >> 2) % segFrames.length]);
  }

  // Closing CTA frame
  const closers = [
    `Below, see the top-ranked CEA-licensed agents who actually sell in ${areaLabel}, ranked on real transaction records. Compare them free and contact whoever you choose.`,
    `We rank every agent in ${areaLabel} on their actual CEA transaction history. Compare the top performers below and reach out directly, free.`,
    `Skip the guesswork: the agents below are ranked on verified ${areaLabel} sales, not advertising spend. Compare them all free and contact the ones you choose.`,
  ];
  paras.push(closers[seed % closers.length]);

  return paras;
}

export { fmtSgd };
