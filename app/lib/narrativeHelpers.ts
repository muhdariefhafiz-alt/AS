/**
 * Narrative helpers for data-driven content generation.
 * No template strings with swapped variables. Instead, conditional logic
 * builds unique sentences from data shape.
 */

// --- Price formatting ---

export function formatPrice(n: number | null | undefined): string {
  if (!n) return "N/A";
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return m % 1 === 0 ? `S$${m}M` : `S$${m.toFixed(1)}M`;
  }
  if (n >= 1_000) return `S$${Math.round(n / 1_000).toLocaleString()}K`;
  return `S$${n.toLocaleString()}`;
}

export function formatPriceFull(n: number | null | undefined): string {
  if (!n) return "N/A";
  return `S$${Math.round(n).toLocaleString()}`;
}

export function formatPsf(n: number | null | undefined): string {
  if (!n) return "N/A";
  return `S$${Number(n).toFixed(2)} psf`;
}

// --- Price position relative to Singapore average ---

const SG_MEDIAN_CONDO = 1_720_000; // Derived from our URA data across all districts

export type PricePosition = "ultra-premium" | "premium" | "above-average" | "mid-range" | "accessible" | "budget";

export function pricePosition(districtMedian: number): PricePosition {
  const ratio = districtMedian / SG_MEDIAN_CONDO;
  if (ratio > 1.8) return "ultra-premium";
  if (ratio > 1.3) return "premium";
  if (ratio > 1.05) return "above-average";
  if (ratio > 0.85) return "mid-range";
  if (ratio > 0.65) return "accessible";
  return "budget";
}

export function pricePositionPhrase(pos: PricePosition, areaName: string): string {
  switch (pos) {
    case "ultra-premium":
      return `${areaName} sits at the top of Singapore's residential market`;
    case "premium":
      return `${areaName} is one of Singapore's established prime residential areas`;
    case "above-average":
      return `${areaName} commands prices above the Singapore-wide average`;
    case "mid-range":
      return `${areaName} sits in the middle of Singapore's residential price spectrum`;
    case "accessible":
      return `${areaName} offers more accessible private property compared to the city-wide average`;
    case "budget":
      return `${areaName} represents one of the more affordable private property districts`;
  }
}

// --- Transaction volume insight ---

export function transactionInsight(count: number): string {
  if (count > 8_000) return "one of the most actively traded districts in Singapore";
  if (count > 5_000) return "a highly active market with strong transaction volume";
  if (count > 3_000) return "a moderately active district with steady deal flow";
  if (count > 1_500) return "a market with consistent but measured transaction activity";
  if (count > 500) return "a smaller market with selective buyer activity";
  return "a niche market with limited but notable transactions";
}

// --- Price change narrative ---

export function priceVsSgAverage(districtMedian: number): string {
  const diff = ((districtMedian - SG_MEDIAN_CONDO) / SG_MEDIAN_CONDO) * 100;
  const absDiff = Math.abs(Math.round(diff));
  if (diff > 5) return `${absDiff}% above the Singapore-wide median`;
  if (diff < -5) return `${absDiff}% below the Singapore-wide median`;
  return "roughly in line with the Singapore-wide median";
}

// --- Rental yield narrative ---

export function rentalYieldInsight(avgRentPsf: number): string {
  if (avgRentPsf > 7) return "among the highest rental rates in Singapore, reflecting strong tenant demand for prime locations";
  if (avgRentPsf > 5.5) return "above-average rental rates, indicating solid demand from both local and expatriate tenants";
  if (avgRentPsf > 4.5) return "moderate rental rates, balancing affordability with reasonable landlord returns";
  if (avgRentPsf > 3.5) return "relatively affordable rental rates, making it accessible for tenants on a tighter budget";
  return "among the lower rental rates in Singapore, typical of suburban or developing areas";
}

// --- Property type narrative ---

export function propertyMixInsight(
  types: Array<{ type: string; count: number; median: number }>
): string {
  if (types.length === 0) return "";
  const total = types.reduce((s, t) => s + t.count, 0);
  const dominant = types[0];
  const dominantShare = Math.round((dominant.count / total) * 100);

  if (types.length === 1) {
    return `The market is entirely composed of ${dominant.type.toLowerCase()} units.`;
  }

  const parts: string[] = [];
  if (dominantShare > 70) {
    parts.push(`${dominant.type}s dominate at ${dominantShare}% of transactions`);
  } else if (dominantShare > 50) {
    parts.push(`${dominant.type}s make up the majority at ${dominantShare}% of transactions`);
  } else {
    parts.push(`${dominant.type}s account for ${dominantShare}% of transactions`);
  }

  if (types.length >= 2) {
    const second = types[1];
    const secondShare = Math.round((second.count / total) * 100);
    parts.push(`followed by ${second.type.toLowerCase()}s at ${secondShare}%`);
  }

  if (types.some((t) => t.type === "Terrace" || t.type === "Semi-detached" || t.type === "Detached")) {
    const landed = types.filter(
      (t) => t.type === "Terrace" || t.type === "Semi-detached" || t.type === "Detached"
    );
    const landedCount = landed.reduce((s, t) => s + t.count, 0);
    if (landedCount > 50) {
      parts.push(`with a notable landed property segment of ${Math.round((landedCount / total) * 100)}% of deals`);
    }
  }

  return parts.join(", ") + ".";
}

// --- Humanizer: banned word check ---

const BANNED_WORDS = [
  "delve", "crucial", "vital", "pivotal", "leverage", "furthermore",
  "moreover", "in addition", "navigate", "robust", "comprehensive",
  "holistic", "foster", "facilitate", "ensure", "it's worth noting",
  "it's important to note", "needless to say",
];

export function containsBannedWords(text: string): string[] {
  const lower = text.toLowerCase();
  return BANNED_WORDS.filter((w) => lower.includes(w));
}
