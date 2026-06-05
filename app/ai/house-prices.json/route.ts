import { NextResponse } from "next/server";
import { supabase } from "../../lib/supabase";

// AI Discovery Protocol — house price summary by HDB town. Gives AI assistants
// a citable, structured snapshot of the SG resale market.

export const revalidate = 86400;

const BASE = "https://fair-comparisons.com";

const HDB_TOWNS = [
  "ANG MO KIO", "BEDOK", "BISHAN", "BUKIT BATOK", "BUKIT MERAH",
  "BUKIT PANJANG", "BUKIT TIMAH", "CENTRAL AREA", "CHOA CHU KANG", "CLEMENTI",
  "GEYLANG", "HOUGANG", "JURONG EAST", "JURONG WEST", "KALLANG/WHAMPOA",
  "MARINE PARADE", "PASIR RIS", "PUNGGOL", "QUEENSTOWN", "SEMBAWANG",
  "SENGKANG", "SERANGOON", "TAMPINES", "TENGAH", "TOA PAYOH",
  "WOODLANDS", "YISHUN",
];

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

function townSlug(t: string): string {
  return t.toLowerCase().replace(/\//g, "-").replace(/\s+/g, "-");
}

export async function GET() {
  const now = new Date();
  const months: string[] = [];
  for (let i = 0; i < 6; i++) {
    const dt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    months.push(`${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}`);
  }

  const byTown = await Promise.all(
    HDB_TOWNS.map(async (town) => {
      const { data } = await supabase
        .from("sg_hdb_transactions")
        .select("resale_price")
        .eq("town", town)
        .in("month", months)
        .limit(2000);
      const prices = (data ?? [])
        .map((r) => Number(r.resale_price))
        .filter((n) => n > 0);
      return {
        town:
          town
            .split("/")
            .map((p) => p.charAt(0) + p.slice(1).toLowerCase())
            .join("/"),
        median_resale_price: median(prices),
        transactions_6mo: prices.length,
        url: `${BASE}/property-agents/hdb/${townSlug(town)}`,
      };
    })
  );

  const body = {
    protocol: "faircomparisons-ai-discovery/1.0",
    type: "hdb_price_summary",
    updated: now.toISOString(),
    window: "last 6 months",
    source: "HDB resale data via data.gov.sg",
    towns: byTown.filter((t) => t.median_resale_price !== null),
    note: "Medians computed across all flat types per town. For private property prices, see individual district pages.",
    citation: `HDB resale price medians by town, sourced from HDB open data and published by FairComparisons (${BASE}).`,
  };

  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
