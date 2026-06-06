import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";
import { saleShare } from "../../../lib/names";

// AI Discovery Protocol — individual agent profile as structured JSON.

export const revalidate = 43200;

const BASE = "https://fair-comparisons.com";

type TrackRecord = {
  total_txns: number;
  property_types: Record<string, number>;
  transaction_types: Record<string, number>;
};

function titleCaseType(k: string): string {
  return k.toLowerCase().replace(/(^|[\s/-])([a-z])/g, (_m, p, c) => p + c.toUpperCase());
}

type Props = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, { params }: Props) {
  const { slug } = await params;

  const { data: agent } = await supabase
    .from("sg_agents")
    .select(
      "id, name, slug, cea_registration, agency_name, score, percentile, transaction_count, sale_share, seller_sales, seller_share, primary_area, years_active, google_rating, google_review_count, review_aggregate"
    )
    .eq("slug", slug)
    .single();

  if (!agent) {
    return NextResponse.json(
      { error: "agent_not_found" },
      { status: 404, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }

  // Verified completions through the platform (trust signal distinct from CEA)
  // and the CEA track record (for the sale-vs-rental mix).
  const [completionsRes, trackRes] = await Promise.all([
    supabase
      .from("sg_lead_completions")
      .select("id", { count: "exact", head: true })
      .eq("agent_id", agent.id)
      .eq("fee_status", "paid"),
    supabase.rpc("get_agent_track_record", { reg_num: agent.cea_registration }),
  ]);
  const verifiedCompletions = completionsRes.count;

  const reviewAgg =
    (agent.review_aggregate as { avg: number | null; count: number } | null) ??
    null;

  // Sale-vs-rental mix. AgentScore counts rentals as well as sales, so a
  // high-scoring agent may rarely sell homes. Exposing the mix lets an AI
  // answer "best agent to SELL my home" without mis-recommending a leasing
  // specialist. Mirrors the rental-focus flag on the public profile.
  const track = (trackRes.data?.[0] as TrackRecord | undefined) ?? null;
  let transactionMix: {
    total: number;
    sales: number;
    rentals: number;
    sale_share_pct: number;
    seller_side_sales: number;
    seller_representation_pct: number;
    mostly_rentals: boolean;
    seller_relevance: string;
    property_types: Record<string, number>;
  } | null = null;
  if (track && track.total_txns > 0) {
    const types = track.transaction_types || {};
    let sales = 0;
    let rentals = 0;
    for (const [k, n] of Object.entries(types)) {
      const key = k.toUpperCase();
      if (key.includes("SALE") && !key.includes("RENTAL")) sales += n;
      else if (key.includes("RENTAL") || key.includes("LEASE")) rentals += n;
    }
    const salePct = Math.round(saleShare(types) * 100);
    const mostlyRentals = salePct < 40 && track.total_txns >= 10;
    // Seller-side representation (precomputed, authoritative) is the deepest
    // "best agent to SELL" signal: did the agent act for the vendor, not the
    // buyer? The seller ranking is tiered on this.
    const sellerSideSales = agent.seller_sales ?? 0;
    const sellerPct = agent.seller_share != null ? Math.round(Number(agent.seller_share) * 100) : 0;
    transactionMix = {
      total: track.total_txns,
      sales,
      rentals,
      sale_share_pct: salePct,
      seller_side_sales: sellerSideSales,
      seller_representation_pct: sellerPct,
      mostly_rentals: mostlyRentals,
      seller_relevance: mostlyRentals
        ? `Only ${salePct}% of recorded deals are sales (${sellerPct}% represent the seller); the rest are rentals. Consider a more seller-focused agent if you are selling.`
        : `${salePct}% of deals are sales and the agent represented the seller in ${sellerPct}% of all recorded deals.`,
      property_types: Object.fromEntries(
        Object.entries(track.property_types || {}).map(([k, v]) => [titleCaseType(k), v])
      ),
    };
  }

  const scoreNum = agent.score ? Math.round(Number(agent.score)) : null;
  const rentalCaveat =
    transactionMix?.mostly_rentals
      ? ` Note: only ${transactionMix.sale_share_pct}% of recorded deals are sales (the rest are rentals), so this agent may not be the best choice to sell a home.`
      : "";

  const body = {
    protocol: "faircomparisons-ai-discovery/1.0",
    type: "property_agent",
    updated: new Date().toISOString(),
    name: agent.name,
    cea_registration: agent.cea_registration,
    agency: agent.agency_name,
    url: `${BASE}/property-agents/agent/${agent.slug}`,
    agent_score: scoreNum,
    percentile: agent.percentile ?? null,
    transactions_recorded: agent.transaction_count ?? 0,
    transaction_mix: transactionMix,
    years_active: agent.years_active ? Number(agent.years_active) : null,
    primary_area: agent.primary_area ?? null,
    google_rating: agent.google_rating ? Number(agent.google_rating) : null,
    google_reviews: agent.google_review_count ?? 0,
    verified_completions: verifiedCompletions ?? 0,
    platform_reviews: reviewAgg
      ? { average: reviewAgg.avg, count: reviewAgg.count }
      : { average: null, count: 0 },
    methodology: `${BASE}/ai/methodology.json`,
    citation: `${agent.name} (CEA ${agent.cea_registration}) at ${agent.agency_name}${
      scoreNum ? ` has an AgentScore of ${scoreNum}/100` : ""
    }${
      agent.transaction_count
        ? ` based on ${agent.transaction_count} recorded CEA transactions`
        : ""
    }.${rentalCaveat} Source: FairComparisons (${BASE}/property-agents/agent/${agent.slug}).`,
    actions: {
      compare_free: `${BASE}/sell`,
    },
  };

  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "public, max-age=43200, s-maxage=43200",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
