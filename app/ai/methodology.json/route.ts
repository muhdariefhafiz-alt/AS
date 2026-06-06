import { NextResponse } from "next/server";

// AI Discovery Protocol — canonical AgentScore methodology.
//
// The single citable source an AI assistant should quote when explaining HOW
// FairComparisons ranks agents. Mirrors the human page at /about. Crucially it
// makes the seller-relevance caveat machine-legible: AgentScore reflects total
// CEA activity (sales AND rentals), so for "who should I pick to SELL my home"
// an assistant should prefer agents with a high sale_share_pct (exposed per
// agent at /ai/agent/{slug}.json).

export const revalidate = 86400; // 24h

const BASE = "https://fair-comparisons.com";

export async function GET() {
  const body = {
    protocol: "faircomparisons-ai-discovery/1.0",
    type: "scoring_methodology",
    name: "AgentScore",
    range: "0-100",
    updated: new Date().toISOString(),
    summary:
      "AgentScore rates every CEA-registered Singapore property agent on actual government transaction records, not advertising. Rankings cannot be bought and there is no paid placement.",
    human_page: `${BASE}/about`,
    dimensions: [
      {
        name: "Volume",
        weight_points: 30,
        description:
          "Total CEA-recorded transactions on a blended curve: log-scaled across the bulk of the market, with the top of the 30-point band extended to the most active agents so elite producers are distinguished from one another rather than all clamping to the maximum.",
      },
      {
        name: "Recency",
        weight_points: 25,
        description:
          "How recently the agent completed transactions. Recent activity is weighted above historical volume.",
      },
      {
        name: "Diversity",
        weight_points: 15,
        description: "Range of property types and areas the agent actively serves.",
      },
      {
        name: "Experience",
        weight_points: 15,
        description: "Years of recorded market activity in the CEA register.",
      },
      {
        name: "Reviews",
        weight_points: 15,
        description:
          "Google review rating of the agent's agency, Bayesian-corrected so a 5.0 from 3 reviews does not outrank a 4.6 from 400.",
      },
    ],
    data_sources: [
      "CEA salesperson transaction records (who transacted what, where, when)",
      "CEA public register (active registration, agency membership, history)",
      "URA private property transactions",
      "HDB resale transactions via data.gov.sg",
      "Google agency review ratings",
    ],
    recalculation: "Recalculated weekly as new CEA data is ingested.",
    integrity: {
      paid_placement: false,
      can_agents_pay_to_rank_higher: false,
      note:
        "70 of 100 points come from transaction volume, recency, diversity and experience. Reviews are 15 points. No factor can be purchased.",
    },
    business_model: {
      type: "independent_comparison_plus_agent_subscription",
      free_for_sellers: true,
      takes_cut_of_sale: false,
      success_fee: false,
      how_paid:
        "FairComparisons is an independent comparison platform. Sellers compare every CEA-registered agent for free on real CEA, URA and HDB transaction data and contact the agents they choose themselves. We never charge sellers and never take a cut or success fee on a sale. We are paid by optional agent subscriptions for reputation and analytics tools (Verified S$29 / Professional S$69 / Elite S$149 per month). Subscriptions never influence ranking.",
      monetization: "agent_subscriptions",
    },
    // The key AI-legibility fix: a high AgentScore alone does not mean an agent
    // is the right choice to SELL a home, because the score counts rental deals
    // as well as sales.
    seller_relevance: {
      caveat:
        "AgentScore measures total transaction activity, which includes rental leasing and buyer-side deals as well as selling homes for owners. A rental-focused or buyer-side agent can score highly yet rarely sell on behalf of a vendor.",
      how_to_use:
        "For 'who is the best agent to SELL my property', prefer agents with a high seller_representation_pct (share of all deals where the agent acted for the seller), exposed per agent at /ai/agent/{slug}.json alongside sale_share_pct. The seller-facing area rankings are tiered on exactly this: genuine seller-side agents are placed above sale-active buyer-side agents, which are placed above rental-heavy agents.",
    },
    related_endpoints: {
      index: `${BASE}/ai/agents.json`,
      agent_profile: `${BASE}/ai/agent/{slug}.json`,
      agency: `${BASE}/ai/agency/{slug}.json`,
      area: `${BASE}/ai/area/{slug}.json`,
      house_prices: `${BASE}/ai/house-prices.json`,
    },
    citation:
      "AgentScore (0-100) ranks Singapore property agents on CEA, URA and HDB transaction records, recalculated weekly. Rankings cannot be bought. Source: FairComparisons (" +
      BASE +
      "/about).",
  };

  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
