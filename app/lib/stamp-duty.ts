// Singapore property stamp duty: pure, dependency-free calculation logic.
//
// Every rate below was verified against IRAS's own published tables and worked
// examples on the date in RATES_VERIFIED_ON. Sources:
//   BSD:  https://www.iras.gov.sg/taxes/stamp-duty/for-property/buying-or-acquiring-property/buyer's-stamp-duty-(bsd)
//   ABSD: https://www.iras.gov.sg/taxes/stamp-duty/for-property/buying-or-acquiring-property/additional-buyer's-stamp-duty-(absd)
//   SSD:  https://www.iras.gov.sg/taxes/stamp-duty/for-property/selling-or-disposing-property/seller's-stamp-duty-(ssd)-for-residential-property
//
// This file is the single source of truth for both the public calculator and
// the embeddable widget. Keep it side-effect free and deterministic (no Date.now,
// no Math.random) so it stays unit-verifiable against the IRAS examples.

export const RATES_VERIFIED_ON = "2026-07-12";
export const IRAS_BSD_URL =
  "https://www.iras.gov.sg/taxes/stamp-duty/for-property/buying-or-acquiring-property/buyer's-stamp-duty-(bsd)";
export const IRAS_ABSD_URL =
  "https://www.iras.gov.sg/taxes/stamp-duty/for-property/buying-or-acquiring-property/additional-buyer's-stamp-duty-(absd)";
export const IRAS_SSD_URL =
  "https://www.iras.gov.sg/taxes/stamp-duty/for-property/selling-or-disposing-property/seller's-stamp-duty-(ssd)-for-residential-property";

export type PropertyNature = "residential" | "non_residential";
export type BuyerProfile = "SC" | "SPR" | "FOREIGNER" | "ENTITY";
// Order the property being bought falls in the buyer's count: 1st, 2nd, 3rd or more.
export type PropertyOrder = 1 | 2 | 3;

// A single marginal band: [cumulative threshold, rate]. The rate applies only to
// the portion of the price that falls inside this band. Infinity closes the top.
type Band = [upTo: number, rate: number];

// BSD, on or after 15 Feb 2023.
const BSD_BANDS_RESIDENTIAL: Band[] = [
  [180_000, 0.01],
  [360_000, 0.02],
  [1_000_000, 0.03],
  [1_500_000, 0.04],
  [3_000_000, 0.05],
  [Infinity, 0.06],
];
const BSD_BANDS_NON_RESIDENTIAL: Band[] = [
  [180_000, 0.01],
  [360_000, 0.02],
  [1_000_000, 0.03],
  [1_500_000, 0.04],
  [Infinity, 0.05],
];

// A computed slice of a marginal band, for a transparent "show your working" view.
export type BsdRow = { band: string; rate: number; amount: number };

export function bsdBreakdown(price: number, nature: PropertyNature = "residential"): BsdRow[] {
  const bands = nature === "residential" ? BSD_BANDS_RESIDENTIAL : BSD_BANDS_NON_RESIDENTIAL;
  const rows: BsdRow[] = [];
  let prev = 0;
  for (const [upTo, rate] of bands) {
    if (price <= prev) break;
    const taxable = Math.min(price, upTo) - prev;
    rows.push({
      band: upTo === Infinity ? `Remaining (above ${sgd(prev)})` : `${sgd(prev)} to ${sgd(upTo)}`,
      rate,
      amount: taxable * rate,
    });
    prev = upTo;
  }
  return rows;
}

// Buyer's Stamp Duty. IRAS rounds BSD down to the nearest dollar, minimum $1.
export function computeBSD(price: number, nature: PropertyNature = "residential"): number {
  if (!(price > 0)) return 0;
  const gross = bsdBreakdown(price, nature).reduce((sum, r) => sum + r.amount, 0);
  return Math.max(1, Math.floor(gross));
}

// ABSD rate (fraction) for a buyer profile and property order, on or after 27 Apr 2023.
// ABSD applies to residential property only. Foreigners pay a flat rate on any
// residential purchase; entities (and trustees, treated as entities) pay 65%.
export function absdRate(profile: BuyerProfile, order: PropertyOrder): number {
  switch (profile) {
    case "SC":
      return order === 1 ? 0 : order === 2 ? 0.2 : 0.3;
    case "SPR":
      return order === 1 ? 0.05 : order === 2 ? 0.3 : 0.35;
    case "FOREIGNER":
      return 0.6;
    case "ENTITY":
      return 0.65;
  }
}

// Additional Buyer's Stamp Duty. Rounded down to the nearest dollar.
export function computeABSD(price: number, profile: BuyerProfile, order: PropertyOrder): number {
  if (!(price > 0)) return 0;
  return Math.floor(price * absdRate(profile, order));
}

// ---- Seller's Stamp Duty (residential) ----------------------------------
// SSD is a flat rate on the higher of price or market value, by holding period.
// Two schedules are still live: purchases on/after 4 Jul 2025 (4-year window),
// and 11 Mar 2017 to 3 Jul 2025 (3-year window). Earlier schedules have fully
// lapsed (their longest holding window ended before today) so are omitted.
const SSD_FROM_2025_07_04 = "2025-07-04";
const SSD_FROM_2017_03_11 = "2017-03-11";

// Tier boundaries: [max holding years for this tier, rate]. Last real tier, then 0.
const SSD_SCHEDULE_CURRENT: Band[] = [
  [1, 0.16],
  [2, 0.12],
  [3, 0.08],
  [4, 0.04],
];
const SSD_SCHEDULE_2017: Band[] = [
  [1, 0.12],
  [2, 0.08],
  [3, 0.04],
];

export type SsdSchedule = "current" | "2017" | "none";

// Which SSD schedule applies to a purchase made on isoPurchaseDate (YYYY-MM-DD).
// ISO date strings compare correctly with lexicographic <, so no Date needed.
export function ssdScheduleFor(isoPurchaseDate: string): SsdSchedule {
  if (!isoPurchaseDate) return "none";
  if (isoPurchaseDate >= SSD_FROM_2025_07_04) return "current";
  if (isoPurchaseDate >= SSD_FROM_2017_03_11) return "2017";
  return "none"; // pre-11 Mar 2017 purchases can no longer be within any live window
}

// Whole-year anniversary comparison: has `sale` passed the n-year mark after
// `purchase`? Uses explicit date parts (deterministic; never argless Date()).
function exceedsYears(purchase: string, sale: string, years: number): boolean {
  const [py, pm, pd] = purchase.split("-").map(Number);
  const [sy, sm, sd] = sale.split("-").map(Number);
  if (!py || !sy) return false;
  // The n-year anniversary date, as a comparable number YYYYMMDD.
  const anniv = (py + years) * 10000 + pm * 100 + pd;
  const saleNum = sy * 10000 + sm * 100 + sd;
  // "Up to n years" is inclusive of the anniversary date itself.
  return saleNum > anniv;
}

export type SsdResult = {
  schedule: SsdSchedule;
  tierLabel: string; // e.g. "More than 1 year and up to 2 years"
  rate: number; // fraction, 0 if outside all tiers
  duty: number; // dollars, floored
  liable: boolean;
};

// Compute SSD for a residential sale. Returns rate 0 / not liable when the
// property has been held beyond the schedule's window, or the purchase predates
// any live schedule.
export function computeSSD(price: number, isoPurchaseDate: string, isoSaleDate: string): SsdResult {
  const schedule = ssdScheduleFor(isoPurchaseDate);
  const tiers = schedule === "current" ? SSD_SCHEDULE_CURRENT : schedule === "2017" ? SSD_SCHEDULE_2017 : [];
  if (!schedule || tiers.length === 0 || !isoSaleDate || !(price > 0)) {
    return { schedule, tierLabel: "No SSD payable", rate: 0, duty: 0, liable: false };
  }
  for (let i = 0; i < tiers.length; i++) {
    const [maxYears, rate] = tiers[i];
    if (!exceedsYears(isoPurchaseDate, isoSaleDate, maxYears)) {
      const lower = i === 0 ? "Up to 1 year" : `More than ${i} year${i > 1 ? "s" : ""} and up to ${maxYears} years`;
      return { schedule, tierLabel: lower, rate, duty: Math.floor(price * rate), liable: rate > 0 };
    }
  }
  const heldYears = tiers.length; // held beyond the last tier
  return { schedule, tierLabel: `More than ${heldYears} years`, rate: 0, duty: 0, liable: false };
}

// Full SSD tier table for a schedule, for the "show the whole schedule" view.
export function ssdTable(schedule: SsdSchedule): { label: string; rate: number }[] {
  const tiers = schedule === "current" ? SSD_SCHEDULE_CURRENT : schedule === "2017" ? SSD_SCHEDULE_2017 : [];
  const rows = tiers.map(([maxYears, rate], i) => ({
    label: i === 0 ? "Up to 1 year" : `More than ${i} year${i > 1 ? "s" : ""} and up to ${maxYears} years`,
    rate,
  }));
  if (rows.length) rows.push({ label: `More than ${tiers.length} years`, rate: 0 });
  return rows;
}

export function sgd(n: number): string {
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency: "SGD",
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}
