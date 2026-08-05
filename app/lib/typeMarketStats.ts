// Reader for the sg_type_market_stats snapshot (see
// supabase/migrations/20260805000001_type_market_stats.sql). Per property
// type: 12-month deal volume split sales vs rentals, active-agent counts,
// top-5 concentration, and the 30 most active agents, all precomputed from
// sg_agent_transactions so nothing heavy ever runs on the request path.
//
// Server/build-only: the table is RLS-locked with no anon policy, so reads
// MUST go through the service-role client. Never import from client code.

import { cache } from "react";
import { supabaseAdmin } from "./supabase";

export type TypeTopAgent = {
  slug: string;
  display_name: string;
  agency_name: string;
  score: number | null;
  claimed: boolean;
  sales_12mo: number;
  rentals_12mo: number;
  last_txn: string; // 'Mon YYYY'
};

export type TypeMarketStats = {
  type_slug: string;
  property_types: string[];
  rental_only: boolean;
  ranking_basis: "sales" | "rentals";
  sales_12mo: number;
  rentals_12mo: number;
  active_agents_12mo: number;
  active_sale_agents_12mo: number;
  active_rental_agents_12mo: number;
  top5_share_pct: number | null;
  top_agents: TypeTopAgent[];
  window_start: string; // 'YYYY-MM-DD' (first month of the 12-month window)
  window_end: string;   // 'YYYY-MM-DD' (last month of the 12-month window)
  windowLabel: string;  // 'Jul 2025 to Jun 2026' - print next to every figure
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// 'YYYY-MM-DD' -> 'Mon YYYY' without Date/locale ambiguity.
export function monthLabel(isoDate: string): string {
  const m = /^(\d{4})-(\d{2})/.exec(isoDate ?? "");
  if (!m) return isoDate ?? "";
  const idx = Number(m[2]) - 1;
  return idx >= 0 && idx < 12 ? `${MONTHS[idx]} ${m[1]}` : isoDate;
}

// cache(): generateMetadata and the page body share one fetch per render.
export const getTypeMarketStats = cache(async (slug: string): Promise<TypeMarketStats | null> => {
  const { data, error } = await supabaseAdmin()
    .from("sg_type_market_stats")
    .select("*")
    .eq("type_slug", slug)
    .maybeSingle();
  if (error || !data) return null;
  const top5 = data.top5_share_pct === null ? null : Number(data.top5_share_pct);
  return {
    type_slug: String(data.type_slug),
    property_types: (data.property_types ?? []) as string[],
    rental_only: Boolean(data.rental_only),
    ranking_basis: data.ranking_basis === "rentals" ? "rentals" : "sales",
    sales_12mo: Number(data.sales_12mo ?? 0),
    rentals_12mo: Number(data.rentals_12mo ?? 0),
    active_agents_12mo: Number(data.active_agents_12mo ?? 0),
    active_sale_agents_12mo: Number(data.active_sale_agents_12mo ?? 0),
    active_rental_agents_12mo: Number(data.active_rental_agents_12mo ?? 0),
    top5_share_pct: Number.isFinite(top5 as number) ? top5 : null,
    top_agents: ((data.top_agents ?? []) as TypeTopAgent[]).map((a) => ({
      slug: String(a.slug ?? ""),
      display_name: String(a.display_name ?? ""),
      agency_name: String(a.agency_name ?? ""),
      score: a.score === null || a.score === undefined ? null : Number(a.score),
      claimed: Boolean(a.claimed),
      sales_12mo: Number(a.sales_12mo ?? 0),
      rentals_12mo: Number(a.rentals_12mo ?? 0),
      last_txn: String(a.last_txn ?? ""),
    })),
    window_start: String(data.window_start),
    window_end: String(data.window_end),
    windowLabel: `${monthLabel(String(data.window_start))} to ${monthLabel(String(data.window_end))}`,
  };
});
