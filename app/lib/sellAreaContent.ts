// Generates genuinely unique, data-driven landing copy for the sell-by-area
// SEO pages (/sell/hdb/[town], /sell/condo/[district]).
//
// Constraint (project rule): NO templated duplicate content. Every page's
// narrative must read differently AND carry real, area-specific numbers. We
// achieve that by (1) pulling real stats per area, and (2) selecting sentence
// frames by a stable hash of the area name so phrasing varies area to area.

import { cache } from "react";
import { supabaseAdmin } from "./supabase";

export type AreaTypeRow = { label: string; txns: number; median: number };

export type AreaStats = {
  median: number | null;
  count12mo: number;
  topSegment: string | null; // e.g. "4-room" or "The Sail @ Marina Bay"
  yoyPct: number | null; // year-over-year median change
  recent: { label: string; price: number; detail: string; when?: string }[];
  /** Per-segment split for the same 12mo window (HDB: flat types). */
  byType?: AreaTypeRow[];
  /** Month window the 12mo figures cover, e.g. { from: "Sep 2025", thru: "Jul 2026" }. */
  window?: { from: string; thru: string } | null;
  priorCount?: number;
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

const MONTH_NAMES =["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-07" -> "Jul 2026". Falls back to the input on anything unexpected. */
export function monthLabel(ym: string | null | undefined): string {
  if (!ym) return "";
  const m = /^(\d{4})-(\d{2})$/.exec(ym);
  if (!m) return ym;
  const idx = Number(m[2]) - 1;
  return idx >= 0 && idx < 12 ? `${MONTH_NAMES[idx]} ${m[1]}` : ym;
}

/** "4 ROOM" -> "4-room", "EXECUTIVE" -> "Executive". */
export function fmtFlatType(t: string): string {
  const room = /^(\d) ROOM$/.exec(t.toUpperCase());
  if (room) return `${room[1]}-room`;
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

type HdbRecentStatsRow = {
  from_month: string;
  thru_month: string | null;
  count_12mo: number;
  median_12mo: number | null;
  prior_count: number;
  prior_median: number | null;
  by_type: { flat_type: string; txns: number; median_price: number }[];
  recent: {
    month: string;
    block: string | null;
    street_name: string | null;
    flat_type: string | null;
    storey_range: string | null;
    floor_area_sqm: number | null;
    resale_price: number;
  }[];
};

// One indexed SQL aggregate per town (service-role RPC). The previous
// implementation selected raw rows through PostgREST, whose 1000-row cap
// silently truncated counts and medians for high-volume towns.
// cache() dedupes the generateMetadata + page render calls per request.
export const hdbAreaStats = cache(async (town: string): Promise<AreaStats> => {
  const { data } = await supabaseAdmin().rpc("get_hdb_town_recent_stats", {
    t_name: town.toUpperCase(),
  });
  const s = (data ?? null) as HdbRecentStatsRow | null;
  if (!s || !s.count_12mo) {
    return { median: null, count12mo: 0, topSegment: null, yoyPct: null, recent: [], byType: [], window: null };
  }

  const med = s.median_12mo ? Number(s.median_12mo) : null;
  const priorMed = s.prior_median ? Number(s.prior_median) : null;
  // Only claim a trend when both windows have a meaningful sample.
  const yoy =
    med && priorMed && s.count_12mo >= 30 && s.prior_count >= 30
      ? ((med - priorMed) / priorMed) * 100
      : null;

  const byType: AreaTypeRow[] = (s.by_type ?? []).map((r) => ({
    label: fmtFlatType(r.flat_type),
    txns: r.txns,
    median: Number(r.median_price),
  }));

  return {
    median: med,
    count12mo: s.count_12mo,
    topSegment: byType[0]?.label ?? null,
    yoyPct: yoy,
    priorCount: s.prior_count,
    window: { from: monthLabel(s.from_month), thru: monthLabel(s.thru_month ?? s.from_month) },
    byType,
    recent: (s.recent ?? []).map((r) => ({
      label: r.block ? `Blk ${r.block} ${r.street_name ?? ""}`.trim() : monthLabel(r.month),
      when: monthLabel(r.month),
      price: Number(r.resale_price),
      detail: [
        r.flat_type ? fmtFlatType(r.flat_type) : null,
        r.floor_area_sqm ? `${Math.round(Number(r.floor_area_sqm))} sqm` : null,
        r.storey_range ? `${r.storey_range} floor` : null,
      ]
        .filter(Boolean)
        .join(" · "),
    })),
  };
});

/** "PERFECT TEN" -> "Perfect Ten"; URA's landed catch-all gets a plain label. */
export function fmtProjectName(p: string): string {
  if (p.toUpperCase() === "LANDED HOUSING DEVELOPMENT") return "Landed housing";
  const small = new Set(["at", "on", "of", "the", "by", "de"]);
  return p
    .toLowerCase()
    .split(" ")
    .map((w, i) =>
      i > 0 && small.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)
    )
    .join(" ");
}

type PrivateRecentStatsRow = {
  from_month: string;
  thru_month: string | null;
  count_12mo: number;
  median_12mo: number | null;
  prior_count: number;
  prior_median: number | null;
  top_projects: { project: string; txns: number; median_price: number }[];
  recent: {
    month: string;
    project: string | null;
    property_type: string | null;
    area_sqm: number | null;
    floor_range: string | null;
    price: number;
  }[];
};

// Same fix as hdbAreaStats: one SQL aggregate per district (service-role RPC).
// The previous implementation selected raw rows through PostgREST, whose
// 1000-row cap silently truncated counts and medians for high-volume
// districts. It also passed unpadded district codes ("9" never matched the
// stored "09", so D01-D09 rendered zero transactions), applied no month
// window, and ordered raw MMYY text, which is not chronological.
// cache() dedupes the generateMetadata + page render calls per request.
export const privateAreaStats = cache(async (districtNum: string): Promise<AreaStats> => {
  const { data } = await supabaseAdmin().rpc("get_private_district_recent_stats", {
    d_code: districtNum,
  });
  const s = (data ?? null) as PrivateRecentStatsRow | null;
  if (!s || !s.count_12mo) {
    return { median: null, count12mo: 0, topSegment: null, yoyPct: null, recent: [], byType: [], window: null };
  }

  const med = s.median_12mo ? Number(s.median_12mo) : null;
  const priorMed = s.prior_median ? Number(s.prior_median) : null;
  // Only claim a trend when both windows have a meaningful sample.
  const yoy =
    med && priorMed && s.count_12mo >= 30 && s.prior_count >= 30
      ? ((med - priorMed) / priorMed) * 100
      : null;

  const byType: AreaTypeRow[] = (s.top_projects ?? []).map((r) => ({
    label: fmtProjectName(r.project),
    txns: r.txns,
    median: Number(r.median_price),
  }));

  return {
    median: med,
    count12mo: s.count_12mo,
    topSegment: byType[0]?.label ?? null,
    yoyPct: yoy,
    priorCount: s.prior_count,
    window: { from: monthLabel(s.from_month), thru: monthLabel(s.thru_month ?? s.from_month) },
    byType,
    recent: (s.recent ?? []).map((r) => ({
      label: r.project ? fmtProjectName(r.project) : monthLabel(r.month),
      when: monthLabel(r.month),
      price: Number(r.price),
      detail: [
        r.property_type,
        r.area_sqm ? `${Math.round(Number(r.area_sqm))} sqm` : null,
        r.floor_range && r.floor_range !== "-" ? `${r.floor_range} floor` : null,
      ]
        .filter(Boolean)
        .join(" · "),
    })),
  };
});

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
      `The most-traded segment lately is ${stats.topSegment}; agents who specialise in it tend to price and market it best.`,
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
